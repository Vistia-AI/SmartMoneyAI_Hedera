'use client'

import { parseUnits, type Address } from "viem";
import { 
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Long,
  Hbar,
  TokenAssociateTransaction,
  TokenId,
  AccountId
} from "@hashgraph/sdk";
import { JsonRpcProvider, Contract, Interface } from 'ethers';
import { SAUCERSWAP_SWAP_ADDRESS } from "@/config/contracts-hedera";
import { getTokenAddress } from "@/utils/tokenAddress";
import { getTokenDecimal } from "@/utils/saucerswap-utils";

// Response structure for all signing functions
export interface SignResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
  data?: any;
}

// Calculate deadline (10 minutes from now)
function calculateDeadline(): number {
  return Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes in unix seconds
}

// Helper: get signer from manager
function getSigner(manager: any, pairingData: any) {
  return manager.getSigner(pairingData.accountIds[0]);
}

// Helper: get wHBAR address
function getWHBARAddress(): Address {
  const res = getTokenAddress(295, "whbar");
  if (!res) {
    throw new Error("wHBAR address not found");
  }
  return res;
}

// Helper: Convert EVM contract address to Hedera contract ID
function toContractId(evmAddress: string): ContractId {
  return ContractId.fromEvmAddress(0, 0, evmAddress);
}

// Helper: ensure the recipient account is associated with the HTS token
async function ensureTokenAssociation(
  manager: any,
  pairingData: any,
  tokenEvmAddress: string
): Promise<void> {
  if (!tokenEvmAddress || tokenEvmAddress === "0x0000000000000000000000000000000000000000") {
    return; // Native HBAR requires no association
  }
  const accountId: string = pairingData.accountIds[0];
  const tokenId = TokenId.fromEvmAddress(0, 0, tokenEvmAddress).toString();

  try {
    const url = `https://mainnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const associated = Array.isArray(data?.tokens) && data.tokens.length > 0;
      if (associated) return;
    }
  } catch (err) {
    // If mirror check fails, proceed to attempt association defensively
    console.warn("[ensureTokenAssociation] Mirror check failed, attempting association anyway:", err);
  }

  // Request association via wallet
  const signer = getSigner(manager, pairingData);
  const associateTx = new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(accountId))
    .setTokenIds([TokenId.fromEvmAddress(0, 0, tokenEvmAddress)]);

  await associateTx.freezeWithSigner(signer);
  const assocResult = await manager.sendTransaction(accountId, associateTx);
  

  // Wait for consensus before proceeding to swap
  try {
    const txId = assocResult?.transactionId?.toString?.();
    if (txId) {
      await waitForMirrorTransactionSuccess(txId, 30000);
      
    }
  } catch (err) {
    console.warn('[ensureTokenAssociation] Receipt wait failed, proceeding anyway:', err);
  }
}

// --- Public checkers ---
export async function isTokenAssociated(accountId: string, tokenEvmAddress: string): Promise<boolean> {
  if (!tokenEvmAddress || tokenEvmAddress === "0x0000000000000000000000000000000000000000") {
    return true;
  }
  const tokenId = TokenId.fromEvmAddress(0, 0, tokenEvmAddress).toString();
  const url = `https://mainnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data?.tokens) && data.tokens.length > 0;
  } catch {
    return false;
  }
}

export async function checkTokenApprovalStatus({
  tokenAddress,
  owner,
  spender,
}: {
  tokenAddress: Address;
  owner: `0x${string}`;
  spender: Address;
}): Promise<{ allowance: bigint } > {
  const hederaJsonRelayUrl = process.env.NEXT_PUBLIC_HEDERA_JSON_RPC_RELAY_URL;
  if (!hederaJsonRelayUrl) {
    throw new Error('NEXT_PUBLIC_HEDERA_JSON_RPC_RELAY_URL is not set in environment variables');
  }
  const provider = new JsonRpcProvider(hederaJsonRelayUrl, '', { batchMaxCount: 1 });
  const abi = [
    'function allowance(address owner, address spender) external view returns (uint256)'
  ];
  const erc20 = new Contract(tokenAddress, new Interface(abi).fragments, provider);
  const result = await erc20.allowance(owner, spender);
  const allowance = BigInt(result.toString());
  return { allowance };
}

function getMirrorNodeBaseUrl(): string {
  return process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL || 'https://mainnet.mirrornode.hedera.com';
}

