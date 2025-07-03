import { tool } from 'ai';
import { formatUnits, isAddress, type Address } from 'viem';
import { z } from 'zod';
import { checkAuth } from '@/app/actions/auth';
import { currentChainId } from '@/utils/getClients';
// import { wAddress } from '@/config/contracts-hedera';
// import type { SessionData } from '@/types/session';
// import { getQuote } from '@/utils/aggregator';
// import { getAllUserBalances, getBalances, getContractBalances } from '@/utils/balances';
// import { executeSwap } from '@/utils/contract-operations';
import { getTokenAddress } from '@/utils/tokenAddress';
import { getTokenDecimals } from '@/utils/tokenDecimals';
// import { getTokenSymbol } from '@/utils/tokenSymbol';
// import { sendStreamUpdate } from '@/utils/update-stream';
import { swapExactTokensForTokens, getAmountOut } from '@/utils/saucerswap-utils';
import { cookies } from 'next/headers';

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
  let address: string;
  if (isAddress(ticker)) {
    address = ticker;
  } else if (ticker.toLowerCase() === 'native') {
    address = '0x0000000000000000000000000000000000342855';
  } else {
    const resolvedAddress = getTokenAddress(currentChainId, ticker);
    if (!resolvedAddress) {
      throw new Error(`Could not find token "${ticker}" on Hedera EVM Testnet. Please provide the token's contract address.`);
    }
    address = resolvedAddress;
  }
  return address as Address
}

function checkTicker(ticker: string) {
  if (ticker === 'native') return 'WHBAR'
  return ticker
}

export const getSwapQuotePancake = tool({
  description: 'Get swap quote with PancakeSwap',
  parameters: swapParamsSchema,
  execute: async function (params) {
    console.log('----- Trigger get quote with PancakeSwap -----')
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
      const { amountsOut, amountOutMin } = await getAmountOut(
        [fromTokenAddress, toTokenAddress],
        params.amount,
        params.slippage
      )

      // Form a response
      const toDecimals = await getTokenDecimals(currentChainId, toTokenAddress);
      const estAmountOut = Number(formatUnits(amountsOut[1], toDecimals)).toFixed(6);
      const estAmountOutMin = Number(formatUnits(amountOutMin, toDecimals)).toFixed(6);
      const content = `You're set to receive approximately ${estAmountOut} ${params.toToken}.
      With slippage of ${params.slippage}%, you will receive ${estAmountOutMin} at the minimal.
      Do you want to proceed?`;

      const quoteData = {
        fromToken: checkTicker(params.fromToken),
        toToken: checkTicker(params.toToken),
        estimatedAmountOut: estAmountOut,
        estimatedAmountOutMin: estAmountOutMin,
        fromTokenAddress,
        toTokenAddress,
        amountIn: params.amount,
      }

      console.log('getSwapQuotePancake return: ', {
        success: true,
        content,
        quoteData,
      });
      
      return {
        success: true,
        content,
        quoteData,
      };
    } catch (error) {
      const content = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.log(content)
      return { success: false, content }
    }
  }
})

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
      console.log({ fromTokenAddress, toTokenAddress })

      // Get quote
      const { amountsOut, amountOutMin } = await getAmountOut(
        [fromTokenAddress, toTokenAddress],
        params.amount,
        params.slippage
      )
      console.log({ amountsOut, amountOutMin })

      // Form a response
      const toDecimals = await getTokenDecimals(currentChainId, toTokenAddress);
      const estAmountOut = Number(formatUnits(amountsOut[1], toDecimals)).toFixed(6);
      const estAmountOutMin = Number(formatUnits(amountOutMin, toDecimals)).toFixed(6);
      const content = `You're set to receive approximately ${estAmountOut} ${params.toToken}.
      With slippage of ${params.slippage}%, you will receive ${estAmountOutMin} at the minimal.
      Do you want to proceed?`;

      const quoteData = {
        fromToken: checkTicker(params.fromToken),
        toToken: checkTicker(params.toToken),
        estimatedAmountOut: estAmountOut,
        estimatedAmountOutMin: estAmountOutMin,
        fromTokenAddress,
        toTokenAddress,
        amountIn: params.amount,
      }

      console.log('getSwapQuotePancake return: ', {
        success: true,
        content,
        quoteData,
      });
      
      return {
        success: true,
        content,
        quoteData,
      };
    } catch (error) {
      const content = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.log(content)
      return { success: false, content }
    }
  }
})

// export const debugSaucerswap = tool({
//   description: 'Debug Saucerswap quoter contract',
//   parameters: z.object({}),
//   execute: async function () {
//     console.log('----- Debug Saucerswap Quoter Contract -----')
//     const sessionResult = await checkAuth();
//     if (!sessionResult) {
//       return {
//         success: false,
//         error: 'Authentication required',
//       };
//     }

//     try {
//       const result = await debugQuoterContract();
//       console.log('Debug result:', result);
      
//       if (result.success) {
//         return {
//           success: true,
//           content: `Quoter contract is accessible. WHBAR address: ${result.whbarAddress}, Factory address: ${result.factoryAddress}`,
//           data: result
//         };
//       } else {
//         return {
//           success: false,
//           content: `Quoter contract error: ${result.error}`,
//           data: result
//         };
//       }
//     } catch (error) {
//       const content = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
//       console.log(content)
//       return { success: false, content }
//     }
//   }
// })

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

