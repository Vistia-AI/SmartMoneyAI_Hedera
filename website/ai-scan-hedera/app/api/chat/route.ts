import { ethers, TransactionReceipt } from 'ethers';
// app/api/analyze/route.ts
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { systemPrompt } from './systemPrompt';
import { serializeBigInts } from './helpers';
import { ChainManager } from './helpers/chainManager';
import { TokenMetadataManager } from './helpers/tokensMetadataManager';
import { TRANSFERS } from './types';
import { classifyAndExtractEvents } from './helpers/eventsProcessor';
import {
  getTokenDetailsTool as getHederaTokenDetailsTool,
  getTokenBalanceTool as getHederaTokenBalanceTool,
  getAllTokenBalancesTool as getHederaAllTokenBalancesTool,
  getTokenHoldersTool,
  getTopicInfoTool,
  getTopicMessagesTool,
  getPendingAirdropsTool
} from './tools';
import { HederaAgentKit } from 'hedera-agent-kit';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // Allow requests from any origin for development
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
  "Access-Control-Max-Age": "86400", // Cache preflight response for 24 hours
};

interface TransactionAnalysis {
  network: {
    name: string;
    chainId: number;
    currency: string;
    blockNumber: number | null;
    blockTimestamp: string;
    averageGasPrice?: string;
  };
  transaction: {
    hash: string;
    from: string;
    to: string | null;
    value: string;
    nonce: number;
    status: string;
    gasUsed: string | undefined;
    gasPrice: string;
    maxFeePerGas: string | undefined;
    maxPriorityFeePerGas: string | undefined;
    totalCost: string;
    functionSelector?: string;
  };
  actionTypes: string[];
  transfers: TRANSFERS[];
  actions: any[];
  interactions: string[];
  securityInfo: Array<{type: string; message: string}>;
  otherEvents: any[];
  summary: any;
}

