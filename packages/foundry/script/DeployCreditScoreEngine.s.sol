// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {CreditScoreEngine} from "../src/CreditScoreEngine.sol";

/// @notice Deploys CreditScoreEngine to the network configured via FOUNDRY_PROFILE.
/// Usage (Sepolia):
///   forge script script/DeployCreditScoreEngine.s.sol \
///     --rpc-url sepolia \
///     --broadcast \
///     --verify \
///     -vvvv
contract DeployCreditScoreEngine is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        CreditScoreEngine engine = new CreditScoreEngine();
        console.log("CreditScoreEngine deployed at:", address(engine));

        vm.stopBroadcast();
    }
}
