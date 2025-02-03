// src/types/pool.types.ts
import { TokenInfo } from './token.types';

export interface PoolInfo {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  lpTokenAddress: string;
  baseVault: string;
  quoteVault: string;
  authority: string;
  nonce: number;
  openTime: string;
  lpSupply: string;
  contractABI: string;
}