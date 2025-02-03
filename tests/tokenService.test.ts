// tests/tokenService.test.ts
import { TokenService } from '../src/services/tokenService';
import { RPCService } from '../src/services/rpcService';
import { PublicKey } from '@solana/web3.js';

describe('TokenService', () => {
  let tokenService: TokenService;
  const validTokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC

  beforeEach(() => {
    const mockConnection = {
      getAccountInfo: jest.fn().mockResolvedValue({
        data: Buffer.from([
          0, // discriminator
          ...new Array(32).fill(0), // authority
          ...new Array(32).fill(0), // mint
          4, 0, 0, 0, // name length
          85, 83, 68, 67, // "USDC"
          4, 0, 0, 0, // symbol length
          85, 83, 68, 67, // "USDC"
          22, 0, 0, 0, // uri length
          104, 116, 116, 112, 115, 58, 47, 47, 101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109, 47, 47, 47 // "https://example.com///"
        ]),
        owner: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      }),
      getMint: jest.fn().mockResolvedValue({
        decimals: 6,
        isInitialized: true,
        mintAuthority: null,
        freezeAuthority: null,
        supply: BigInt(1000000000000)
      })
    };

    jest.spyOn(RPCService.prototype, 'getConnection').mockReturnValue(mockConnection as any);
    tokenService = new TokenService();
  });

  describe('getTokenInfo', () => {
    it('should return token info for valid token address', async () => {
      const result = await tokenService.getTokenInfo(validTokenAddress);
      
      expect(result).toHaveProperty('symbol', 'USDC');
      expect(result).toHaveProperty('decimals', 6);
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('name', 'USDC');
    });

    it('should throw error for invalid token address', async () => {
      await expect(tokenService.getTokenInfo('invalid-address'))
        .rejects
        .toThrow('Invalid token address');
    });

    it('should handle non-existent token', async () => {
      const mockConnection = RPCService.getInstance().getConnection();
      (mockConnection.getAccountInfo as jest.Mock).mockResolvedValueOnce(null);

      await expect(tokenService.getTokenInfo(new PublicKey(0).toString()))
        .rejects
        .toThrow('Token not found');
    });
  });

  describe('getTokenMetadata', () => {
    it('should return metadata for token with metadata', async () => {
      const result = await tokenService.getTokenMetadata(validTokenAddress);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('name', 'USDC');
      expect(result).toHaveProperty('symbol', 'USDC');
    });

    it('should return null for token without metadata', async () => {
      const mockConnection = RPCService.getInstance().getConnection();
      (mockConnection.getAccountInfo as jest.Mock).mockResolvedValueOnce(null);

      const result = await tokenService.getTokenMetadata(new PublicKey(0).toString());
      expect(result).toBeNull();
    });
  });

  describe('saveTokenInfoToFile', () => {
    it('should save token info to JSON file', async () => {
      const mockFs = require('fs/promises');
      mockFs.writeFile = jest.fn().mockResolvedValue(undefined);

      const tokenInfo = {
        symbol: 'USDC',
        decimals: 6,
        metadata: {
          name: 'USD Coin',
          symbol: 'USDC',
          description: 'Stablecoin'
        }
      };

      const filename = await tokenService.saveTokenInfoToFile(validTokenAddress, tokenInfo);
      
      expect(filename).toBe(`token_info_${validTokenAddress}.json`);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });
});