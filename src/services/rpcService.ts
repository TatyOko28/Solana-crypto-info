//src/services/rpcService.ts
import { Connection, Commitment, PublicKey } from '@solana/web3.js';
import { RateLimiter } from '../utils/rateLimiter';
import dotenv from 'dotenv';

dotenv.config();

export class RPCService {
    private static instance: RPCService;
    private connection: Connection;
    private rateLimiter: RateLimiter;

    // Liste des endpoints RPC publics connus pour être stables
    private readonly PUBLIC_RPC_ENDPOINTS = [
        'https://api.mainnet-beta.solana.com',
        'https://solana-mainnet.g.alchemy.com/v2/demo',
        'https://mainnet.solana-rpc.com'
    ];

    private readonly CONNECTION_CONFIG = {
        commitment: 'confirmed' as Commitment,
        confirmTransactionInitialTimeout: 60000,
        disableRetryOnRateLimit: false,
        httpHeaders: {
            'Content-Type': 'application/json',
            'User-Agent': 'solana-token-info/1.0.0'
        }
    };

    private constructor() {
        // Ajoutez plus de points de terminaison RPC fiables
        const endpoints = [
            'https://api.mainnet-beta.solana.com',
            'https://solana-api.projectserum.com',
            'https://rpc.ankr.com/solana',
            'https://ssc-dao.genesysgo.net'
        ];
        
        // Utilisez un point de terminaison aléatoire pour répartir la charge
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        
        this.connection = new Connection(endpoint, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000,
            // Ajoutez des en-têtes personnalisés si nécessaire
            httpHeaders: {
                'Content-Type': 'application/json',
            }
        });
        this.rateLimiter = new RateLimiter(5, 1000); // Plus restrictif : 5 requêtes par seconde
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

    public async fetchAccountInfo(pubkey: PublicKey): Promise<any> {
        await this.rateLimiter.acquire();
        try {
            return await this.connection.getAccountInfo(pubkey);
        } catch (error) {
            if (await this.shouldRetryWithBackup(error)) {
                await this.switchToBackupEndpoint();
                return await this.connection.getAccountInfo(pubkey);
            }
            throw error;
        }
    }

    private async shouldRetryWithBackup(error: any): Promise<boolean> {
        if (!error) return false;
        
        const errorMessage = error.toString().toLowerCase();
        return errorMessage.includes('rate limit') ||
               errorMessage.includes('forbidden') ||
               errorMessage.includes('unauthorized') ||
               errorMessage.includes('timeout');
    }

    public async switchToBackupEndpoint(): Promise<boolean> {
        const currentEndpoint = this.connection.rpcEndpoint;
        const availableEndpoints = this.PUBLIC_RPC_ENDPOINTS.filter(e => e !== currentEndpoint);

        for (const endpoint of availableEndpoints) {
            try {
                console.log(`Testing endpoint: ${endpoint}`);
                const testConnection = new Connection(endpoint, this.CONNECTION_CONFIG);
                
                // Test simple qui devrait toujours fonctionner
                await testConnection.getSlot();
                
                this.connection = testConnection;
                console.log(`Successfully switched to: ${endpoint}`);
                return true;
            } catch (error) {
                console.warn(`Failed to use endpoint ${endpoint}:`, error);
            }
        }

        console.error('All backup endpoints failed');
        return false;
    }

    public async checkHealth(): Promise<boolean> {
        try {
            await this.connection.getSlot();
            return true;
        } catch {
            return false;
        }
    }
}