// src/services/tokenService.ts
import { PublicKey, Connection } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token';
import { RPCService } from './rpcService';
import { TokenInfo, TokenMetadata } from '../types/token.types';
import { validateTokenAddress } from '../utils/validation';
import { Cache } from '../utils/cache';
import fs from 'fs/promises';

export class TokenService {
  private connection: Connection;
  private tokenInfoCache: Cache<TokenInfo>;
  private metadataCache: Cache<TokenMetadata | null>;
  private readonly METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

  constructor() {
    this.connection = RPCService.getInstance().getConnection();
    this.tokenInfoCache = new Cache<TokenInfo>(300); // 5 minutes cache
    this.metadataCache = new Cache<TokenMetadata | null>(600); // 10 minutes cache
  }

  /**
   * Get token information including metadata if available
   * @param address Token mint address
   * @returns TokenInfo object
   */
  async getTokenInfo(address: string): Promise<TokenInfo> {
    // Check cache first
    const cached = this.tokenInfoCache.get(address);
    if (cached) return cached;

    // If not in cache, fetch and cache
    const tokenInfo = await this.fetchTokenInfo(address);
    this.tokenInfoCache.set(address, tokenInfo);
    return tokenInfo;
  }

  /**
   * Fetch token information from the blockchain
   * @param address Token mint address
   * @returns TokenInfo object
   */
  private async fetchTokenInfo(address: string): Promise<TokenInfo> {
    if (!validateTokenAddress(address)) {
      throw new Error('Invalid token address');
    }

    try {
      const tokenPublicKey = new PublicKey(address);
      const [mintInfo, metadata] = await Promise.all([
        getMint(this.connection, tokenPublicKey),
        this.getTokenMetadata(address)
      ]);

      return {
        symbol: metadata?.symbol || 'Unknown',
        decimals: mintInfo.decimals,
        metadata: metadata || undefined
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get token info: ${error.message}`);
      }
      throw new Error('Failed to get token info');
    }
  }

  /**
   * Get token metadata if available
   * @param address Token mint address
   * @returns TokenMetadata object or null if not found
   */
  async getTokenMetadata(address: string): Promise<TokenMetadata | null> {
    // Check cache first
    const cached = this.metadataCache.get(address);
    if (cached !== null) return cached;

    // If not in cache, fetch and cache
    const metadata = await this.fetchTokenMetadata(address);
    this.metadataCache.set(address, metadata);
    return metadata;
  }

  /**
   * Fetch token metadata from the blockchain
   * @param address Token mint address
   * @returns TokenMetadata object or null if not found
   */
  private async fetchTokenMetadata(address: string): Promise<TokenMetadata | null> {
    try {
      const tokenPublicKey = new PublicKey(address);
      const metadataPDA = await this.findMetadataPDA(tokenPublicKey);
      
      const accountInfo = await this.connection.getAccountInfo(metadataPDA);
      
      if (!accountInfo) {
        return null;
      }

      return this.decodeMetadata(accountInfo.data);
    } catch (error) {
      console.warn(`Failed to get token metadata: ${error}`);
      return null;
    }
  }

  /**
   * Find the PDA (Program Derived Address) for token metadata
   * @param mint Token mint address
   * @returns PublicKey of the metadata account
   */
  private async findMetadataPDA(mint: PublicKey): Promise<PublicKey> {
    const [pda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        this.METADATA_PROGRAM_ID.toBytes(),
        mint.toBytes()
      ],
      this.METADATA_PROGRAM_ID
    );
    return pda;
  }

  /**
   * Decode token metadata from buffer data
   * @param data Buffer containing metadata
   * @returns TokenMetadata object
   */
  private decodeMetadata(data: Buffer): TokenMetadata {
    try {
      const decoder = new TextDecoder();
      let offset = 0;

      // Skip discriminator (1 byte) and update authority (32 bytes)
      offset += 1 + 32;

      // Skip mint address (32 bytes)
      offset += 32;

      // Read name length and data
      const nameLength = Math.min(data.readUInt32LE(offset), data.length - offset - 4);
      offset += 4;
      const name = decoder.decode(data.slice(offset, offset + nameLength));
      offset += nameLength;

      // Read symbol length and data
      const symbolLength = Math.min(data.readUInt32LE(offset), data.length - offset - 4);
      offset += 4;
      const symbol = decoder.decode(data.slice(offset, offset + symbolLength));
      offset += symbolLength;

      // Read URI/description length and data
      const uriLength = Math.min(data.readUInt32LE(offset), data.length - offset - 4);
      offset += 4;
      const description = decoder.decode(data.slice(offset, offset + uriLength));

      return {
        name: name.replace(/\0/g, '').trim(),
        symbol: symbol.replace(/\0/g, '').trim(),
        description: description.replace(/\0/g, '').trim()
      };
    } catch (error) {
      // Return default values if decoding fails
      return {
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        description: 'Metadata decoding failed'
      };
    }
  }

  /**
   * Save token information to a JSON file
   * @param address Token mint address
   * @param tokenInfo TokenInfo object
   * @returns Filename where the data was saved
   */
  async saveTokenInfoToFile(
    address: string,
    tokenInfo: TokenInfo
  ): Promise<string> {
    const filename = `token_info_${address}.json`;
    await fs.writeFile(
      filename,
      JSON.stringify(tokenInfo, null, 2),
      'utf-8'
    );
    return filename;
  }

  /**
   * Check if a token exists
   * @param address Token mint address
   * @returns boolean indicating if token exists
   */
  async tokenExists(address: string): Promise<boolean> {
    try {
      const tokenPublicKey = new PublicKey(address);
      const mintInfo = await getMint(this.connection, tokenPublicKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get token supply
   * @param address Token mint address
   * @returns Token supply as string
   */
  async getTokenSupply(address: string): Promise<string> {
    try {
      const tokenPublicKey = new PublicKey(address);
      const mintInfo = await getMint(this.connection, tokenPublicKey);
      return mintInfo.supply.toString();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get token supply: ${error.message}`);
      }
      throw new Error('Failed to get token supply');
    }
  }
}

console.log("RPCService instance:", RPCService.getInstance());
