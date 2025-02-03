import { Connection } from '@solana/web3.js';
import { RateLimiter } from '../utils/rateLimiter';

export class RPCService {
  private static instance: RPCService;
  private connection: Connection;
  private rateLimiter: RateLimiter;

  private constructor() {
    const endpoint = process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(endpoint, 'confirmed');
    this.rateLimiter = new RateLimiter(10, 1000); // 10 requests per second
  }

  public static getInstance(): RPCService {
    if (!RPCService.instance) {
      RPCService.instance = new RPCService();
    }
    return RPCService.instance;
  }

  public getConnection(): Connection {
    return this.connection;
  }
}