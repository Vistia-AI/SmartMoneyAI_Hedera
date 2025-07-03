import { parseUnits, formatUnits, erc20Abi, type Address } from "viem";
import { SAUCERSWAP_SWAP_ADDRESS, SAUCERSWAP_SWAP_ABI } from '../config/contracts-hedera'  // Saucerswap Router V2 ABI and address
import { getWalletClient, getPublicClient, currentChainId } from "./getClients"
import { PANCAKE_SWAP_ADDRESS, PANCAKE_SWAP_ABI } from '../config/contracts'

async function checkBalance (
  walletAddress: Address,
  tokenAddress: Address
) {
  const { publicClient } = await getPublicClient(currentChainId)
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [walletAddress]
  })
  return balance
}

async function getTokenDecimal(tokenAddress: Address) {
  const { publicClient } = await getPublicClient(currentChainId)
  const decimal = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
  })
  return decimal
}

async function checkAllowance (
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address
) {
  const { publicClient } = await getPublicClient(currentChainId)
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
  decimal?: number
) {
  const { publicClient } = await getPublicClient(currentChainId)
  const { walletClient } = await getWalletClient(currentChainId)
  const approveAmount = typeof amount === 'bigint'
  ? amount
  : parseUnits(`${amount}`, decimal ? decimal : 18)

  const approveHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, approveAmount]
  })

  const approveReceipt = publicClient.waitForTransactionReceipt({ hash: approveHash })
  return { approveHash, approveReceipt }
}

export async function getAmountOut (
  path: Address[],
  amount: bigint | string,
  slippage: number,
  decimal?: number
) {
  const { publicClient } = await getPublicClient(currentChainId)
  const amountWei = typeof amount === 'bigint' ? amount : parseUnits(amount, decimal ? decimal : 18);

  // Check if we have a valid path with 2 addresses
  if (path.length !== 2) {
    throw new Error('Path must contain exactly 2 token addresses');
  }

  const [tokenIn, tokenOut] = path;

  // Try different fee tiers
  const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
  
  for (const fee of feeTiers) {
    try {
      console.log(`Trying fee tier: ${fee} (${fee/10000}%)`);
      
      const amountsOut: any = await publicClient.readContract({
        address: SAUCERSWAP_SWAP_ADDRESS,
        abi: SAUCERSWAP_SWAP_ABI,
        functionName: "quoteExactInputSingle",
        args: [{
          tokenIn,
          tokenOut,
          amountIn: amountWei,
          fee,
          sqrtPriceLimitX96: 0n
        }],
      });
      
      console.log(`Success with fee tier ${fee}:`, amountsOut);
      const amountOutMin = amountsOut[0] - (amountsOut[0] * BigInt(slippage * 100) / 10000n);
      return { amountsOut: [amountWei, amountsOut[0]], amountOutMin, fee }
    } catch (error) {
      console.log(`Fee tier ${fee} failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }
  
  throw new Error('All fee tiers failed. No liquidity found for this token pair.');
}

export async function swapExactTokensForTokens(
  tokenIn: Address, 
  tokenOut: Address,
  amountIn: string,
  slippage: number
) {
  // Get clients
  const { walletClient, account } = await getWalletClient(currentChainId)

  // Get decimal
  const tokenInDecimal = await getTokenDecimal(tokenIn)
  const tokenOutDecimal = await getTokenDecimal(tokenOut)

  // Config txn arguments
  const amountInWei = parseUnits(amountIn, tokenInDecimal);
  const path = [tokenIn, tokenOut];
  const to = account.address;
  const deadline = Date.now() + 60 * 10;

  // Check wallet balance
  const balance = await checkBalance(account.address, tokenIn)
  if (amountInWei > balance) {
    throw new Error("Insufficient balance")
  }

  // Check allowance
  const allowance = await checkAllowance(tokenIn, account.address, SAUCERSWAP_SWAP_ADDRESS)
  if (amountInWei > allowance) {
    console.log("Run approve token")
    const { approveHash, approveReceipt } = await approveToken(tokenIn, SAUCERSWAP_SWAP_ADDRESS, amountInWei * 100n, tokenInDecimal)
    console.log(`Approval hash: ${approveHash}\nReceipt: ${approveReceipt}`)
  }

  // Get amount out
  const { amountsOut, amountOutMin } = await getAmountOut(path, amountInWei, slippage, tokenOutDecimal)

  console.log('----- Log before swap -----')
  console.log({
    allowance: { tokenIn, amountInWei, allowance },
    amountOut: {
      amountsOut,
      amountsOutReadable: [
        formatUnits(amountsOut[0], tokenInDecimal),
        formatUnits(amountsOut[1], tokenOutDecimal)
      ]
    },
    amountOutMin: {
      amountOutMin,
      amountOutMinReadable: formatUnits(amountOutMin, tokenOutDecimal),
    },
  })

  // Send transaction
  const txnHash = await walletClient.writeContract({
    address: SAUCERSWAP_SWAP_ADDRESS,
    abi: SAUCERSWAP_SWAP_ABI,
    functionName: "exactInputSingle",
    args: [{
      tokenIn,
      tokenOut,
      fee: 3000, // Default fee tier (0.3%)
      recipient: to,
      deadline: BigInt(deadline * 1000),
      amountIn: amountInWei,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0n
    }],
  });

  // const txnReceipt = await publicClient.waitForTransactionReceipt({ hash: txnHash })

  console.log(`Swap transaction hash: ${txnHash}`);
  return txnHash
}

export async function debugQuoterContract() {
  const { publicClient } = await getPublicClient(currentChainId)
  
  try {
    // Check if contract exists by calling a simple view function
    const whbarAddress = await publicClient.readContract({
      address: SAUCERSWAP_SWAP_ADDRESS,
      abi: SAUCERSWAP_SWAP_ABI,
      functionName: "WHBAR",
    });
    
    console.log('Quoter contract WHBAR address:', whbarAddress);
    
    // Try to get factory address
    const factoryAddress = await publicClient.readContract({
      address: SAUCERSWAP_SWAP_ADDRESS,
      abi: SAUCERSWAP_SWAP_ABI,
      functionName: "factory",
    });
    
    console.log('Quoter contract factory address:', factoryAddress);
    
    return { success: true, whbarAddress, factoryAddress };
  } catch (error) {
    console.error('Error checking quoter contract:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// // Get txn info - will do this later
// async function getTxnInfo(txnHash: `0x${string}`) {
//   const { publicClient } = await getPublicClient(currentChainId)
//   const txnReceipt = await publicClient.waitForTransactionReceipt({ hash: txnHash })
// }
