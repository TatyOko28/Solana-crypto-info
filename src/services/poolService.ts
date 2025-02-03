// src/services/poolService.ts
import { PublicKey, Connection } from '@solana/web3.js';
import { struct, u8, u64, publicKey } from '@project-serum/borsh';
import { RPCService } from './rpcService';
import { TokenService } from './tokenService';
import { PoolInfo } from '../types/pool.types';
import { TokenInfo } from '../types/token.types';
import { validatePoolAddress } from '../utils/validation';
import { Cache } from '../utils/cache';
import fs from 'fs/promises';
import { RAYDIUM_V4_POOL_ABI } from '../utils/raydiumABI';

class PoolLayout {
    static POOL_STATE_LAYOUT = struct([
        u8('version'),
        u8('isInitialized'),
        u8('nonce'),
        publicKey('ammId'),
        publicKey('baseTokenMint'),
        publicKey('quoteTokenMint'),
        publicKey('lpTokenMint'),
        publicKey('baseVault'),
        publicKey('quoteVault'),
        publicKey('authority'),
        u64('openTime'),
        u64('lpSupply'),
        u64('baseReserve'),
        u64('quoteReserve'),
        u64('targetBaseReserve'),
        u64('targetQuoteReserve'),
        u64('baseDepositLimit'),
        u64('quoteDepositLimit'),
        u8('state'),
        u8('resetFlag'),
        u64('minBaseAPY'),
        u64('maxBaseAPY'),
        u64('minQuoteAPY'),
        u64('maxQuoteAPY'),
        u64('totalDepositsPending'),
        u64('totalWithdrawsPending'),
        u64('poolOpenTime')
    ]);

    static RAYDIUM_V4_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
}

export class PoolService {
    private connection: Connection;
    private tokenService: TokenService;
    private poolInfoCache: Cache<PoolInfo>;
    private tokenPairCache: Cache<{baseToken: TokenInfo; quoteToken: TokenInfo}>;

    constructor() {
        this.connection = RPCService.getInstance().getConnection();
        this.tokenService = new TokenService();
        this.poolInfoCache = new Cache<PoolInfo>(300); // 5 minutes cache
        this.tokenPairCache = new Cache(300);
    }

    public async getPoolInfo(address: string): Promise<PoolInfo> {
        try {
            console.log('Getting pool info for:', address);

            // Check cache first
            const cached = this.poolInfoCache.get(address);
            if (cached) {
                console.log('Returning cached pool info');
                return cached;
            }

            // If not in cache, fetch and cache
            const poolInfo = await this.fetchPoolInfo(address);
            this.poolInfoCache.set(address, poolInfo);
            return poolInfo;
        } catch (error) {
            console.error('Error in getPoolInfo:', error);
            throw new Error(`Failed to get pool info: ${error instanceof Error ? error.message : String(error)}`);
        }
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

            if (!this.isRaydiumV4Pool(poolAccount)) {
                throw new Error('Not a valid Raydium V4 pool');
            }

            const poolData = this.decodePoolData(poolAccount.data);
            const tokenPair = await this.fetchTokenPairInfo(poolData);

            const contractABI = JSON.stringify(RAYDIUM_V4_POOL_ABI, null, 2);

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
            throw new Error(`Failed to fetch pool info: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async fetchTokenPairInfo(poolData: any) {
        try {
            const baseTokenAddress = poolData.baseTokenMint.toString();
            const quoteTokenAddress = poolData.quoteTokenMint.toString();
            
            console.log('Fetching token pair info:');
            console.log('Base token:', baseTokenAddress);
            console.log('Quote token:', quoteTokenAddress);

            // Try to get base token info
            let baseToken;
            try {
                baseToken = await this.tokenService.getTokenInfo(baseTokenAddress);
            } catch (error) {
                console.warn('Failed to get base token info, using default values');
                baseToken = this.getDefaultTokenInfo(true);
            }

            // Try to get quote token info
            let quoteToken;
            try {
                quoteToken = await this.tokenService.getTokenInfo(quoteTokenAddress);
            } catch (error) {
                console.warn('Failed to get quote token info, using default values');
                quoteToken = this.getDefaultTokenInfo(false);
            }

            return { baseToken, quoteToken };
        } catch (error) {
            throw new Error(`Failed to get token pair info: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private getDefaultTokenInfo(isBase: boolean): TokenInfo {
        return {
            address: 'unknown',
            symbol: 'UNKNOWN',
            decimals: isBase ? 9 : 6,
            metadata: {
                name: 'Unknown Token',
                symbol: 'UNKNOWN',
                uri: '',
                description: 'Token information unavailable'
            }
        };
    }

    private decodePoolData(data: Buffer) {
        try {
            const decodedData = PoolLayout.POOL_STATE_LAYOUT.decode(data);
            console.log('Decoded pool data:', decodedData); // Pour le débogage
            return decodedData;
        } catch (error) {
            console.error('Error decoding pool data:', error);
            throw new Error(`Failed to decode pool data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async getPoolLiquidity(address: string) {
        const poolInfo = await this.getPoolInfo(address);
        try {
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
        } catch (error) {
            throw new Error(`Failed to get pool liquidity: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async getPriceRatio(address: string) {
        try {
            const liquidity = await this.getPoolLiquidity(address);
            const baseAmount = Number(liquidity.baseTokenAmount) / Math.pow(10, liquidity.baseTokenDecimals);
            const quoteAmount = Number(liquidity.quoteTokenAmount) / Math.pow(10, liquidity.quoteTokenDecimals);
            
            return {
                baseToQuote: quoteAmount / baseAmount,
                quoteToBase: baseAmount / quoteAmount
            };
        } catch (error) {
            throw new Error(`Failed to get price ratio: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private isRaydiumV4Pool(poolAccount: any): boolean {
        return poolAccount.owner.equals(PoolLayout.RAYDIUM_V4_PROGRAM_ID);
    }

    public async savePoolInfoToFile(address: string, poolInfo: PoolInfo): Promise<string> {
        try {
            const filename = `pool_info_${address}.json`;
            await fs.writeFile(
                filename,
                JSON.stringify(poolInfo, null, 2),
                'utf-8'
            );
            return filename;
        } catch (error) {
            throw new Error(`Failed to save pool info to file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async getPoolWithExtendedInfo(
        address: string, 
        options: { withLiquidity?: boolean; withPrice?: boolean } = {}
    ): Promise<PoolInfo> {
        const poolInfo = await this.getPoolInfo(address);
        const extendedInfo: PoolInfo = { ...poolInfo };

        if (options.withLiquidity) {
            try {
                extendedInfo.liquidity = await this.getPoolLiquidity(address);
            } catch (error) {
                console.warn('Failed to get liquidity info:', error);
            }
        }

        if (options.withPrice) {
            try {
                extendedInfo.price = await this.getPriceRatio(address);
            } catch (error) {
                console.warn('Failed to get price ratio:', error);
            }
        }

        return extendedInfo;
    }
}