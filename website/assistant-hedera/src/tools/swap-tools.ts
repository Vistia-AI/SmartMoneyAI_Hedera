import { tool } from 'ai';
import { formatUnits, parseUnits } from 'viem';
import { z } from 'zod';
import { checkAuth } from '@/app/actions/auth';
// import { wAddress } from '@/config/contracts-hedera';
// import type { SessionData } from '@/types/session';
// import { getQuote } from '@/utils/aggregator';
// import { getAllUserBalances, getBalances, getContractBalances } from '@/utils/balances';
// import { executeSwap } from '@/utils/contract-operations';
import { getTokenAddress } from '@/utils/tokenAddress';
// import { getTokenDecimals } from '@/utils/tokenDecimals';
// import { getTokenSymbol } from '@/utils/tokenSymbol';
// import { sendStreamUpdate } from '@/utils/update-stream';
import { getAmountOut, getTokenDecimal } from '@/utils/saucerswap-utils';
import { cookies } from 'next/headers';

// Hedera account ID validation
export function isValidAccountId(accountId: string): boolean {
  // Hedera account ID format: 0.0.12345
  const accountIdRegex = /^0\.0\.\d+$/;
  return accountIdRegex.test(accountId);
}

// Legacy function for compatibility (local alias)
const isAddress = isValidAccountId;

// Hedera account ID type (format: 0.0.12345)
export type AccountId = `0.0.${number}`;

// Legacy type alias for compatibility
export type Address = `0x${string}`;

const swapParamsSchema = z.object({
  fromToken: z.string().describe('Source token address or symbol (e.g. "ETH", "USDC", or contract address)'),
  toToken: z.string().describe('Destination token address or symbol (e.g. "ETH", "USDC", or contract address)'),
  amount: z.string().describe('Amount to swap (in human readable units)'),
  // amountIn and amountOut are currently experiments and does absolutely nothing for now
  // amountIn: z.string().describe('Amount of from token to swap (in human readable units). If none found, set to "0"'),
  // amountOut: z.string().describe('Amount of to token to swap (in human readable units). If none found, set to "0"'),
  slippage: z.number().describe('Slipage in number from 0 to 100. If none found, set to 0.5'),
});

function resolveTokenOnly (ticker: string | Address) {
  if (isAddress(ticker)) {
    return ticker;
  }
  let inputTicker: string;
  if (['native', 'hbar'].includes(ticker.toLowerCase())) {
    inputTicker = 'whbar';
  } else {
    inputTicker = ticker.toLowerCase();
  }
  const resolvedAddress = getTokenAddress(295, inputTicker);
  if (!resolvedAddress) {
    throw new Error(`Could not find token "${ticker}" on Hedera EVM Mainnet. Please provide the token's contract address.`);
  }
  return resolvedAddress as Address
}

const getSwapQuoteSaucerswap = tool({
  description: 'Get swap quote with Saucerswap',
  parameters: swapParamsSchema,
  execute: async function (params) {
    console.log('----- Trigger get quote with Saucerswap -----')
    console.log({ params })
    const sessionResult = await checkAuth();
    if (!sessionResult) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    try {
      // Resolve fromToken
      const fromTokenAddress = resolveTokenOnly(params.fromToken);

      // Resolve toToken
      const toTokenAddress = resolveTokenOnly(params.toToken);
 
      // Get quote
      const fromDecimals = await getTokenDecimal(fromTokenAddress);
      const toDecimals = await getTokenDecimal(toTokenAddress);

      const amountInWei = parseUnits(params.amount, fromDecimals);
      const amountsOut = await getAmountOut(amountInWei, [fromTokenAddress, toTokenAddress]);
      const amountOutMin = amountsOut[1] - (amountsOut[1] * BigInt(params.slippage * 100) / 10000n);

      // Form a response
      const estAmountOut = Number(formatUnits(amountsOut[1], toDecimals)).toFixed(6);
      const estAmountOutMin = Number(formatUnits(amountOutMin, toDecimals)).toFixed(6);
      const content = `You're set to receive approximately ${estAmountOut} ${params.toToken}.
      With slippage of ${params.slippage}%, you will receive ${estAmountOutMin} at the minimal.
      Do you want to proceed?`;

      const quoteData = {
        fromToken: params.fromToken,
        toToken: params.toToken,
        estimatedAmountOut: estAmountOut,
        estimatedAmountOutMin: estAmountOutMin,
        fromTokenAddress,
        toTokenAddress,
        amountIn: params.amount,
      }
      
      return {
        success: true,
        content,
        quoteData,
      };
    } catch (error) {
      const content = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      return { success: false, content }
    }
  }
})

export const checkPrivateSecret = tool({
  description: "Check for private secret after get swap quote",
  parameters: z.object({}),
  execute: async function () {
    console.log('----- Trigger check private secret -----')
    try {
      const cookieStore = await cookies()
      const pk = cookieStore.get('pk')
      let message = `Inform the user that private secret not found and they can either:
1. Sign with your wallet.
2. Go to setting to set the private secret and we will handle everything for you.`
      if (!pk) return { status: false, message }

      message = "Inform the user that private secret found."
      return { status: true, message }
    } catch (error) {
      const content = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      return { success: false, content }
    }
  }
})

export const prepForSwap = tool({
  description: "Prepare swap transaction info",
  parameters: swapParamsSchema,
  execute: async function (params) {
    console.log('----- Trigger swap with no private secret -----')
    console.log({ params })
    const sessionResult = await checkAuth();
    if (!sessionResult) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    try {
      // Resolve fromToken
      const fromTokenAddress = resolveTokenOnly(params.fromToken);

      // Resolve toToken
      const toTokenAddress = resolveTokenOnly(params.toToken);

      // Get quote
      const fromDecimals = await getTokenDecimal(fromTokenAddress);
      const toDecimals = await getTokenDecimal(toTokenAddress);

      const amountInWei = parseUnits(params.amount, fromDecimals);
      const amountsOut = await getAmountOut(amountInWei, [fromTokenAddress, toTokenAddress]);
      const amountOutMin = amountsOut[1] - (amountsOut[1] * BigInt(params.slippage * 100) / 10000n);
      
      // Form a response
      const estAmountOut = Number(formatUnits(amountsOut[1], toDecimals)).toFixed(6);
      const estAmountOutMin = Number(formatUnits(amountOutMin, toDecimals)).toFixed(6);
      const content = `Transaction prepared. Please sign this in your wallet.
      You're set to receive approximately ${estAmountOut} ${params.toToken}.
      With slippage of ${params.slippage}%, you will receive ${estAmountOutMin} at the minimal.`;

      const preparedData = {
        fromToken: params.fromToken,
        toToken: params.toToken,
        estimatedAmountOut: estAmountOut,
        estimatedAmountOutMin: estAmountOutMin,
        fromTokenAddress: ['native', 'hbar'].includes(params.fromToken.toLowerCase()) ? '0x0000000000000000000000000000000000000000' : fromTokenAddress,
        toTokenAddress: ['native', 'hbar'].includes(params.toToken.toLowerCase()) ? '0x0000000000000000000000000000000000000000' : toTokenAddress,
        amountIn: params.amount,
      }
      
      return {
        success: true,
        content,
        preparedData,
      };
    } catch (error) {
      const content = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      return { success: false, content }
    }
  }
})

export const swapTools = {
  getQuote: getSwapQuoteSaucerswap,
  // checkSecret: checkPrivateSecret,
  prep: prepForSwap,
};
