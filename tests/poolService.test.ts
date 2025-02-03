import { PoolService } from '../src/services/poolService';
import { RPCService } from '../src/services/rpcService';
import { TokenService } from '../src/services/tokenService';
import { PublicKey } from '@solana/web3.js';
import { RAYDIUM_V4_POOL_ABI } from '../src/utils/raydiumABI';
import * as fs from 'fs';

// Pour les tests, nous utilisons des clés publiques valides.
// "11111111111111111111111111111111" est l'ID du System Program (valide et 32 caractères en Base58)
// "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" est l'ID du Token Program (valide)
const baseVaultKey = "11111111111111111111111111111111";
const quoteVaultKey = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

// Fake pool data que la méthode decodePoolData retournera
const fakePoolData = {
  baseTokenMint: new PublicKey("11111111111111111111111111111111"),
  quoteTokenMint: new PublicKey("11111111111111111111111111111111"),
  lpTokenMint: new PublicKey("11111111111111111111111111111111"),
  baseVault: new PublicKey(baseVaultKey),
  quoteVault: new PublicKey(quoteVaultKey),
  authority: new PublicKey("11111111111111111111111111111111"),
  nonce: 1,
  openTime: BigInt(1234567890),
  lpSupply: BigInt(1000000),
  lastRewardTime: BigInt(0),
  rewardPerSecond: BigInt(0)
};

// Fake token info (ce que retourne TokenService.getTokenInfo)
const fakeTokenInfo = {
  symbol: "MOCK",
  decimals: 6,
  metadata: { name: "Mock Token", symbol: "MOCK", description: "Mock metadata" }
};

// Fake pool account conforme au type AccountInfo<Buffer>
const fakePoolAccount = {
  data: Buffer.from('irrelevant'),
  owner: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
  executable: false,
  lamports: 1000000
};

// Fake pool account pour simuler un pool dont le propriétaire n'est pas celui attendu
const fakePoolAccountInvalidOwner = {
  data: Buffer.from('irrelevant'),
  owner: new PublicKey("11111111111111111111111111111111"),
  executable: false,
  lamports: 1000000
};

