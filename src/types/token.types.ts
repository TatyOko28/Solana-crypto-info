// src/types/token.types.ts
export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  description?: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  metadata?: TokenMetadata;
  supply?: string;
  mintAuthority?: string;
  freezeAuthority?: string;
}