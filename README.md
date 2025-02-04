# Solana Token & Pool Info CLI

## Overview
A command-line tool for retrieving information about Solana SPL tokens and Raydium pools using the JSON-RPC API.

## Features
### Token Information
- Retrieve token symbol
- Get token decimals
- Fetch full token metadata
- Save token information in JSON format

### Raydium Pool Information
- Get pool token addresses (base and quote)
- Retrieve token tickers
- Fetch token decimals
- Retrieve contract ABI
- Save pool information in JSON format

## Installation
```bash
# Clone the repository
git clone [repository-url]
cd solana-token-info

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration
Create a `.env` file in the root directory:
```env
# Required: Your Solana RPC endpoint
SOLANA_RPC_ENDPOINT="https://your-rpc-endpoint.com"

# Optional: Network selection (default: mainnet-beta)
SOLANA_NETWORK="mainnet-beta"
```

## Usage

### Get Token Information
```bash
# Using npm script
npm start token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Using built binary
./dist/index.js token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```
Example output:
```json
{
  "symbol": "USDC",
  "decimals": 6,
  "metadata": {
    "name": "USD Coin",
    "symbol": "USDC",
    "description": "Stablecoin"
  }
}
```

### Get Pool Information
```bash
# Using npm script
npm start pool 58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2

# Using built binary
./dist/index.js pool 58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2
```
Example output:
```json
{
  "baseToken": {
    "symbol": "SOL",
    "decimals": 9
  },
  "quoteToken": {
    "symbol": "USDC",
    "decimals": 6
  },
  "baseTokenAddress": "So11111111111111111111111111111111111111112",
  "quoteTokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "contractABI": "..."
}
```

### Other Commands
```bash
# Check RPC health
npm start health

# Validate an address
npm start validate EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# View current configuration
npm start config
```

## Development
### Project Structure
```
solana-token-info/
├── src/
│   ├── services/
│   │   ├── tokenService.ts
│   │   ├── poolService.ts
│   │   └── rpcService.ts
│   ├── types/
│   │   ├── token.types.ts
│   │   └── pool.types.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   └── cache.ts
│   └── index.ts
├── tests/
│   ├── services/
│   │   ├── tokenService.test.ts
│   │   └── poolService.test.ts
│   └── utils/
│       └── validation.test.ts
└── package.json
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Error Handling
The tool implements comprehensive error handling for:
- Invalid addresses
- Non-existent tokens/pools
- Network errors
- RPC endpoint issues
- Rate limiting
- Invalid responses

## Performance Optimizations
### Caching
- Token information cache (5 minutes)
- Pool information cache (5 minutes)
- Metadata cache (10 minutes)

### Rate Limiting
- Implemented token bucket algorithm
- Default: 10 requests per second
- Configurable limits

## API Reference
### TokenService
- `getTokenInfo(address: string): Promise<TokenInfo>` - Returns basic token information and metadata.
- `getTokenMetadata(address: string): Promise<TokenMetadata | null>` - Returns token metadata if available.

### PoolService
- `getPoolInfo(address: string): Promise<PoolInfo>` - Returns complete pool information.
- `getPoolLiquidity(address: string)` - Returns current pool liquidity information.
- `getPriceRatio(address: string)` - Returns current price ratios.

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature-branch`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature-branch`)
5. Create a Pull Request