export const executeSwapPancake = tool({
  description: 'Execute swap transaction with private secret',
  parameters: swapParamsSchema,
  execute: async function (params) {
    console.log('----- Trigger swap with PancakeSwap -----')
    console.log({ params })
    const sessionResult = await checkAuth();
    if (!sessionResult) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }
    // const session = sessionResult as SessionData;

    try {
      // Resolve fromToken
      const fromTokenAddress = resolveTokenOnly(params.fromToken);

      // Resolve toToken
      const toTokenAddress = resolveTokenOnly(params.toToken);

      // Execute swap
      const txnHash = await swapExactTokensForTokens(
        fromTokenAddress as `0x${string}`,
        toTokenAddress as `0x${string}`,
        params.amount,
        0.5
      )

      const message = `Inform the user that the swap was successful. Add this hash to the response: ${txnHash}`
      return { status: true, message}
    } catch (error) {
      const content = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.log(content)
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
      const { amountsOut, amountOutMin } = await getAmountOut(
        [fromTokenAddress, toTokenAddress],
        params.amount,
        params.slippage
      )

      // Form a response
      const toDecimals = await getTokenDecimals(currentChainId, toTokenAddress);
      const estAmountOut = Number(formatUnits(amountsOut[1], toDecimals)).toFixed(6);
      const estAmountOutMin = Number(formatUnits(amountOutMin, toDecimals)).toFixed(6);
      const content = `Transaction prepared. Please sign this in your wallet.
      You're set to receive approximately ${estAmountOut} ${params.toToken}.
      With slippage of ${params.slippage}%, you will receive ${estAmountOutMin} at the minimal.`;

      const preparedData = {
        fromToken: checkTicker(params.fromToken),
        toToken: checkTicker(params.toToken),
        estimatedAmountOut: estAmountOut,
        estimatedAmountOutMin: estAmountOutMin,
        fromTokenAddress,
        toTokenAddress,
        amountIn: params.amount,
      }

      console.log('prepForSwap return: ', {
        success: true,
        content,
        preparedData,
      });
      
      return {
        success: true,
        content,
        preparedData,
      };
    } catch (error) {
      const content = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.log(content)
      return { success: false, content }
    }
  }
})

// export const executeSwapTool = tool({
//   description: 'Execute swap transaction',
//   parameters: swapParamsSchema,
//   execute: async function (params) {
//     const sessionResult = await checkAuth();
//     if (!sessionResult) {
//       return {
//         success: false,
//         error: 'Authentication required',
//       };
//     }
//     const session = sessionResult as SessionData;

//     try {
//       // Resolve tokens and amount
//       const { fromTokenAddress, toTokenAddress, amountIn } = await resolveTokenAndAmount(params, session);

//       // Check if user has contract balance
//       const contractBalance = await getContractBalances(session.userId, fromTokenAddress as Address);
//       const useContract = contractBalance && contractBalance.amount > 0n ? 'contract' : 'wallet';

//       // If using wallet, check for approval
//       if (useContract === 'wallet') {
//         const balances = await getBalances(session.userId, session.address as Address, fromTokenAddress as Address);
//         if (balances.walletBalance && BigInt(balances.walletBalance.allowance) < BigInt(amountIn)) {
//           const symbol = await getTokenSymbol(chainId, fromTokenAddress as Address);
//           const decimals = await getTokenDecimals(chainId, fromTokenAddress);

//           const content = await sendStreamUpdate(
//             session.userId,
//             "You'll need to approve the token allowance first. Please use the button below to approve.",
//             false,
//             1
//           );

//           return {
//             success: true,
//             content,
//             shouldAbort: true,
//             needsApproval: {
//               fromAddress: fromTokenAddress as Address,
//               toAddress: toTokenAddress as Address,
//               amount: amountIn,
//               symbol,
//               decimals,
//             },
//           };
//         }
//       }

//       // Get quote from aggregator
//       const quoteResult = await getQuote(fromTokenAddress, toTokenAddress, amountIn);

//       if (!quoteResult.success || !quoteResult.data) {
//         const content = await sendStreamUpdate(
//           session.userId,
//           `Sorry, I couldn't get a quote for your swap: ${quoteResult.error || 'Unknown error'}`,
//           false
//         );
//         return { success: false, content };
//       }

//       // Execute the swap
//       console.log('Executing the swap now');
//       const swapResult = await executeSwap(quoteResult.data, session.address as Address, useContract === 'contract');

//       if (!swapResult.success || !swapResult.data) {
//         const content = `Sorry, the swap failed: ${swapResult.error}`;
//         return { success: false, content };
//       }

//       console.log('Starting stream to the user');
//       await new Promise((resolve) => setTimeout(resolve, 2000));

//       let message;
//       if (useContract === 'contract') {
//         const { message: balancesMessage } = await getAllUserBalances(session.userId);
//         message = balancesMessage + `Inform the user that the swap was successful!`;
//       } else {
//         message = `Inform the user that the swap from their wallet was successful! Write this in new line: [View on Pocket Scan](https://poktscan.com/tx/${swapResult.data.hash} and then nice message in new line after that.`;
//       }

//       return {
//         success: true,
//         message: message,
//       };
//     } catch (error) {
//       // Handle approval needed case
//       if (error && typeof error === 'object' && 'type' in error && error.type === 'approval_needed') {
//         const content =
//           "You'll need to approve the token allowance first. This is a one-time permission needed for the assistant to swap tokens on your behalf.";
//         return {
//           success: false,
//           content,
//         };
//       }

//       // Handle other errors
//       const content = `Sorry, there was an unexpected error with your swap: ${error instanceof Error ? error.message : 'Unknown error'}`;
//       return { success: false, content };
//     }
//   },
// });

export const swapTools = {
  // getQuote: getSwapQuotePancake,
  getQuote: getSwapQuoteSaucerswap,
  // executeSwap: executeSwapTool,
  runPancakeSwap: executeSwapPancake,
  checkSecret: checkPrivateSecret,
  prep: prepForSwap,
  // debug: debugSaucerswap,
};
