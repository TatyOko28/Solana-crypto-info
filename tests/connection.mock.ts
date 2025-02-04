import { PublicKey } from '@solana/web3.js';

export const mockConnection = {
  getMint: jest.fn().mockResolvedValue({
    address: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    mintAuthority: null,
    supply: BigInt('18446744073709551615'),
    decimals: 6,
    isInitialized: true,
    freezeAuthority: null
  }),

  getAccountInfo: jest.fn().mockResolvedValue({
    data: Buffer.from([
      1, // key
      ...Array(32).fill(0), // update authority
      ...Array(32).fill(0), // mint
      // name
      4, 0, 0, 0, // length = 4
      85, 83, 68, 67, // "USDC"
      // symbol
      4, 0, 0, 0, // length = 4
      85, 83, 68, 67, // "USDC"
      // uri
      5, 0, 0, 0, // length = 5
      104, 116, 116, 112, 115 // "https"
    ]),
    executable: false,
    lamports: 1000000,
    owner: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    rentEpoch: 0
  }),

  getTokenAccountBalance: jest.fn().mockResolvedValue({
    value: {
      amount: '1000000000',
      decimals: 6,
      uiAmount: 1000
    }
  })
};
