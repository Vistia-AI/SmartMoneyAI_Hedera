// Hedera-only chain configuration
export const HEDERA_MAINNET = {
  id: 295,
  name: 'Hedera Mainnet',
  network: 'hedera',
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
    default: { name: 'HashScan', url: 'https://hashscan.io' },
  },
};

export const HEDERA_TESTNET = {
  id: 296,
  name: 'Hedera Testnet',
  network: 'hedera-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: { http: ['https://testnet.hashio.io/api'] },
    public: { http: ['https://testnet.hashio.io/api'] },
  },
  blockExplorers: {
    default: { name: 'HashScan Testnet', url: 'https://testnet.hashscan.io' },
  },
};

export const RPC_URLS: { [chainId: number]: string } = {
  295: 'https://mainnet.hashio.io/api',
  296: 'https://testnet.hashio.io/api',
};

const MANY_RPC_URLS: { [chainId: number]: string[]} = {
  295: [
    'https://mainnet.hashio.io/api',
    'https://hedera.linkpool.pro',
  ],
  296: ['https://testnet.hashio.io/api'],
};

export const chainConfig: { [key: number]: any } = {
  295: HEDERA_MAINNET,
  296: HEDERA_TESTNET,
};

// Default to Hedera mainnet
export const chainId = 295;

export const getHealthyRpc: any = async (chainId: number): Promise<string> => {
  const allRpc = MANY_RPC_URLS[chainId];
  
  if (!allRpc) {
    throw new Error(`No RPC endpoints configured for chain ${chainId}`);
  }

  // For now, just return the first RPC URL
  // In production, you might want to implement health checks
  return allRpc[0];
};