// Transaction analysis
async function analyzeTransaction(txHash: string, chainId: number) {
  console.log(`Analyzing transaction: ${txHash} on chainId: ${chainId}`);
  const chainManager = ChainManager.getInstance();



  try {
    const [provider, chain] = await Promise.all([chainManager.getProvider(chainId), chainManager.getChain(chainId)])
    if (!chain) throw new Error(`Chain ${chainId} not found`);

    // For Hedera (chainId 295), try Mirror Node API first
    if (chainId === 295) {
      try {
        console.log('Using Hedera Mirror Node API as primary source...');
        const mirrorNodeResponse = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/transactions/${txHash}`);
        if (!mirrorNodeResponse.ok) {
          throw new Error('Hedera transaction not found in Mirror Node');
        }
        
        const hederaTx = await mirrorNodeResponse.json();
        if (!hederaTx || !hederaTx.transactions || hederaTx.transactions.length === 0) {
          throw new Error('Hedera transaction not found in Mirror Node');
        }

        const tx = hederaTx.transactions[0];
        const transfers = tx.transfers || [];
        
        // Convert Hedera transaction format to our analysis format
        return {
          network: {
            name: 'Hedera Mainnet',
            chainId: 295,
            currency: 'HBAR',
            blockNumber: tx.consensus_timestamp ? parseInt(tx.consensus_timestamp.split('.')[0]) : null,
            blockTimestamp: tx.consensus_timestamp || 'unknown'
          },
          transaction: {
            hash: txHash,
            from: tx.payer_account_id || 'unknown',
            to: transfers.length > 0 ? transfers[0].account : null,
            value: transfers.length > 0 ? (transfers[0].amount / 1e8).toString() : '0', // Convert tinybars to HBAR
            nonce: 0,
            status: tx.result || 'unknown',
            gasUsed: tx.charged_tx_fee ? tx.charged_tx_fee.toString() : undefined,
            gasPrice: '0',
            totalCost: tx.charged_tx_fee ? (tx.charged_tx_fee / 1e8).toString() : 'unknown'
          },
          actionTypes: ['Hedera Transaction'],
          transfers: transfers.map((transfer: any) => ({
            tokenType: 'Native',
            token: {
              symbol: 'HBAR',
              decimals: 8
            },
            from: transfer.account,
            to: transfer.account,
            value: (transfer.amount / 1e8).toString()
          })),
          actions: [],
          interactions: [],
          securityInfo: [],
          otherEvents: [],
          summary: {
            totalTransfers: transfers.length,
            uniqueTokens: 1,
            uniqueContracts: 0,
            complexityScore: 'Simple',
            riskLevel: 'Low'
          }
        };
      } catch (mirrorError) {
        console.log('Mirror Node API failed, falling back to provider...', mirrorError);

        if(txHash.length>32) {
          console.log("Greater Hash Reducing")
          txHash = txHash.substring(0,66)
          console.log(txHash)
        }
        // Fall back to provider if Mirror Node fails
        const tx = await provider.getTransaction(txHash);
        if (!tx) throw new Error('Transaction not found in provider');
        
        const [receipt, block] = await Promise.all([
          provider.getTransactionReceipt(txHash),
          provider.getBlock(tx.blockNumber!)
        ]);

        // Continue with regular analysis...
        const analysis = {
          network: {
            name: chain.name,
            chainId: chain.chainId,
            currency: chain.nativeCurrency.symbol,
            blockNumber: tx.blockNumber,
            blockTimestamp: block?.timestamp ? new Date(block.timestamp * 1000).toISOString() : 'unknown'
          },
          transaction: {
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: ethers.formatEther(tx.value),
            nonce: tx.nonce,
            status: receipt?.status ? 'Success' : 'Failed',
            gasUsed: receipt?.gasUsed?.toString(),
            gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : 'unknown',
            maxFeePerGas: tx.maxFeePerGas ? ethers.formatUnits(tx.maxFeePerGas, 'gwei') : undefined,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') : undefined,
            totalCost: receipt?.gasUsed && tx.gasPrice ? 
              ethers.formatEther(receipt.gasUsed * tx.gasPrice) : 'unknown'
          },
          actionTypes: [] as string[],
          transfers: [] as TRANSFERS[],
          actions: [] as any[],
          interactions: [] as string[],
          securityInfo: [] as any[],
          otherEvents: [] as any[],
          summary: {} as any
        };

        // Native transfer check
        if (parseFloat(ethers.formatEther(tx.value)) > 0) {
          analysis.actionTypes.push('Native Transfer');
          analysis.transfers.push({
            tokenType: 'Native',
            token: {
              symbol: chain.nativeCurrency.symbol,
              decimals: chain.nativeCurrency.decimals
            },
            from: tx.from,
            to: tx.to || 'Contract Creation',
            value: ethers.formatEther(tx.value)
          });
        }

        // check and extract events
        const extractedEvents = await classifyAndExtractEvents(receipt as TransactionReceipt, provider);

        // Add events to analysis
        analysis.actionTypes = [...analysis.actionTypes, ...extractedEvents.types]
        analysis.transfers = [...analysis.transfers, ...extractedEvents.transfers]
        analysis.actions = [...analysis.actions, ...extractedEvents.actions]
        analysis.interactions = [...analysis.interactions, ...extractedEvents.contractInteractions]
        analysis.otherEvents = [...analysis.otherEvents, ...extractedEvents.otherEvents]

        // Contract deployment check
        if (!tx.to) {
          analysis.actionTypes.push("Contract Deployment")
        }
        // Contract interaction check
        else if (tx.data !== '0x') {
          analysis.actionTypes.push('Contract Interaction');
          // Try to decode function signature
          const functionSelector = tx.data.slice(0, 10);
          (analysis.transaction as any).functionSelector = functionSelector;
        }

        // Calculate average gas price for the chain
        try {
          const latestBlock = await provider.getBlock('latest');
          const blockNumber = latestBlock?.number || 0;
          const lastFewBlocks = await Promise.all(
            Array.from({length: 5}, (_, i) => provider.getBlock(blockNumber - i))
          );
          
          const avgGasPrice = lastFewBlocks.reduce((sum, block) => {
            return sum + (block?.baseFeePerGas || 0n);
          }, 0n) / BigInt(lastFewBlocks.length);
          
          (analysis.network as any).averageGasPrice = ethers.formatUnits(avgGasPrice, 'gwei');
        } catch (error) {
          console.warn('Error getting average gas price:', error);
        }

        // Add contract verification status for interactions
        try {
          const verificationPromises = analysis.interactions.map(async (address: string) => {
          try {
            const code = await provider.getCode(address);
            if (code === '0x') {
            return {
              type: 'Warning',
              message: `Address ${address} is not a contract`
            };
            }
          } catch (error) {
            console.warn(`Error checking contract at ${address}:`, error);
          }
          return null;
          });

          const verificationResults = await Promise.all(verificationPromises);
          analysis.securityInfo.push(...verificationResults.filter(result => result !== null));
        } catch (error) {
          console.warn('Error checking contract verification:', error);
        }

        // Add complexity and risk analysis
        analysis.summary = {
          totalTransfers: analysis.transfers.length,
          uniqueTokens: new Set(analysis.transfers.map(t => t.token.address)).size,
          uniqueContracts: analysis.interactions.length,
          complexityScore: calculateComplexityScore(analysis),
          riskLevel: calculateRiskLevel(analysis),
        };

        return analysis;
      }
    } else {
      const tx = await provider.getTransaction(txHash);
      if (!tx) throw new Error('Transaction not found');

      const [receipt, block] = await Promise.all([
        provider.getTransactionReceipt(txHash),
        provider.getBlock(tx.blockNumber!)
      ]);

      const analysis = {
        network: {
          name: chain.name,
          chainId: chain.chainId,
          currency: chain.nativeCurrency.symbol,
          blockNumber: tx.blockNumber,
          blockTimestamp: block?.timestamp ? new Date(block.timestamp * 1000).toISOString() : 'unknown'
        },
        transaction: {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.formatEther(tx.value),
          nonce: tx.nonce,
          status: receipt?.status ? 'Success' : 'Failed',
          gasUsed: receipt?.gasUsed?.toString(),
          gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : 'unknown',
          maxFeePerGas: tx.maxFeePerGas ? ethers.formatUnits(tx.maxFeePerGas, 'gwei') : undefined,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') : undefined,
          totalCost: receipt?.gasUsed && tx.gasPrice ? 
            ethers.formatEther(receipt.gasUsed * tx.gasPrice) : 'unknown'
        },
        actionTypes: [] as string[],
        transfers: [] as TRANSFERS[],
        actions: [] as any[],
        interactions: [] as string[],
        securityInfo: [] as any[],
        otherEvents: [] as any[],
        summary: {} as any
      };

      // Native transfer check
      if (parseFloat(ethers.formatEther(tx.value)) > 0) {
        analysis.actionTypes.push('Native Transfer');
        analysis.transfers.push({
          tokenType: 'Native',
          token: {
            symbol: chain.nativeCurrency.symbol,
            decimals: chain.nativeCurrency.decimals
          },
          from: tx.from,
          to: tx.to || 'Contract Creation',
          value: ethers.formatEther(tx.value)
        });
      }

      // check and extract events
      const extractedEvents = await classifyAndExtractEvents(receipt as TransactionReceipt, provider);

      // Add events to analysis
      analysis.actionTypes = [...analysis.actionTypes, ...extractedEvents.types]
      analysis.transfers = [...analysis.transfers, ...extractedEvents.transfers]
      analysis.actions = [...analysis.actions, ...extractedEvents.actions]
      analysis.interactions = [...analysis.interactions, ...extractedEvents.contractInteractions]
      analysis.otherEvents = [...analysis.otherEvents, ...extractedEvents.otherEvents]

      // Contract deployment check
      if (!tx.to) {
        analysis.actionTypes.push("Contract Deployment")
      }
      // Contract interaction check
      else if (tx.data !== '0x') {
        analysis.actionTypes.push('Contract Interaction');
        // Try to decode function signature
        const functionSelector = tx.data.slice(0, 10);
        (analysis.transaction as any).functionSelector = functionSelector;
      }

      // Calculate average gas price for the chain
      try {
        const latestBlock = await provider.getBlock('latest');
        const blockNumber = latestBlock?.number || 0;
        const lastFewBlocks = await Promise.all(
          Array.from({length: 5}, (_, i) => provider.getBlock(blockNumber - i))
        );
        
        const avgGasPrice = lastFewBlocks.reduce((sum, block) => {
          return sum + (block?.baseFeePerGas || 0n);
        }, 0n) / BigInt(lastFewBlocks.length);
        
        (analysis.network as any).averageGasPrice = ethers.formatUnits(avgGasPrice, 'gwei');
      } catch (error) {
        console.warn('Error getting average gas price:', error);
      }

      // Add contract verification status for interactions
      try {
        const verificationPromises = analysis.interactions.map(async (address: string) => {
        try {
          const code = await provider.getCode(address);
          if (code === '0x') {
          return {
            type: 'Warning',
            message: `Address ${address} is not a contract`
          };
          }
        } catch (error) {
          console.warn(`Error checking contract at ${address}:`, error);
        }
        return null;
        });

        const verificationResults = await Promise.all(verificationPromises);
        analysis.securityInfo.push(...verificationResults.filter(result => result !== null));
      } catch (error) {
        console.warn('Error checking contract verification:', error);
      }

      // Add complexity and risk analysis
      analysis.summary = {
        totalTransfers: analysis.transfers.length,
        uniqueTokens: new Set(analysis.transfers.map(t => t.token.address)).size,
        uniqueContracts: analysis.interactions.length,
        complexityScore: calculateComplexityScore(analysis),
        riskLevel: calculateRiskLevel(analysis),
      };

      return analysis;
    }
  } catch (error) {
    console.error('Transaction analysis error:', error);
    throw error;
  }
}

// Helper function to calculate transaction complexity
function calculateComplexityScore(analysis: any): string {
  let score = 0;
  
  // Add points for different aspects of the transaction
  score += analysis.transfers.length * 2;
  score += analysis.interactions.length * 3;
  score += analysis.securityInfo.length * 2;
  score += analysis.actionTypes.length > 1 ? 5 : 0;
  
  // Convert score to category
  if (score <= 5) return 'Simple';
  if (score <= 15) return 'Moderate';
  if (score <= 30) return 'Complex';
  return 'Very Complex';
}

// Helper function to assess transaction risk level
function calculateRiskLevel(analysis: any): string {
  let riskFactors = 0;
  
  // Check various risk factors
  if (analysis.interactions.length > 3) riskFactors++;
  if (analysis.actionTypes.includes('Swap')) riskFactors++;
  if (analysis.securityInfo.some((e: {type: string; message: string}) => e.type === 'Warning')) riskFactors += 2;
  if (analysis.transfers.length > 5) riskFactors++;
  if (analysis.actionTypes.length > 1) riskFactors++;
  
  // Convert risk factors to level
  if (riskFactors === 0) return 'Low';
  if (riskFactors <= 2) return 'Medium';
  return 'High';
}

// Create OpenAI instance
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// API Route handler
export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages
      ],
      tools: {
        secondaryFallbackAnalyzeTx: tool({
          description: 'A fallback tool if all other tools failes to get transaction data on a chain. This helps Analyze a blockchain transaction with detailed token and NFT parsing, only to be used if all other tools failes to get transaction data on a chain',
          parameters: z.object({
            txHash: z.string().describe('The transaction hash to analyze'),
            chainId: z.number().describe('The chain ID where the transaction occurred'),
          }),
          execute: async ({ txHash, chainId }) => {
            try {
              const analysis = await analyzeTransaction(txHash, chainId);
              const serializedAnalysis = serializeBigInts(analysis);
              return {
                success: true,
                data: JSON.stringify(serializedAnalysis),
              };
            } catch (error) {
              return {
                success: false,
                error: (error as Error).message,
              };
            }
          },
        }),
        // Add Hedera tools
        getHederaTokenDetails: getHederaTokenDetailsTool,
        getHederaTokenBalance: getHederaTokenBalanceTool,
        getHederaAllTokenBalances: getHederaAllTokenBalancesTool,
        getTokenHolders: getTokenHoldersTool,
        getTopicInfo: getTopicInfoTool,
        getTopicMessages: getTopicMessagesTool,
        getPendingAirdrops: getPendingAirdropsTool,
      },
      temperature: 0.7,
      maxSteps: 10,
    });

    const response = result.toDataStreamResponse();
    const headersObject = Object.fromEntries(response.headers.entries());
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...headersObject,
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders });
}