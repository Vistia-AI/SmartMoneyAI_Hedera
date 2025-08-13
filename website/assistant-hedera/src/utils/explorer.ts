// Hedera explorer configuration
export const EXPLORERS = {
  295: { url: 'https://hashscan.io', name: 'HashScan' },
  296: { url: 'https://testnet.hashscan.io', name: 'HashScan Testnet' },
} as const;

export const getExplorerUrl = (chainId: number, hash: string) => {
  const explorer = EXPLORERS[chainId as keyof typeof EXPLORERS];
  if (!explorer) {
    return `https://hashscan.io/transaction/${hash}`;
  }
  return `${explorer.url}/transaction/${hash}`;
};

export const getExplorerInfo = (chainId: number) => {
  const explorer = EXPLORERS[chainId as keyof typeof EXPLORERS];
  if (!explorer) {
    return { url: 'https://hashscan.io', name: 'HashScan' };
  }
  return explorer;
};
