// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FhevmTest} from "forge-fhevm/FhevmTest.sol";
import {CreditScoreEngine} from "../src/CreditScoreEngine.sol";
import {euint64, externalEuint64} from "encrypted-types/EncryptedTypes.sol";
import {InputProofHelper} from "forge-fhevm/InputProofHelper.sol";
import {CleartextArithmetic} from "forge-fhevm/cleartext/CleartextArithmetic.sol";
import {FheType} from "@fhevm/host-contracts/contracts/shared/FheType.sol";
import {aclAdd, inputVerifierAdd} from "@fhevm/host-contracts/addresses/FHEVMHostAddresses.sol";
contract CreditScoreEngineTest is FhevmTest {
    CreditScoreEngine engine;
    address engineAddress;

    uint256 internal constant ALICE_PK  = 0xA11CE; // borrower
    uint256 internal constant BOB_PK    = 0xB0B;   // lender
    uint256 internal constant CAROL_PK  = 0xCA401; // unauthorised lender

    address alice;
    address bob;
    address carol;

    function setUp() public override {
        super.setUp();
        engine        = new CreditScoreEngine();
        engineAddress = address(engine);
        alice = vm.addr(ALICE_PK);
        bob   = vm.addr(BOB_PK);
        carol = vm.addr(CAROL_PK);
    }



    uint256 private _myNonce;

    function encrypt4Uint64(
        uint64 v1, uint64 v2, uint64 v3, uint64 v4,
        address user, address target
    ) internal returns (externalEuint64 e1, externalEuint64 e2, externalEuint64 e3, externalEuint64 e4, bytes memory inputProof) {
        bytes32[] memory handles = new bytes32[](4);
        uint64[4] memory values = [v1, v2, v3, v4];
        
        for(uint256 i = 0; i < 4; i++) {
            _myNonce += 1;
            bytes memory ciphertext = abi.encodePacked(keccak256(abi.encodePacked(uint256(values[i]), uint8(FheType.Uint64), _myNonce)));
            bytes32 handle = InputProofHelper.computeInputHandle(ciphertext, uint8(i), FheType.Uint64, aclAdd, uint64(block.chainid));
            _plaintexts[handle] = CleartextArithmetic.normalizePlaintextToType(uint256(values[i]), uint8(FheType.Uint64));
            handles[i] = handle;
        }

        bytes32 domainSeparator = InputProofHelper.computeInputVerifierDomainSeparator(inputVerifierAdd, block.chainid);
        bytes32 digest = InputProofHelper.computeInputVerificationDigest(
            handles, user, target, block.chainid, EMPTY_EXTRA_DATA, domainSeparator
        );

        bytes[] memory signatures = new bytes[](1);
        signatures[0] = _signDigest(MOCK_INPUT_SIGNER_PK, digest);
        inputProof = InputProofHelper.assembleInputProof(handles, signatures, EMPTY_EXTRA_DATA);

        e1 = externalEuint64.wrap(handles[0]);
        e2 = externalEuint64.wrap(handles[1]);
        e3 = externalEuint64.wrap(handles[2]);
        e4 = externalEuint64.wrap(handles[3]);
    }

    // ------------------------------------------------------------------
    // Helper: Alice submits factors
    // ------------------------------------------------------------------
    function _aliceSubmits(
        uint64 ph,
        uint64 dti,
        uint64 ca,
        uint64 util
    ) internal {
        (externalEuint64 ePh, externalEuint64 eDti, externalEuint64 eCa, externalEuint64 eUtil, bytes memory proof) = encrypt4Uint64(ph, dti, ca, util, alice, engineAddress);

        vm.prank(alice);
        engine.submitFactors(ePh, eDti, eCa, eUtil, proof);
    }

    // ------------------------------------------------------------------
    // Tests
    // ------------------------------------------------------------------

    function test_hasNotSubmittedBeforeFirstCall() public view {
        assertFalse(engine.hasSubmitted(alice));
    }

    function test_submitFactorsSetsSubmittedFlag() public {
        _aliceSubmits(80, 30, 60, 20);
        assertTrue(engine.hasSubmitted(alice));
        assertTrue(engine.hasScore(alice));
    }

    function test_scoreIsComputedAndDecryptable() public {
        uint64 ph   = 80;
        uint64 dti  = 30;
        uint64 ca   = 60;
        uint64 util = 20;

        _aliceSubmits(ph, dti, ca, util);

        vm.prank(alice);
        euint64 encScore = engine.getMyScore();

        bytes memory sig = signUserDecrypt(ALICE_PK, engineAddress);
        uint256 clearScore = userDecrypt(euint64.unwrap(encScore), alice, engineAddress, sig);

        // Expected: ph*40 + (100-dti)*30 + ca*15 + (100-util)*15
        uint256 expected = uint256(ph) * 40
            + uint256(100 - dti)  * 30
            + uint256(ca)         * 15
            + uint256(100 - util) * 15;

        assertEq(clearScore, expected, "Score mismatch");
    }

    function test_unauthorisedLenderCannotRequestScore() public {
        _aliceSubmits(80, 30, 60, 20);

        vm.prank(carol);
        vm.expectRevert(
            abi.encodeWithSelector(CreditScoreEngine.NotAuthorized.selector, carol, alice)
        );
        engine.requestScore(alice);
    }

    function test_authorisedLenderCanRequestAndDecryptScore() public {
        _aliceSubmits(80, 30, 60, 20);

        // Alice authorises Bob.
        vm.prank(alice);
        engine.authorizeLender(bob);

        assertTrue(engine.isLenderAuthorized(alice, bob));

        // Bob fetches the encrypted score handle.
        vm.prank(bob);
        euint64 encScore = engine.requestScore(alice);

        // Bob decrypts via KMS (simulated by forge-fhevm signUserDecrypt).
        bytes memory sig = signUserDecrypt(BOB_PK, engineAddress);
        uint256 clearScore = userDecrypt(euint64.unwrap(encScore), bob, engineAddress, sig);

        uint256 expected = 80 * 40 + 70 * 30 + 60 * 15 + 80 * 15; // 3200+2100+900+1200 = 7400
        assertEq(clearScore, expected, "Lender score mismatch");
    }

    function test_revokeLenderBlocksAccess() public {
        _aliceSubmits(80, 30, 60, 20);

        vm.prank(alice);
        engine.authorizeLender(bob);

        vm.prank(alice);
        engine.revokeLender(bob);

        assertFalse(engine.isLenderAuthorized(alice, bob));

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(CreditScoreEngine.NotAuthorized.selector, bob, alice)
        );
        engine.requestScore(alice);
    }

    function test_borrowerCanResubmitFactors() public {
        _aliceSubmits(80, 30, 60, 20);
        _aliceSubmits(90, 20, 70, 10); // better credit profile

        vm.prank(alice);
        euint64 encScore = engine.getMyScore();
        bytes memory sig = signUserDecrypt(ALICE_PK, engineAddress);
        uint256 clearScore = userDecrypt(euint64.unwrap(encScore), alice, engineAddress, sig);

        uint256 expected = 90 * 40 + 80 * 30 + 70 * 15 + 90 * 15;
        assertEq(clearScore, expected);
    }
}
