'use client'

import {
  createPublicClient,
  createWalletClient,
  custom,
  parseUnits,
  erc20Abi,
  type Address,
  type PublicClient,
  type WalletClient,
  type Account,
  type Chain,
} from 'viem'
import { chainConfig } from '../config/chains';
import { SAUCERSWAP_SWAP_ADDRESS, SAUCERSWAP_SWAP_ABI } from '../config/contracts-hedera'  // Saucerswap Router V2 ABI and address

async function getTokenDecimal(tokenAddress: Address, publicClient: PublicClient) {
  const decimal = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
  })
  return decimal
}

async function checkBalance (
  walletAddress: Address,
  tokenAddress: Address,
  publicClient: PublicClient
) {
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [walletAddress]
  })
  return balance
}

async function checkAllowance (
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address,
  publicClient: PublicClient,
) {
  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [ownerAddress, spenderAddress]
  })
  return allowance
}

async function approveToken(
  tokenAddress: Address,
  spenderAddress: Address,
  amount: bigint | number,
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Account,
  chain: Chain,
  decimal?: number,
) {
  const approveAmount = typeof amount === 'bigint'
  ? amount
  : parseUnits(`${amount}`, decimal ? decimal : 18)

  const approveHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, approveAmount],
    account,
    chain,
  })

  const approveReceipt = publicClient.waitForTransactionReceipt({ hash: approveHash })
  return { approveHash, approveReceipt }
}

export async function getAmountOut (
  path: Address[],
  amount: bigint | string,
  slippage: number,
  publicClient: PublicClient,
  decimal?: number
) {
  const amountWei = typeof amount === 'bigint' ? amount : parseUnits(amount, decimal ? decimal : 18);

  const amountsOut: any = await publicClient.readContract({
    address: SAUCERSWAP_SWAP_ADDRESS,
    abi: SAUCERSWAP_SWAP_ABI,
    functionName: "getAmountsOut",
    args: [amountWei, path],
  });
  
  const amountOutMin = amountsOut[1] - (amountsOut[1] * BigInt(slippage * 100) / BigInt(10000));
  return { amountsOut, amountOutMin }
}

// TODO: Replace with Hedera transaction signing
// export async function swapTokensWithMetaMask(
//   fromTokenAddress: Address,
//   toTokenAddress: Address,
//   amountIn: string,
//   amountOutMin: string,
//   chainId: number
// ) {
//   // This function has been removed as we're migrating to Hedera
//   throw new Error('This function has been removed. Use Hedera transaction signing instead.');
// }
