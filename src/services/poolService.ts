// src/services/poolService.ts
import { PublicKey, Connection } from '@solana/web3.js';
import { struct, u8, u64, publicKey } from '@project-serum/borsh';
import { RPCService } from './rpcService';
import { TokenService } from './tokenService';
import { PoolInfo } from '../types/pool.types';
import { TokenInfo } from '../types/token.types';
import { validatePoolAddress } from '../utils/validation';
import { Cache } from '../utils/cache';
import { RAYDIUM_V4_POOL_ABI } from '../utils/raydiumABI';
import fs from 'fs/promises';

// Raydium Pool Layout structure with detailed fields
class PoolLayout {
  static POOL_STATE_LAYOUT = struct([
    publicKey('baseTokenMint'),
    publicKey('quoteTokenMint'),
    publicKey('lpTokenMint'),
    publicKey('baseVault'),
    publicKey('quoteVault'),
    publicKey('authority'),
    u8('nonce'),
    u64('openTime'),
    u64('lpSupply'),
    u64('lastRewardTime'),
    u64('rewardPerSecond')
  ]);

  static RAYDIUM_V4_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
}

export class PoolService {
  private connection: Connection;
  private tokenService: TokenService;
  private poolInfoCache: Cache<PoolInfo>;
  private tokenPairCache: Cache<{baseToken: TokenInfo; quoteToken: TokenInfo}>;
  private abiCache: Cache<string>;

  constructor() {
    this.connection = RPCService.getInstance().getConnection();
    this.tokenService = new TokenService();
    this.poolInfoCache = new Cache<PoolInfo>(300); // 5 minutes cache
    this.tokenPairCache = new Cache(300);
    this.abiCache = new Cache(3600); // 1 hour cache for ABIs
  }

  async getPoolInfo(address: string): Promise<PoolInfo> {
    // Check cache first
    const cached = this.poolInfoCache.get(address);
    if (cached) return cached;

    // If not in cache, fetch and cache
    const poolInfo = await this.fetchPoolInfo(address);
    this.poolInfoCache.set(address, poolInfo);
    return poolInfo;
  }

  private async fetchPoolInfo(address: string): Promise<PoolInfo> {
    if (!validatePoolAddress(address)) {
      throw new Error('Invalid pool address');
    }

    try {
      const poolPublicKey = new PublicKey(address);
      const poolAccount = await this.connection.getAccountInfo(poolPublicKey);

      if (!poolAccount) {
        throw new Error('Pool not found');
      }

      // Verify this is a Raydium V4 pool
      if (!this.isRaydiumV4Pool(poolAccount)) {
        throw new Error('Not a valid Raydium V4 pool');
      }

      const poolData = this.decodePoolData(poolAccount.data);
      const tokenPair = await this.getPoolTokenPair(address);
      const contractABI = await this.getContractABI(address);

      return {
        ...tokenPair,
        baseTokenAddress: poolData.baseTokenMint.toString(),
        quoteTokenAddress: poolData.quoteTokenMint.toString(),
        lpTokenAddress: poolData.lpTokenMint.toString(),
        baseVault: poolData.baseVault.toString(),
        quoteVault: poolData.quoteVault.toString(),
        authority: poolData.authority.toString(),
        nonce: poolData.nonce,
        openTime: poolData.openTime.toString(),
        lpSupply: poolData.lpSupply.toString(),
        contractABI
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get pool info: ${error.message}`);
      }
      throw new Error('Failed to get pool info');
    }
  }

  async getPoolTokenPair(address: string) {
    // Check cache first
    const cached = this.tokenPairCache.get(address);
    if (cached) return cached;

    try {
      const poolPublicKey = new PublicKey(address);
      const poolAccount = await this.connection.getAccountInfo(poolPublicKey);

      if (!poolAccount) {
        throw new Error('Pool not found');
      }

      const poolData = this.decodePoolData(poolAccount.data);

      const [baseToken, quoteToken] = await Promise.all([
        this.tokenService.getTokenInfo(poolData.baseTokenMint.toString()),
        this.tokenService.getTokenInfo(poolData.quoteTokenMint.toString())
      ]);

      const result = {
        baseToken,
        quoteToken
      };

      // Cache the result
      this.tokenPairCache.set(address, result);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get pool token pair: ${error.message}`);
      }
      throw new Error('Failed to get pool token pair');
    }
  }

  private decodePoolData(data: Buffer) {
    const poolData = PoolLayout.POOL_STATE_LAYOUT.decode(data);
    
    return {
      baseTokenMint: new PublicKey(poolData.baseTokenMint),
      quoteTokenMint: new PublicKey(poolData.quoteTokenMint),
      lpTokenMint: new PublicKey(poolData.lpTokenMint),
      baseVault: new PublicKey(poolData.baseVault),
      quoteVault: new PublicKey(poolData.quoteVault),
      authority: new PublicKey(poolData.authority),
      nonce: poolData.nonce,
      openTime: poolData.openTime,
      lpSupply: poolData.lpSupply,
      lastRewardTime: poolData.lastRewardTime,
      rewardPerSecond: poolData.rewardPerSecond
    };
  }

  async getContractABI(address: string): Promise<string> {
    // Check cache first
    const cached = this.abiCache.get(address);
    if (cached) return cached;

    try {
      const poolPublicKey = new PublicKey(address);
      const poolAccount = await this.connection.getAccountInfo(poolPublicKey);

      if (!poolAccount || !this.isRaydiumV4Pool(poolAccount)) {
        throw new Error('Not a valid Raydium V4 pool');
      }

      const abi = JSON.stringify(RAYDIUM_V4_POOL_ABI, null, 2);
      this.abiCache.set(address, abi);
      return abi;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get contract ABI: ${error.message}`);
      }
      throw new Error('Failed to get contract ABI');
    }
  }

  private isRaydiumV4Pool(poolAccount: any): boolean {
    return poolAccount.owner.equals(PoolLayout.RAYDIUM_V4_PROGRAM_ID);
  }

  async savePoolInfoToFile(
    address: string,
    poolInfo: PoolInfo
  ): Promise<string> {
    const filename = `pool_info_${address}.json`;
    await fs.writeFile(
      filename,
      JSON.stringify(poolInfo, null, 2),
      'utf-8'
    );
    return filename;
  }

  // Additional helper methods

  async getPoolLiquidity(address: string) {
    const poolInfo = await this.getPoolInfo(address);
    const [baseVaultInfo, quoteVaultInfo] = await Promise.all([
      this.connection.getTokenAccountBalance(new PublicKey(poolInfo.baseVault)),
      this.connection.getTokenAccountBalance(new PublicKey(poolInfo.quoteVault))
    ]);

    return {
      baseTokenAmount: baseVaultInfo.value.amount,
      quoteTokenAmount: quoteVaultInfo.value.amount,
      baseTokenDecimals: baseVaultInfo.value.decimals,
      quoteTokenDecimals: quoteVaultInfo.value.decimals
    };
  }

  async getPriceRatio(address: string) {
    const liquidity = await this.getPoolLiquidity(address);
    const baseAmount = Number(liquidity.baseTokenAmount) / Math.pow(10, liquidity.baseTokenDecimals);
    const quoteAmount = Number(liquidity.quoteTokenAmount) / Math.pow(10, liquidity.quoteTokenDecimals);
    
    return {
      baseToQuote: quoteAmount / baseAmount,
      quoteToBase: baseAmount / quoteAmount
    };
  }
}