describe('PoolService', () => {
  let poolService: PoolService;
  let tokenService: TokenService;
  const validPoolAddress = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';

  beforeEach(() => {
    poolService = new PoolService();
    tokenService = new TokenService();

    // Remplace la méthode privée decodePoolData pour qu'elle retourne fakePoolData
    jest.spyOn<any, any>(poolService, 'decodePoolData').mockReturnValue(fakePoolData);
    // Forcer getTokenInfo de TokenService à retourner fakeTokenInfo
    jest.spyOn(tokenService, 'getTokenInfo').mockResolvedValue(fakeTokenInfo);
    // Injecter notre instance stubée de TokenService dans poolService
    (poolService as any).tokenService = tokenService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return valid pool info for a valid pool address', async () => {
    jest.spyOn(RPCService.getInstance().getConnection(), 'getAccountInfo').mockResolvedValue(fakePoolAccount);

    const poolInfo = await poolService.getPoolInfo(validPoolAddress);
    expect(poolInfo).toHaveProperty('baseTokenAddress', fakePoolData.baseTokenMint.toString());
    expect(poolInfo).toHaveProperty('quoteTokenAddress', fakePoolData.quoteTokenMint.toString());
    expect(poolInfo).toHaveProperty('lpTokenAddress', fakePoolData.lpTokenMint.toString());
    expect(poolInfo).toHaveProperty('contractABI'); // L'ABI doit provenir de RAYDIUM_V4_POOL_ABI
  });

  it('should throw error if pool not found', async () => {
    jest.spyOn(RPCService.getInstance().getConnection(), 'getAccountInfo').mockResolvedValue(null);
    await expect(poolService.getPoolInfo(validPoolAddress)).rejects.toThrow('Pool not found');
  });

  it('should throw error if not a valid Raydium V4 pool', async () => {
    jest.spyOn(RPCService.getInstance().getConnection(), 'getAccountInfo').mockResolvedValue(fakePoolAccountInvalidOwner);
    await expect(poolService.getPoolInfo(validPoolAddress)).rejects.toThrow('Not a valid Raydium V4 pool');
  });

  it('should return pool token pair info', async () => {
    jest.spyOn(RPCService.getInstance().getConnection(), 'getAccountInfo').mockResolvedValue(fakePoolAccount);
    const tokenPair = await poolService.getPoolTokenPair(validPoolAddress);
    expect(tokenPair).toHaveProperty('baseToken', fakeTokenInfo);
    expect(tokenPair).toHaveProperty('quoteToken', fakeTokenInfo);
  });

  it('should return contract ABI for a valid pool', async () => {
    jest.spyOn(RPCService.getInstance().getConnection(), 'getAccountInfo').mockResolvedValue(fakePoolAccount);
    const abi = await poolService.getContractABI(validPoolAddress);
    expect(abi).toBe(JSON.stringify(RAYDIUM_V4_POOL_ABI, null, 2));
  });

  it('should return liquidity information', async () => {
    jest.spyOn(RPCService.getInstance().getConnection(), 'getAccountInfo').mockResolvedValue(fakePoolAccount);
    const conn = RPCService.getInstance().getConnection();
    // Simuler getTokenAccountBalance en renvoyant un objet conforme (avec context)
    jest.spyOn(conn, 'getTokenAccountBalance').mockImplementation(async (pubkey: PublicKey) => {
      return {
        context: { slot: 0 },
        value: { amount: '1000', decimals: 9, uiAmount: 1 }
      };
    });
    const liquidity = await poolService.getPoolLiquidity(validPoolAddress);
    expect(liquidity).toHaveProperty('baseTokenAmount', '1000');
    expect(liquidity).toHaveProperty('quoteTokenAmount', '1000');
    expect(liquidity).toHaveProperty('baseTokenDecimals', 9);
    expect(liquidity).toHaveProperty('quoteTokenDecimals', 9);
  });

  it('should return correct price ratio', async () => {
    const conn = RPCService.getInstance().getConnection();
    // Effacer tout mock antérieur sur getTokenAccountBalance et définir une implémentation spécifique
    jest.spyOn(conn, 'getTokenAccountBalance').mockImplementation(async (pubkey: PublicKey) => {
      if (pubkey.toString() === fakePoolData.baseVault.toString()) {
        // base vault: 2000000000 avec 9 décimales => 2
        return { context: { slot: 0 }, value: { amount: '2000000000', decimals: 9, uiAmount: 2 } };
      }
      if (pubkey.toString() === fakePoolData.quoteVault.toString()) {
        // quote vault: 4000000 avec 6 décimales => 4
        return { context: { slot: 0 }, value: { amount: '4000000', decimals: 6, uiAmount: 4 } };
      }
      return { context: { slot: 0 }, value: { amount: '1000', decimals: 9, uiAmount: 1 } };
    });
    const ratio = await poolService.getPriceRatio(validPoolAddress);
    // Attendu : baseAmount = 2000000000/1e9 = 2, quoteAmount = 4000000/1e6 = 4
    // donc baseToQuote = 4/2 = 2, quoteToBase = 2/4 = 0.5
    expect(ratio).toHaveProperty('baseToQuote', 2);
    expect(ratio).toHaveProperty('quoteToBase', 0.5);
  });

  it('should save pool info to a JSON file', async () => {
    jest.spyOn(RPCService.getInstance().getConnection(), 'getAccountInfo').mockResolvedValue(fakePoolAccount);
    const poolInfo = await poolService.getPoolInfo(validPoolAddress);
    const filename = await poolService.savePoolInfoToFile(validPoolAddress, poolInfo);
    expect(filename).toBe(`pool_info_${validPoolAddress}.json`);
    expect(fs.existsSync(filename)).toBe(true);
    fs.unlinkSync(filename);
  });
});
