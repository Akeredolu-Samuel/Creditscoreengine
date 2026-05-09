// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CreditScoreEngine
/// @author Zama Developer Program – Builder Track 2026
/// @notice FHE-powered credit bureau: borrowers prove creditworthiness without
///         revealing raw financial data. Lenders receive only the encrypted
///         final score and can decrypt it via the Zama KMS after the borrower
///         grants authorization.
///
/// Score formula (result in 0-10 000 range, scaled ×100 for precision):
///   score = paymentHistory×40 + (100−dti)×30 + creditAge×15 + (100−utilization)×15
///
/// All arithmetic is performed under FHE — no factor is ever decrypted on-chain.
contract CreditScoreEngine is ZamaEthereumConfig {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    /// @dev All four factors live inside an encrypted struct per borrower.
    struct CreditFactors {
        euint64 paymentHistory; // 0-100  higher = better
        euint64 dti;            // 0-100  lower  = better (debt-to-income ratio)
        euint64 creditAge;      // 0-100  higher = better
        euint64 utilization;    // 0-100  lower  = better (credit utilization)
        bool submitted;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @dev Encrypted factors per borrower address.
    mapping(address => CreditFactors) private _factors;

    /// @dev Encrypted composite score per borrower (computed on submission).
    mapping(address => euint64) private _scores;

    /// @dev Tracks whether a score has been computed for a borrower.
    mapping(address => bool) private _scoreComputed;

    /// @dev borrower → lender → authorized flag.
    mapping(address => mapping(address => bool)) private _lenderAuthorizations;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event FactorsSubmitted(address indexed borrower);
    event LenderAuthorized(address indexed borrower, address indexed lender);
    event LenderRevoked(address indexed borrower, address indexed lender);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error FactorsNotSubmitted(address borrower);
    error ScoreNotComputed(address borrower);
    error NotAuthorized(address lender, address borrower);

    // -------------------------------------------------------------------------
    // External functions – Borrower
    // -------------------------------------------------------------------------

    /// @notice Submit (or update) encrypted credit factors.
    /// @dev All four handles are encrypted together so they share one inputProof.
    ///      Factors assumed to be in [0, 100]; no range check to keep gas low in demo.
    /// @param paymentHistory  Encrypted payment-history score (0-100).
    /// @param dti             Encrypted debt-to-income ratio (0-100, lower = better).
    /// @param creditAge       Encrypted credit-age score (0-100).
    /// @param utilization     Encrypted credit-utilization rate (0-100, lower = better).
    /// @param inputProof      Single ZK proof covering all four handles.
    function submitFactors(
        externalEuint64 paymentHistory,
        externalEuint64 dti,
        externalEuint64 creditAge,
        externalEuint64 utilization,
        bytes calldata inputProof
    ) external {
        CreditFactors storage f = _factors[msg.sender];

        f.paymentHistory = FHE.fromExternal(paymentHistory, inputProof);
        f.dti            = FHE.fromExternal(dti,            inputProof);
        f.creditAge      = FHE.fromExternal(creditAge,      inputProof);
        f.utilization    = FHE.fromExternal(utilization,    inputProof);
        f.submitted      = true;

        // Grant the contract and the borrower ACL access to raw factors.
        FHE.allowThis(f.paymentHistory);
        FHE.allowThis(f.dti);
        FHE.allowThis(f.creditAge);
        FHE.allowThis(f.utilization);

        FHE.allow(f.paymentHistory, msg.sender);
        FHE.allow(f.dti,            msg.sender);
        FHE.allow(f.creditAge,      msg.sender);
        FHE.allow(f.utilization,    msg.sender);

        _computeScore(msg.sender);

        emit FactorsSubmitted(msg.sender);
    }

    /// @notice Authorize a specific lender to decrypt the borrower's final score.
    /// @dev Calls FHE.allow so the lender's KMS decrypt will succeed.
    function authorizeLender(address lender) external {
        if (!_factors[msg.sender].submitted) revert FactorsNotSubmitted(msg.sender);
        if (!_scoreComputed[msg.sender])     revert ScoreNotComputed(msg.sender);

        _lenderAuthorizations[msg.sender][lender] = true;
        FHE.allow(_scores[msg.sender], lender);

        emit LenderAuthorized(msg.sender, lender);
    }

    /// @notice Revoke a lender's ability to request the score handle.
    /// @dev ACL access cannot be revoked retroactively, but the mapping gate
    ///      prevents the lender from fetching the handle again.
    function revokeLender(address lender) external {
        _lenderAuthorizations[msg.sender][lender] = false;
        emit LenderRevoked(msg.sender, lender);
    }

    /// @notice Returns the borrower's own encrypted score handle for self-decryption.
    function getMyScore() external view returns (euint64) {
        if (!_scoreComputed[msg.sender]) revert ScoreNotComputed(msg.sender);
        return _scores[msg.sender];
    }

    // -------------------------------------------------------------------------
    // External functions – Lender
    // -------------------------------------------------------------------------

    /// @notice Lender fetches the encrypted score handle for a borrower they are
    ///         authorized for. Off-chain, the lender decrypts via the Zama KMS.
    function requestScore(address borrower) external view returns (euint64) {
        if (!_factors[borrower].submitted) revert FactorsNotSubmitted(borrower);
        if (!_scoreComputed[borrower])     revert ScoreNotComputed(borrower);
        if (!_lenderAuthorizations[borrower][msg.sender]) revert NotAuthorized(msg.sender, borrower);
        return _scores[borrower];
    }

    /// @notice Returns an encrypted boolean: does the borrower's score ≥ threshold?
    /// @dev Lets a lender verify a minimum credit bar without learning the exact score.
    function meetsThreshold(address borrower, uint64 threshold) external returns (ebool) {
        if (!_lenderAuthorizations[borrower][msg.sender]) revert NotAuthorized(msg.sender, borrower);
        euint64 thresh = FHE.asEuint64(threshold);
        return FHE.ge(_scores[borrower], thresh);
    }

    // -------------------------------------------------------------------------
    // External functions – View helpers
    // -------------------------------------------------------------------------

    function hasSubmitted(address borrower) external view returns (bool) {
        return _factors[borrower].submitted;
    }

    function hasScore(address borrower) external view returns (bool) {
        return _scoreComputed[borrower];
    }

    function isLenderAuthorized(address borrower, address lender) external view returns (bool) {
        return _lenderAuthorizations[borrower][lender];
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /// @dev Computes the weighted credit score entirely under FHE.
    ///      score = ph×40 + (100−dti)×30 + ca×15 + (100−util)×15  ∈ [0, 10 000]
    function _computeScore(address borrower) internal {
        CreditFactors storage f = _factors[borrower];

        // Invert the "lower-is-better" factors so every component is higher=better.
        euint64 hundred      = FHE.asEuint64(100);
        euint64 invertedDti  = FHE.sub(hundred, f.dti);
        euint64 invertedUtil = FHE.sub(hundred, f.utilization);

        // Weighted components — multiply by plaintext-encrypted constants.
        euint64 phScore   = FHE.mul(f.paymentHistory, FHE.asEuint64(40));
        euint64 dtiScore  = FHE.mul(invertedDti,      FHE.asEuint64(30));
        euint64 caScore   = FHE.mul(f.creditAge,      FHE.asEuint64(15));
        euint64 utilScore = FHE.mul(invertedUtil,     FHE.asEuint64(15));

        // Aggregate — two FHE.add calls to keep stack depth reasonable.
        euint64 score = FHE.add(
            FHE.add(phScore, dtiScore),
            FHE.add(caScore, utilScore)
        );

        _scores[borrower]       = score;
        _scoreComputed[borrower] = true;

        // ACL: contract must be allowed to re-read the score (e.g. in meetsThreshold).
        FHE.allowThis(score);
        // Borrower gets self-decrypt access immediately.
        FHE.allow(score, borrower);
    }
}
