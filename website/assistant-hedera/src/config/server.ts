// Hedera-only server configuration
export const HEDERA_RPC_URL = 'https://mainnet.hashio.io/api';

export const getHederaClient = () => {
  // Return a simple client configuration for Hedera
  return {
    rpcUrl: HEDERA_RPC_URL,
    network: 'mainnet',
  };
};
