// src/index.ts
import { Command } from 'commander';
import { TokenService } from './services/tokenService';
import { PoolService } from './services/poolService';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();
const tokenService = new TokenService();
const poolService = new PoolService();

program
  .version('1.0.0')
  .description('Solana Token and Raydium Pool Information CLI Tool');

program
  .command('token <address>')
  .description('Get information about a SPL token')
  .action(async (address: string) => {
    try {
      console.log(`Fetching information for token: ${address}`);
      
      const tokenInfo = await tokenService.getTokenInfo(address);
      const filename = await tokenService.saveTokenInfoToFile(address, tokenInfo);
      
      console.log('\nToken Information:');
      console.log(JSON.stringify(tokenInfo, null, 2));
      console.log(`\nInformation saved to: ${filename}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('pool <address>')
  .description('Get information about a Raydium pool')
  .action(async (address: string) => {
    try {
      console.log(`Fetching information for pool: ${address}`);
      
      const poolInfo = await poolService.getPoolInfo(address);
      const filename = await poolService.savePoolInfoToFile(address, poolInfo);
      
      console.log('\nPool Information:');
      console.log(JSON.stringify(poolInfo, null, 2));
      console.log(`\nInformation saved to: ${filename}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Add help command
program
  .command('help')
  .description('Display help information')
  .action(() => {
    program.outputHelp();
  });

// Error on invalid commands
program
  .on('command:*', () => {
    console.error('Invalid command\n');
    program.outputHelp();
    process.exit(1);
  });

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}