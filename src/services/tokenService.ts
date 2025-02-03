// src/services/tokenService.ts
import { PublicKey, Connection } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token';
import { RPCService } from './rpcService';
import { TokenInfo, TokenMetadata } from '../types/token.types';
import { validateTokenAddress } from '../utils/validation';
import { Cache } from '../utils/cache';
import fs from 'fs/promises';

// Ajoutez cette interface pour typer la réponse de l'API
interface TokenListResponse {
    tokens: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        logoURI?: string;
        tags?: string[];
    }[];
}

export class TokenService {
    private connection: Connection;
    private tokenInfoCache: Cache<TokenInfo>;
    private metadataCache: Cache<TokenMetadata | null>;
    private readonly METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000; // 1 second

    constructor() {
        this.connection = RPCService.getInstance().getConnection();
        this.tokenInfoCache = new Cache<TokenInfo>(300); // 5 minutes cache
        this.metadataCache = new Cache<TokenMetadata | null>(600); // 10 minutes cache
    }

    public async checkHealth(): Promise<number> {
        try {
            const blockHeight = await this.connection.getBlockHeight();
            console.log('Current block height:', blockHeight);
            return blockHeight;
        } catch (error) {
            throw new Error(`Failed to check RPC health: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public async getTokenInfo(address: string): Promise<TokenInfo> {
        try {
            // Essayez d'abord de récupérer depuis l'API Token List
            const tokenListInfo = await this.getTokenFromTokenList(address);
            if (tokenListInfo) {
                return tokenListInfo;
            }
            
            // Si ce n'est pas dans la liste des tokens, essayez de le récupérer on-chain
            return await this.getTokenInfoFromChain(address);
        } catch (error) {
            console.warn(`Failed to get token info for ${address}, using default values`);
            return this.getDefaultTokenInfo(address);
        }
    }

    private getDefaultTokenInfo(address: string): TokenInfo {
        return {
            address,
            symbol: 'UNKNOWN',
            decimals: 9,
            metadata: {
                name: `Unknown Token (${address.slice(0, 8)}...)`,
                symbol: 'UNKNOWN',
                uri: '',
                description: 'Token information unavailable'
            }
        };
    }

    private async getTokenFromTokenList(address: string): Promise<TokenInfo | null> {
        try {
            const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json');
            const tokenList = await response.json() as TokenListResponse;
            
            const token = tokenList.tokens.find(t => t.address === address);
            if (!token) return null;

            return {
                address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                metadata: {
                    name: token.name,
                    symbol: token.symbol,
                    uri: token.logoURI || '',
                    description: token.tags?.join(', ') || ''
                }
            };
        } catch (error) {
            console.warn('Failed to fetch from token list:', error);
            return null;
        }
    }

    private async getTokenInfoFromChain(address: string): Promise<TokenInfo> {
        try {
            const tokenPublicKey = new PublicKey(address);
            const mintInfo = await getMint(this.connection, tokenPublicKey);
            const metadata = await this.getTokenMetadata(address);

            return {
                address,
                symbol: metadata?.symbol || 'Unknown',
                decimals: mintInfo.decimals,
                metadata: metadata || undefined,
                supply: mintInfo.supply.toString(),
                mintAuthority: mintInfo.mintAuthority?.toString(),
                freezeAuthority: mintInfo.freezeAuthority?.toString()
            };
        } catch (error) {
            throw new Error(`Failed to get token info from chain: ${error}`);
        }
    }

    private async fetchTokenInfo(address: string): Promise<TokenInfo> {
        if (!validateTokenAddress(address)) {
            throw new Error('Invalid token address');
        }

        let retries = this.MAX_RETRIES;
        while (retries > 0) {
            try {
                console.log(`Fetching token info, attempts remaining: ${retries}`);
                const tokenPublicKey = new PublicKey(address);
                const mintInfo = await getMint(this.connection, tokenPublicKey);
                const metadata = await this.getTokenMetadata(address);

                console.log('Token info retrieved successfully');
                return {
                    address,
                    symbol: metadata?.symbol || 'Unknown',
                    decimals: mintInfo.decimals,
                    metadata: metadata || undefined,
                    supply: mintInfo.supply.toString(),
                    mintAuthority: mintInfo.mintAuthority?.toString(),
                    freezeAuthority: mintInfo.freezeAuthority?.toString()
                };
            } catch (error) {
                console.error(`Attempt failed (${retries} remaining):`, error);
                retries--;

                if (retries === 0) {
                    // Try backup RPC on last attempt
                    const rpcService = RPCService.getInstance();
                    const switched = await rpcService.switchToBackupEndpoint();
                    if (switched) {
                        this.connection = rpcService.getConnection();
                        continue;
                    }
                    throw error;
                }

                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
            }
        }

        throw new Error('Failed to fetch token info after all retries');
    }

    public async getTokenMetadata(address: string): Promise<TokenMetadata | null> {
        try {
            console.log(`Getting metadata for token: ${address}`);
            
            // Check cache first
            const cached = this.metadataCache.get(address);
            if (cached !== null) {
                console.log('Returning cached metadata');
                return cached;
            }

            // If not in cache, fetch and cache
            const metadata = await this.fetchTokenMetadata(address);
            this.metadataCache.set(address, metadata);
            return metadata;
        } catch (error) {
            console.warn('Error getting metadata:', error);
            return null;
        }
    }

    private async fetchTokenMetadata(address: string): Promise<TokenMetadata | null> {
        try {
            const tokenPublicKey = new PublicKey(address);
            const metadataPDA = await this.findMetadataPDA(tokenPublicKey);
            
            console.log('Fetching account info for metadata PDA:', metadataPDA.toString());
            const accountInfo = await this.connection.getAccountInfo(metadataPDA);
            
            if (!accountInfo) {
                console.log('No metadata account found');
                return null;
            }

            return this.decodeMetadata(accountInfo.data);
        } catch (error) {
            console.warn(`Failed to fetch token metadata: ${error}`);
            return null;
        }
    }

    private async findMetadataPDA(mint: PublicKey): Promise<PublicKey> {
        try {
            const [pda] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('metadata'),
                    this.METADATA_PROGRAM_ID.toBytes(),
                    mint.toBytes()
                ],
                this.METADATA_PROGRAM_ID
            );
            return pda;
        } catch (error) {
            throw new Error(`Failed to find metadata PDA: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private decodeMetadata(data: Buffer): TokenMetadata {
        try {
            const decoder = new TextDecoder();
            let offset = 1 + 32 + 32; // Skip key(1) + update authority(32) + mint(32)

            // Read lengths first to validate buffer size
            if (offset + 12 > data.length) {
                throw new Error('Buffer too small for metadata');
            }

            // Read name
            const nameLength = data.readUInt32LE(offset);
            offset += 4;
            if (offset + nameLength > data.length) {
                throw new Error('Invalid name length');
            }
            const name = decoder.decode(data.slice(offset, offset + nameLength)).replace(/\0/g, '');
            offset += nameLength;

            // Read symbol
            const symbolLength = data.readUInt32LE(offset);
            offset += 4;
            if (offset + symbolLength > data.length) {
                throw new Error('Invalid symbol length');
            }
            const symbol = decoder.decode(data.slice(offset, offset + symbolLength)).replace(/\0/g, '');
            offset += symbolLength;

            // Read URI
            const uriLength = data.readUInt32LE(offset);
            offset += 4;
            if (offset + uriLength > data.length) {
                throw new Error('Invalid uri length');
            }
            const uri = decoder.decode(data.slice(offset, offset + uriLength)).replace(/\0/g, '');

            return {
                name: name.trim(),
                symbol: symbol.trim(),
                uri: uri.trim(),
                description: uri.trim() // Using URI as description for now
            };
        } catch (error) {
            console.warn('Error decoding metadata:', error);
            return {
                name: 'Unknown Token',
                symbol: 'UNKNOWN',
                uri: '',
                description: 'Metadata decoding failed'
            };
        }
    }

    public async saveTokenInfoToFile(address: string, tokenInfo: TokenInfo): Promise<string> {
        try {
            const filename = `token_info_${address}.json`;
            await fs.writeFile(
                filename,
                JSON.stringify(tokenInfo, null, 2),
                'utf-8'
            );
            console.log(`Token info saved to ${filename}`);
            return filename;
        } catch (error) {
            throw new Error(`Failed to save token info to file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async tokenExists(address: string): Promise<boolean> {
        try {
            await this.getTokenInfo(address);
            return true;
        } catch {
            return false;
        }
    }
}