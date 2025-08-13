'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useChat } from 'ai/react';
import { createPublicClient, http, formatEther, Chain, PublicClient, Block, Transaction, defineChain } from 'viem';
import { 
  Search, 
  Loader2, 
  XCircle, 
  RefreshCw, 
  AlertTriangle, 
  ArrowRight, 
  Blocks,
  Activity,
  Box,
  Clock,
  Hash,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { formatAssistantMessage } from '../utils/messageFormatter';
import { formatAddress } from '../utils/formatUtils';
import MermaidDiagram from './MermaidDiagram';
import DiagramModal from './DiagramModal';
import Logo from './Logo';
import DonateButton from './DonateButton';
import Link from 'next/link';

// Configure HBAR Chain
const HBARChain = defineChain({
  id: 295,
  name: 'Hedera Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: { http: ['https://mainnet.hashio.io/api'] },
    public: { http: ['https://mainnet.hashio.io/api'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.arkhia.io' },
  },
});

// Create Viem Public Client
const client = createPublicClient({
  chain: HBARChain,
  transport: http(),
});

interface BlockWithTransactions extends Block {
  transactions: Transaction[];
}

const BlockchainExplorer = () => {
  const [latestBlocks, setLatestBlocks] = useState<BlockWithTransactions[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [networkStats, setNetworkStats] = useState({
    latestBlock: 0,
    gasPrice: '0',
    pendingTxns: 0,
  });
  const [isLoadingChainData, setIsLoadingChainData] = useState(true);
  const [selectedTxHash, setSelectedTxHash] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [mermaidChart, setMermaidChart] = useState<string | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit: chatHandleSubmit, isLoading, error, reload, stop, setInput } = useChat({
    api: '/api/chat',
    initialMessages: [], 
    body: ({ messages, input }: { messages: any[]; input: string }) => ({
      messages,
      input
    }),
    onFinish: (message) => {
      console.log('Raw message content:', message.content);
      
      const mermaidMatch = message.content.match(/```mermaid\n([\s\S]*?)\n```/);
      console.log('Mermaid match:', mermaidMatch);
      
      if (mermaidMatch) {
        const diagram = mermaidMatch[1].trim();
        console.log('Extracted diagram:', diagram);
        setMermaidChart(diagram);
        setCurrentMessage(message.content.replace(/```mermaid\n[\s\S]*?\n```/, '').trim());
      } else {
        console.log('No Mermaid diagram found');
        setCurrentMessage(message.content);
        setMermaidChart(null);
      }

      const analysisSection = document.getElementById('analysis-section');
      if (analysisSection) {
        analysisSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  // Fetch latest blocks and transactions
  const fetchBlockchainData = async () => {
    try {
      setIsLoadingChainData(true);
      setIsRefreshing(true);
      
      // Get latest block number and ensure it's a bigint
      const blockNumber: bigint = await client.getBlockNumber();
      
      // Get latest blocks (increased from 5 to 10 blocks)
      const blocks = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          const block = await client.getBlock({
            blockNumber: blockNumber - BigInt(i),
            includeTransactions: true,
          });
          return block as BlockWithTransactions;
        })
      );
      
      setLatestBlocks(blocks);
      
      // Get network stats
      const gasPrice = await client.getGasPrice();
      
      setNetworkStats({
        latestBlock: Number(blockNumber),
        gasPrice: formatEther(gasPrice),
        pendingTxns: blocks[0]?.transactions?.length ?? 0,
      });
      
      // Get recent transactions from all fetched blocks
      const allTransactions = blocks.reduce((acc, block) => {
        if (block?.transactions) {
          return [...acc, ...block.transactions];
        }
        return acc;
      }, [] as Transaction[]);

      // Take the most recent 10 transactions
      const recentTxs = allTransactions.slice(0, 10);
      setRecentTransactions(recentTxs);

    } catch (error) {
      console.error('Error fetching blockchain data:', error);
    } finally {
      setIsLoadingChainData(false);
      setIsRefreshing(false);
    }
  };

  // Set up polling for updates
  useEffect(() => {
    // Initial fetch
    fetchBlockchainData();

    // Set up polling interval (every 5 seconds)
    const interval = setInterval(fetchBlockchainData, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSearchMode(true);
    setSelectedTxHash(input);
    setCurrentMessage(null);
    setMermaidChart(null); // Clear previous chart
    chatHandleSubmit(e);
  };

  const formRef = useRef<HTMLFormElement>(null);


  const handleSearch = (hash: string) => {
    console.log('handleSearch called with hash:', hash); // Debug log
    
    // First set the input value
    setInput(hash);
    
    // Then update other state
    setIsSearchMode(true);
    setSelectedTxHash(hash);
    setCurrentMessage(null);
    setMermaidChart(null);

    // Use requestAnimationFrame to ensure input value is set before submitting
    requestAnimationFrame(() => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    });
  };

  const handleBackToExplorer = () => {
    setIsSearchMode(false);
    setSelectedTxHash(null);
    setCurrentMessage(null);
    setMermaidChart(null); // Clear chart when going back
  };

  const formatValue = (value: bigint | undefined): string => {
    if (typeof value === 'undefined') return '0';
    return formatEther(value);
  };

  const handleReload = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    reload();
  };

  // Add function to handle block click
  const handleBlockClick = (block: BlockWithTransactions) => {
    // If block has transactions, show the first one
    if (block.transactions && block.transactions.length > 0) {
      handleSearch(block.transactions[0].hash);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size={48} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">VistiaScanAI</h1>
                <p className="text-sm text-gray-500">Intelligent blockchain analytics platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Chain ID: 295</span>
              </div>
              <DonateButton />
              <Link 
                href="/donate"
                className="text-green-600 hover:text-green-700 font-medium text-sm"
              >
                Donate Page
              </Link>
              {!isSearchMode && (
                <button 
                  onClick={fetchBlockchainData}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white border-b shadow-sm">
        <div  className="max-w-4xl mx-auto px-4 py-4">
          <form ref={formRef} onSubmit={handleFormSubmit} className="relative" >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Search by transaction hash or ask a question about a transaction..."
              disabled={isLoading}
              className="w-full pl-12 pr-44 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-2">
              {isSearchMode && (
                <button
                  type="button"
                  onClick={handleBackToExplorer}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Back to Explorer
                </button>
              )}
              <button 
                type="submit" 
                disabled={isLoading || !input}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-4 flex items-center justify-between p-4 bg-red-50 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">Analysis failed. Please try again.</span>
              </div>
              <button 
                onClick={handleReload}
                className="px-4 py-2 bg-white text-red-500 rounded-lg hover:bg-red-50 flex items-center gap-2 border border-red-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isSearchMode ? (
          // Analysis Section
          <div id="analysis-section" className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedTxHash ? `Analysis for ${formatAddress(selectedTxHash)}` : 'AI Analysis'}
              </h2>
              <div className="space-y-6">
                {mermaidChart && (
                  <div className="border rounded-lg p-6 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-700">Transaction Flow Diagram</h3>
                      <button
                        onClick={() => setIsDiagramModalOpen(true)}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        title="View full screen"
                      >
                        <Maximize2 className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <div className="w-full bg-white rounded-lg p-4 shadow-inner">
                      <MermaidDiagram chart={mermaidChart} />
                    </div>
                  </div>
                )}
                <div className="prose max-w-none">
                  {currentMessage && (
                    <div dangerouslySetInnerHTML={{ 
                      __html: formatAssistantMessage(currentMessage)
                    }} />
                  )}
                </div>
              </div>
              {isLoading && (
                <div className="mt-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <span className="text-gray-600">Analyzing transaction...</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Explorer View
          <>
            {/* Network Stats */}
            <div className="mb-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border">
                  <Box className="w-5 h-5 text-indigo-500" />
                  <div>
                    <div className="text-sm text-gray-500">Latest Block</div>
                    <div className="font-medium">{networkStats.latestBlock}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  <div>
                    <div className="text-sm text-gray-500">Gas Price</div>
                    <div className="font-medium">{parseFloat(networkStats.gasPrice).toFixed(9)} HBAR</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  <div>
                    <div className="text-sm text-gray-500">Pending Transactions</div>
                    <div className="font-medium">{networkStats.pendingTxns}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Latest Blocks */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Latest Blocks</h2>
                  <button
                    onClick={fetchBlockchainData}
                    className={`p-2 rounded-full transition-colors ${
                      isRefreshing ? 'bg-gray-100' : 'hover:bg-gray-100'
                    }`}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`w-5 h-5 text-gray-500 ${
                      isRefreshing ? 'animate-spin' : ''
                    }`} />
                  </button>
                </div>
                <div className="divide-y">
                  {isLoadingChainData && latestBlocks.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Loading blocks...</p>
                    </div>
                  ) : latestBlocks.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm text-gray-500">No blocks found</p>
                    </div>
                  ) : (
                    latestBlocks.map((block) => (
                      <div 
                        key={Number(block.number)} 
                        className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleBlockClick(block)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <Blocks className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                              <div className="font-medium">Block #{Number(block.number)}</div>
                              <div className="text-sm text-gray-500 space-y-1">
                                <div>{block.transactions.length} transactions</div>
                                <div className="text-xs text-gray-400">
                                  Gas Used: {formatEther(block.gasUsed || BigInt(0))} HBAR
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm text-gray-500">
                              {new Date(Number(block.timestamp) * 1000).toLocaleTimeString()}
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                  <button
                    onClick={fetchBlockchainData}
                    className={`p-2 rounded-full transition-colors ${
                      isRefreshing ? 'bg-gray-100' : 'hover:bg-gray-100'
                    }`}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`w-5 h-5 text-gray-500 ${
                      isRefreshing ? 'animate-spin' : ''
                    }`} />
                  </button>
                </div>
                <div className="divide-y">
                  {isLoadingChainData && recentTransactions.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Loading transactions...</p>
                    </div>
                  ) : recentTransactions.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm text-gray-500">No transactions found</p>
                    </div>
                  ) : (
                    recentTransactions.map((transaction) => (
                      <div 
                        key={transaction.hash} 
                        className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleSearch(transaction.hash)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Hash className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                              <div className="font-medium">{formatAddress(transaction.hash)}</div>
                              <div className="text-sm text-gray-500">
                                From: {formatAddress(transaction.from)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{parseFloat(formatValue(transaction.value)).toFixed(6)} HBAR</div>
                            <div className="text-sm text-gray-500">
                              Gas: {formatValue(transaction.gasPrice)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add the modal component */}
      <DiagramModal
        isOpen={isDiagramModalOpen}
        onClose={() => setIsDiagramModalOpen(false)}
        chart={mermaidChart || ''}
      />
    </div>
  );
};

export default BlockchainExplorer;