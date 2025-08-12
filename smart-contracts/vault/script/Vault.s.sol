// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {Vault} from "../src/Vault.sol";
import {VaultConfig} from "../src/VaultConfig.sol";

contract VaultScript is Script {
    function run() external returns (address) {
        // Load the private key from the .env file
        uint256 deployerPrivateKey = vm.envUint("OPERATOR_KEY");
        
        // Start broadcasting transactions with the loaded private key
        vm.startBroadcast(deployerPrivateKey);

        // Get the deployer's address (for reference)
        address deployerAddress = vm.addr(deployerPrivateKey);

        // Get configuration from VaultConfig library (primary configuration)
        address token1 = VaultConfig.TOKEN1;
        address token2 = VaultConfig.TOKEN2;
        uint256 runTimestamp = block.timestamp + VaultConfig.RUN_TIMESTAMP;
        uint256 stopTimestamp = block.timestamp + VaultConfig.STOP_TIMESTAMP;
        uint256 maxShareholders = VaultConfig.MAX_SHAREHOLDERS;
        address manager = deployerAddress;

        // Deploy the contract
        Vault vault = new Vault(
            token1,
            token2,
            runTimestamp,
            stopTimestamp,
            maxShareholders,
            manager
        );

        // Stop broadcasting
        vm.stopBroadcast();

        console.log("Vault deployed to:", address(vault));
        console.log("Token1 address:", token1);
        console.log("Token2 address:", token2);
        console.log("Run timestamp:", runTimestamp);
        console.log("Stop timestamp:", stopTimestamp);
        console.log("Max shareholders:", maxShareholders);
        console.log("Manager address:", deployerAddress);

        return address(vault);
    }
}