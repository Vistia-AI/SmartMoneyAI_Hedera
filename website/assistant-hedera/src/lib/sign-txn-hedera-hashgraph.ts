"use client";

// walletService.ts
import { encodeFunctionData, parseUnits, Address } from "viem";
import { ContractExecuteTransaction, Client, AccountId, ContractId, Hbar } from "@hashgraph/sdk";
import { SAUCERSWAP_SWAP_ABI, SAUCERSWAP_SWAP_ADDRESS } from "@/config/contracts-hedera";

// --- Prepare Hedera client for signing ---
const getClient = (accountId: string) => {
  const client = Client.forMainnet();
  client.setOperator(AccountId.fromString(accountId), ""); // no PK, signing done by HashPack
  return client;
};

// --- Generic Hedera contract call signer ---
export const signAndSendContractCall = async ({
  pairingData,
  manager,
  functionName,
  args,
  gas = 300_000,
}: {
  pairingData: any;
  manager: any;
  functionName: string;
  args: any[];
  gas?: number;
}) => {
  // Encode EVM call using viem
  const encodedFunction = encodeFunctionData({
    abi: SAUCERSWAP_SWAP_ABI,
    functionName,
    args,
  });

  // Convert EVM address to Hedera Contract ID
  const contractId = ContractId.fromEvmAddress(0, 0, SAUCERSWAP_SWAP_ADDRESS);

  // Prepare transaction
  const client = getClient(pairingData.accountIds[0]);
  const tx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(gas)
    .setFunctionParameters(Buffer.from(encodedFunction.slice(2), "hex"))
    .freezeWith(client);

  const txBytes = Buffer.from(tx.toBytes());

  // Request signature via HashPack
  const signatureResult = await manager.sendTransaction(pairingData.accountIds[0], tx);

  return signatureResult?.response;
};
