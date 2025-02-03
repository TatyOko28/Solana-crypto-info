import { Command } from 'commander';
import { TokenService } from './services/tokenService';
import { PoolService } from './services/poolService';
import { validateTokenAddress, validatePoolAddress } from './utils/validation';
import { PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';

dotenv.config();

const program = new Command();
const tokenService = new TokenService();
const poolService = new PoolService();
const spinner = ora();

program
  .version('1.0.0')
  .description('Solana Token and Raydium Pool Information CLI Tool');

program
  .command('token <address>')
  .description('Get information about a SPL token')
  .option('-o, --output <filename>', 'Custom output filename')
  .action(async (address: string, options) => {
    try {
      if (!validateTokenAddress(address)) {
        console.error(chalk.red('Error: Invalid token address format'));
        process.exit(1);
      }

      spinner.start(chalk.blue('Fetching token information...'));
      const tokenInfo = await tokenService.getTokenInfo(address);
      const filename = options.output || `token_info_${address}.json`;
      await tokenService.saveTokenInfoToFile(address, tokenInfo);

      spinner.succeed(chalk.green('Token information retrieved successfully'));
      console.log('\nToken Information:');
      console.log(chalk.cyan('Symbol:'), tokenInfo.symbol);
      console.log(chalk.cyan('Decimals:'), tokenInfo.decimals);
      console.log(chalk.green(`\nInformation saved to: ${filename}`));
    } catch (error) {
      spinner.fail(chalk.red('Error occurred'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('pool <address>')
  .description('Get information about a Raydium pool')
  .option('-o, --output <filename>', 'Custom output filename')
  .option('--with-liquidity', 'Include current liquidity information')
  .option('--with-price', 'Include current price ratio')
  .action(async (address: string, options) => {
    try {
      if (!validatePoolAddress(address)) {
        console.error(chalk.red('Error: Invalid pool address format'));
        process.exit(1);
      }

      spinner.start(chalk.blue('Fetching pool information...'));
      const poolInfo = await poolService.getPoolWithExtendedInfo(address, {
        withLiquidity: options.withLiquidity,
        withPrice: options.withPrice
      });
      
      const filename = options.output || `pool_info_${address}.json`;
      await poolService.savePoolInfoToFile(address, poolInfo);
      spinner.succeed(chalk.green('Pool information retrieved successfully'));
      console.log(chalk.green(`\nInformation saved to: ${filename}`));
    } catch (error) {
      spinner.fail(chalk.red('Error occurred'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse(process.argv);
