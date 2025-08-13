// Hedera account ID type (format: 0.0.12345)
export type AccountId = string;

// Legacy type alias for compatibility
export type Address = AccountId;

export interface OdosQuoteRequest {
  chainId: number;
  inputTokens: {
    tokenAddress: string;
    amount: string;
  }[];
  outputTokens: {
    tokenAddress: string;
    proportion: number;
  }[];
  userAddr: string;
  slippageLimitPercent: number;
  disableRFQs: boolean;
  compact: boolean;
}

export interface OdosQuoteResponse {
  pathId: string;
  expectedOutput: string;
  price: string;
  priceImpact: number;
}

export interface OdosSwapRequest {
  userAddr: string;
  pathId: string;
}

export interface OdosSwapResponse {
  transaction: {
    to: string;
    data: string;
  };
  outputTokens: {
    tokenAddress: string;
    amount: string;
  }[];
}

export interface SwapQuote {
  pathId: string;
  fromToken: Address;
  toToken: Address;
  amountIn: string;
  expectedOutput: string;
  price: string;
  priceImpact: number;
  transaction: {
    to: Address;
    data: `0x${string}`;
  };
  minOutputAmount: string;
}

export interface SwapResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WithdrawResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TransactionReceiptParams {
  hash: `0x${string}`;
  confirmations?: number;
}
