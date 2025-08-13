import { SAUCERSWAP_SWAP_ABI, SAUCERSWAP_SWAP_ADDRESS } from "@/config/contracts-hedera";
import { 
  Client, AccountId, TokenId, TokenInfoQuery, AccountBalanceQuery, AccountInfoQuery, 
  TokenAssociateTransaction, ContractCallQuery, ContractId
} from "@hashgraph/sdk";
import { encodeFunctionData, decodeFunctionResult, Address } from "viem";
import { JsonRpcProvider, Contract, Interface } from 'ethers';

// --- Helpers ---
const toTokenId = (evmAddress: string) => TokenId.fromEvmAddress(0, 0, evmAddress);
const getClient = (accountId: string) => {
  const client = Client.forMainnet();
  client.setOperator(AccountId.fromString(accountId), "");
  return client;
};

// 1. Check balance
export const checkBalance = async (walletId: string, tokenEvmAddress: string) => {
  const client = getClient(walletId);
  const tokenId = toTokenId(tokenEvmAddress);
  const balance = await new AccountBalanceQuery()
    .setAccountId(AccountId.fromString(walletId))
    .execute(client);
  const tokenBalance = balance.tokens;
  return tokenBalance ? tokenBalance.get(tokenId)?.toBigInt() : 0n;
};

// 2. Get token decimals
export const getTokenDecimal = async (tokenEvmAddress: string) => {
  
  try {
    if (tokenEvmAddress === '0x0000000000000000000000000000000000000000') {
      return 8;
    }
    // Try using mirror node API instead of direct SDK query
    const tokenId = toTokenId(tokenEvmAddress);
    
    
    // Use mirror node API to get token info
    const url = `https://mainnet.mirrornode.hedera.com/api/v1/tokens/${tokenId.toString()}`
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      
      throw new Error(`Failed to fetch token info. Error: ${data}`);
    }
    const decimals = data.decimals;
    
    return decimals;
  } catch (error) {
    console.error('[getTokenDecimal] Error:', error);
    throw error;
  }
};

// 3. Check token association
export const checkAssociation = async (walletId: string, tokenEvmAddress: string) => {
  const client = getClient(walletId);
  const tokenId = toTokenId(tokenEvmAddress);
  const info = await new AccountInfoQuery()
    .setAccountId(AccountId.fromString(walletId))
    .execute(client);
  return info.tokenRelationships.get(tokenId);
};

// 4. Associate token
export const associateToken = async (tokenEvmAddress: string, pairingData: any, hashconnectInstance: any) => {
  const accountId = pairingData.accountIds[0];
  const client = getClient(accountId);
  const tokenId = toTokenId(tokenEvmAddress);

  const tx = await new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(accountId))
    .setTokenIds([tokenId])
    .freezeWith(client);

  const txBytes = Buffer.from(await tx.toBytes());
  const sigResult = await hashconnectInstance.signAndSendTransaction(pairingData.topic, {
    topic: pairingData.topic,
    byteArray: txBytes,
    metadata: { accountToSign: accountId }
  });
  return sigResult?.response;
};

// 5. Get amount out (SaucerSwap Router) - using ethers.js and Hedera JSON RPC
export const getAmountOut = async (amountIn: bigint, path: string[]) => {
  const hederaJsonRelayUrl = process.env.NEXT_PUBLIC_HEDERA_JSON_RPC_RELAY_URL;
  if (!hederaJsonRelayUrl) {
    throw new Error('NEXT_PUBLIC_HEDERA_JSON_RPC_RELAY_URL is not set in environment variables');
  }

  // Set up provider
  const provider = new JsonRpcProvider(hederaJsonRelayUrl, '', { batchMaxCount: 1 });

  // ABI for getAmountsOut
  const abi = [
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
  ];
  const abiInterface = new Interface(abi);
  // console.log('[getAmountOut] abiInterface:');
  // console.dir(abiInterface, { depth: null });

  // Router contract address (should be SAUCERSWAP_SWAP_ADDRESS)
  const routerContract = new Contract(SAUCERSWAP_SWAP_ADDRESS, abiInterface.fragments, provider);
  // console.log('[getAmountOut] routerContract:');
  // console.dir(routerContract, { depth: null });

  // Call getAmountsOut
  const result = await routerContract.getAmountsOut(amountIn, path);
  // result is a BigNumber[] (ethers v6)
  const amounts = result.map((x: any) => BigInt(x.toString()));
  
  return amounts;
};
