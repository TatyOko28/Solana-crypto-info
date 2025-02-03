// src/types/token.types.ts
export interface TokenInfo {
    symbol: string;
    decimals: number;
    metadata?: TokenMetadata;
  }
  
  export interface TokenMetadata {
    name: string;
    symbol: string;
    description: string;
  }