async function accountIdToEvmAddress(accountId: string): Promise<`0x${string}`> {
  const baseUrl = getMirrorNodeBaseUrl();
  const url = `${baseUrl}/api/v1/accounts/${encodeURIComponent(accountId)}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const evm = data.evm_address as string | undefined;
      if (evm && typeof evm === 'string') {
        const prefixed = evm.startsWith('0x') ? evm : `0x${evm}`;
        
        return prefixed as `0x${string}`;
      }
    }
    console.warn('[accountIdToEvmAddress] Mirror response missing evm_address, falling back to SDK conversion');
  } catch (error) {
    console.warn('[accountIdToEvmAddress] Mirror lookup failed, falling back to SDK conversion:', error);
  }
  const account = AccountId.fromString(accountId);
  const fallback = `0x${account.toEvmAddress()}` as `0x${string}`;
  
  return fallback;
}

function isZeroAddress(address: string): boolean {
  return address === '0x0000000000000000000000000000000000000000';
}

// Mirror node receipt poller
async function waitForMirrorTransactionSuccess(transactionId: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  const url = `https://mainnet.mirrornode.hedera.com/api/v1/transactions/${encodeURIComponent(transactionId)}?limit=1&order=desc`;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const entries = data?.transactions ?? [];
        const status = entries[0]?.result ?? entries[0]?.transaction_hash ? entries[0]?.result : undefined;
        if (status === 'SUCCESS') return;
        if (status && status !== 'PENDING' && status !== 'STATUS_UNKNOWN') {
          throw new Error(`Transaction failed with status: ${status}`);
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('Timeout waiting for transaction success');
}

async function checkAndApproveIfNeeded({
  pairingData,
  manager,
  tokenAddress,
  owner,
  spender,
  requiredAmount,
}: {
  pairingData: any;
  manager: any;
  tokenAddress: Address;
  owner: `0x${string}`;
  spender: Address;
  requiredAmount: bigint;
}): Promise<void> {
  const { allowance } = await checkTokenApprovalStatus({ tokenAddress, owner, spender });
  if (allowance >= requiredAmount) {
    return;
  }
  // Approve exactly requiredAmount to be safe
  const decimals = await getTokenDecimal(tokenAddress);
  const approveRes = await signTokenApproval({
    pairingData,
    manager,
    tokenAddress,
    spenderAddress: SAUCERSWAP_SWAP_ADDRESS,
    amount: requiredAmount,
    decimals, // amount is already wei; decimals ignored in bigint path
  });
  if (!approveRes.success) {
    throw new Error(`Approval failed: ${approveRes.error ?? 'unknown error'}`);
  }
  // Wait for approval to finalize before swap
  if (approveRes.transactionHash) {
    try {
      await waitForMirrorTransactionSuccess(approveRes.transactionHash, 30000);
    } catch (err) {
      console.warn('[checkAndApproveIfNeeded] Receipt wait failed, proceeding anyway:', err);
    }
  }
}

// --- Swap HBAR for Tokens ---
// https://docs.saucerswap.finance/v/developer/saucerswap-v1/swap-operations/swap-hbar-for-tokens
/**
 * Signs a transaction to swap HBAR for tokens on SaucerSwap
 * @param pairingData - HashConnect pairing data containing account information
 * @param manager - HashConnect manager instance for transaction signing
 * @param tokenOut - The token address to receive (output token)
 * @param amountOutMin - Minimum amount of tokens to receive (slippage protection)
 * @param to - Recipient address for the swapped tokens
 * @param deadline - Unix timestamp for transaction deadline (optional, defaults to 10 minutes)
 * @param value - Amount of HBAR to swap (in wei)
 * @returns Promise<SignResponse> - Transaction result with success status and hash
 */
export async function signSwapHBARForTokens({
  pairingData,
  manager,
  tokenOut,
  amountOutMin,
  to,
  deadline,
  value,
}: {
  pairingData: any;
  manager: any;
  tokenOut: Address;
  amountOutMin: bigint;
  to: Address;
  deadline?: number;
  value: bigint;
}): Promise<SignResponse> {
  try {
    const path = [getWHBARAddress(), tokenOut]; // WHBAR, tokenOut
    const txDeadline = deadline || calculateDeadline();
    const signer = getSigner(manager, pairingData);

    // Ensure association for tokenOut on the recipient before swap (common Hedera cause of safeTransfer revert)
    await ensureTokenAssociation(manager, pairingData, tokenOut);

    // Form the parameters
    const params = new ContractFunctionParameters()
      .addUint256(Long.fromString(amountOutMin.toString()))
      .addAddressArray(path)
      .addAddress(to)
      .addUint256(Long.fromString(BigInt(txDeadline).toString()));

    if (!params) {
      throw new Error('params is undefined');
    }

    // Form the transaction
    const tx = await new ContractExecuteTransaction()
      // IMPORTANT: setPayableAmount expects Hbar, not tinybars. Convert tinybars -> Hbar explicitly.
      .setPayableAmount(Hbar.fromTinybars(Long.fromString(value.toString())))
      .setContractId(toContractId(SAUCERSWAP_SWAP_ADDRESS))
      .setGas(1_800_000)
      .setTransactionMemo('vistia-ui')
      .setFunction("swapExactETHForTokensSupportingFeeOnTransferTokens", params)

    // Freeze the transaction with the signer
    await tx.freezeWithSigner(signer);
    
    // Sign and broadcast via HashConnect manager to ensure wallet flow executes the tx
    const sigResult = await manager.sendTransaction(pairingData.accountIds[0], tx);
    
    return {
      success: true,
      transactionHash: sigResult.transactionId?.toString?.() ?? undefined,
      data: sigResult,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// --- Swap Tokens for Tokens ---
// https://docs.saucerswap.finance/v/developer/saucerswap-v1/swap-operations/swap-tokens-for-tokens
/**
 * Signs a transaction to swap tokens for tokens on SaucerSwap
 * @param pairingData - HashConnect pairing data containing account information
 * @param manager - HashConnect manager instance for transaction signing
 * @param tokenIn - The token address to swap from (input token)
 * @param tokenOut - The token address to receive (output token)
 * @param amountIn - Amount of input tokens to swap
 * @param amountOutMin - Minimum amount of output tokens to receive (slippage protection)
 * @param to - Recipient address for the swapped tokens
 * @param deadline - Unix timestamp for transaction deadline (optional, defaults to 10 minutes)
 * @returns Promise<SignResponse> - Transaction result with success status and hash
 */
export async function signSwapTransaction({
  pairingData,
  manager,
  tokenIn,
  tokenOut,
  amountIn,
  amountOutMin,
  to,
  deadline,
}: {
  pairingData: any;
  manager: any;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  to: Address;
  deadline?: number;
}): Promise<SignResponse> {
  try {
    const path = [tokenIn, tokenOut];
    const txDeadline = deadline || calculateDeadline();
    const signer = getSigner(manager, pairingData);
    const params = new ContractFunctionParameters()
      .addUint256(Long.fromString(amountIn.toString()))
      .addUint256(Long.fromString(amountOutMin.toString()))
      .addAddressArray(path)
      .addAddress(to)
      .addUint256(Long.fromString(BigInt(txDeadline).toString()));

    if (!params) {
      throw new Error('params is undefined');
    }

    const tx = new ContractExecuteTransaction()
      .setContractId(toContractId(SAUCERSWAP_SWAP_ADDRESS))
      .setGas(1_800_000)
      .setTransactionMemo('vistia-ui')
      .setFunction("swapExactTokensForTokensSupportingFeeOnTransferTokens", params);
    
    await tx.freezeWithSigner(signer);
    const sigResult = await manager.sendTransaction(pairingData.accountIds[0], tx);
    
    return {
      success: true,
      transactionHash: sigResult.transactionId?.toString?.(),
      data: sigResult,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// --- Swap Tokens for HBAR ---
// https://docs.saucerswap.finance/v/developer/saucerswap-v1/swap-operations/swap-tokens-for-hbar
/**
 * Signs a transaction to swap tokens for HBAR on SaucerSwap
 * @param pairingData - HashConnect pairing data containing account information
 * @param manager - HashConnect manager instance for transaction signing
 * @param tokenIn - The token address to swap from (input token)
 * @param amountIn - Amount of input tokens to swap
 * @param amountOutMin - Minimum amount of HBAR to receive (slippage protection)
 * @param to - Recipient address for the received HBAR
 * @param deadline - Unix timestamp for transaction deadline (optional, defaults to 10 minutes)
 * @returns Promise<SignResponse> - Transaction result with success status and hash
 */
export async function signSwapTokensForHBAR({
  pairingData,
  manager,
  tokenIn,
  amountIn,
  amountOutMin,
  to,
  deadline,
}: {
  pairingData: any;
  manager: any;
  tokenIn: Address;
  amountIn: bigint;
  amountOutMin: bigint;
  to: Address;
  deadline?: number;
}): Promise<SignResponse> {
  try {
    const path = [tokenIn, getWHBARAddress()]; // tokenIn, WHBAR
    const txDeadline = deadline || calculateDeadline();
    const signer = getSigner(manager, pairingData);
    const params = new ContractFunctionParameters()
      .addUint256(Long.fromString(amountIn.toString()))
      .addUint256(Long.fromString(amountOutMin.toString()))
      .addAddressArray(path)
      .addAddress(to)
      .addUint256(Long.fromString(BigInt(txDeadline).toString()));

    if (!params) {
      throw new Error('params is undefined');
    }

    const tx = new ContractExecuteTransaction()
      .setContractId(toContractId(SAUCERSWAP_SWAP_ADDRESS))
      .setGas(1_800_000)
      .setTransactionMemo('vistia-ui')
      .setFunction("swapExactTokensForETHSupportingFeeOnTransferTokens", params);
    
    // Freeze the transaction with the signer
    await tx.freezeWithSigner(signer);
    
    const sigResult = await manager.sendTransaction(pairingData.accountIds[0], tx);
    return {
      success: true,
      transactionHash: sigResult.transactionId.toString(),
      data: sigResult
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// --- High level orchestrator ---
export async function signTxnWithHashPack({
  pairingData,
  manager,
  preparedData,
}: {
  pairingData: any;
  manager: any;
  preparedData: {
    fromTokenAddress: Address;
    toTokenAddress: Address;
    fromToken?: string;
    toToken?: string;
    amountIn: string;
    estimatedAmountOutMin: string;
  };
}): Promise<SignResponse> {
  try {
    const { fromTokenAddress, toTokenAddress, amountIn, estimatedAmountOutMin } = preparedData;

    // Decimals
    const fromDecimals = await getTokenDecimal(fromTokenAddress);
    const toDecimals = await getTokenDecimal(toTokenAddress);

    // Amounts in wei
    const amountInWei = parseUnits(amountIn, fromDecimals);
    const amountOutMinWei = parseUnits(estimatedAmountOutMin, toDecimals);

    // Recipient
    const toAddress = await accountIdToEvmAddress(pairingData.accountIds[0]);

    const spender = SAUCERSWAP_SWAP_ADDRESS;

    let result: SignResponse;
    if (isZeroAddress(fromTokenAddress)) {
      await ensureTokenAssociation(manager, pairingData, toTokenAddress);
      result = await signSwapHBARForTokens({
        pairingData,
        manager,
        tokenOut: toTokenAddress as Address,
        amountOutMin: amountOutMinWei,
        to: toAddress,
        value: amountInWei,
      });
    } else if (isZeroAddress(toTokenAddress)) {
      await checkAndApproveIfNeeded({
        pairingData,
        manager,
        tokenAddress: fromTokenAddress as Address,
        owner: toAddress,
        spender,
        requiredAmount: amountInWei,
      });
      result = await signSwapTokensForHBAR({
        pairingData,
        manager,
        tokenIn: fromTokenAddress as Address,
        amountIn: amountInWei,
        amountOutMin: amountOutMinWei,
        to: toAddress,
      });
    } else {
      await ensureTokenAssociation(manager, pairingData, toTokenAddress);
      await checkAndApproveIfNeeded({
        pairingData,
        manager,
        tokenAddress: fromTokenAddress as Address,
        owner: toAddress,
        spender,
        requiredAmount: amountInWei,
      });
      result = await signSwapTransaction({
        pairingData,
        manager,
        tokenIn: fromTokenAddress as Address,
        tokenOut: toTokenAddress as Address,
        amountIn: amountInWei,
        amountOutMin: amountOutMinWei,
        to: toAddress,
      });
    }
    return result;
  } catch (error) {
    console.error('[signTxnWithHashPack] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// --- Token Approval ---
/**
 * Signs a transaction to approve a spender to spend tokens on behalf of the user
 * @param pairingData - HashConnect pairing data containing account information
 * @param manager - HashConnect manager instance for transaction signing
 * @param tokenAddress - The token contract address to approve
 * @param spenderAddress - The address that will be approved to spend tokens
 * @param amount - Amount of tokens to approve (can be string or bigint)
 * @param decimals - Token decimals for parsing string amounts (defaults to 18)
 * @returns Promise<SignResponse> - Transaction result with success status and hash
 */
export async function signTokenApproval({
  pairingData,
  manager,
  tokenAddress,
  spenderAddress,
  amount,
  decimals = 18,
}: {
  pairingData: any;
  manager: any;
  tokenAddress: Address;
  spenderAddress: Address;
  amount: string | bigint;
  decimals?: number;
}): Promise<SignResponse> {
  try {
    

    const amountWei = typeof amount === 'bigint' ? amount : parseUnits(amount, decimals);
    

    const signer = getSigner(manager, pairingData);

    const params = new ContractFunctionParameters()
      .addAddress(spenderAddress)
      .addUint256(Long.fromString(amountWei.toString()));

    const tx = new ContractExecuteTransaction()
      .setContractId(toContractId(tokenAddress))
      .setGas(500_000)
      .setFunction("approve", params);
  
    await tx.freezeWithSigner(signer);
    

    const sigResult = await manager.sendTransaction(pairingData.accountIds[0], tx);
    
    return {
      success: true,
      transactionHash: sigResult.transactionId?.toString?.() ?? undefined,
      data: sigResult,
    };
  } catch (error) {
    console.error('[signTokenApproval] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 