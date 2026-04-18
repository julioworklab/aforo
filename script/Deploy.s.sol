// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { ReceivableMarket } from "../src/ReceivableMarket.sol";
import { MockUSDC } from "../src/MockUSDC.sol";
import { IERC20 } from "../src/interfaces/IERC20.sol";

/// @notice Deploy script for Aforo on Monad testnet.
///         Deploys MockUSDC (for demo) + ReceivableMarket.
///         Mints demo USDC balance to the deployer.
contract DeployScript is Script {
    function run() external {
        address deployer = msg.sender;
        address treasury = vm.envOr("TREASURY", deployer);

        vm.startBroadcast();

        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        ReceivableMarket market = new ReceivableMarket(IERC20(address(usdc)), treasury);
        console.log("ReceivableMarket deployed at:", address(market));
        console.log("Treasury:", treasury);

        // Seed deployer with 10M mUSDC so the demo UI has something to play with.
        usdc.mint(deployer, 10_000_000 * 1e6);
        console.log("Minted 10,000,000 mUSDC to deployer:", deployer);

        vm.stopBroadcast();
    }
}
