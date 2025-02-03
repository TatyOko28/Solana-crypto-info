// src/utils/raydiumABI.ts
export const RAYDIUM_V4_POOL_ABI = {
    version: "0.4.0",
    name: "raydium_v4_pool",
    instructions: [
      {
        name: "initialize",
        accounts: [
          {
            name: "poolState",
            isMut: true,
            isSigner: false
          },
          {
            name: "baseTokenMint",
            isMut: false,
            isSigner: false
          },
          {
            name: "quoteTokenMint",
            isMut: false,
            isSigner: false
          },
          {
            name: "lpTokenMint",
            isMut: true,
            isSigner: false
          },
          {
            name: "baseVault",
            isMut: true,
            isSigner: false
          },
          {
            name: "quoteVault",
            isMut: true,
            isSigner: false
          },
          {
            name: "authority",
            isMut: false,
            isSigner: true
          },
          {
            name: "systemProgram",
            isMut: false,
            isSigner: false
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false
          },
          {
            name: "associatedTokenProgram",
            isMut: false,
            isSigner: false
          },
          {
            name: "rent",
            isMut: false,
            isSigner: false
          }
        ],
        args: [
          {
            name: "nonce",
            type: "u8"
          },
          {
            name: "openTime",
            type: "u64"
          },
          {
            name: "initBaseAmount",
            type: "u64"
          },
          {
            name: "initQuoteAmount",
            type: "u64"
          }
        ]
      },
      {
        name: "swap",
        accounts: [
          {
            name: "poolState",
            isMut: true,
            isSigner: false
          },
          {
            name: "userSourceToken",
            isMut: true,
            isSigner: false
          },
          {
            name: "userDestinationToken",
            isMut: true,
            isSigner: false
          },
          {
            name: "sourceVault",
            isMut: true,
            isSigner: false
          },
          {
            name: "destinationVault",
            isMut: true,
            isSigner: false
          },
          {
            name: "userAuthority",
            isMut: false,
            isSigner: true
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false
          }
        ],
        args: [
          {
            name: "amountIn",
            type: "u64"
          },
          {
            name: "minimumAmountOut",
            type: "u64"
          }
        ]
      },
      {
        name: "addLiquidity",
        accounts: [
          {
            name: "poolState",
            isMut: true,
            isSigner: false
          },
          {
            name: "userBaseToken",
            isMut: true,
            isSigner: false
          },
          {
            name: "userQuoteToken",
            isMut: true,
            isSigner: false
          },
          {
            name: "userLpToken",
            isMut: true,
            isSigner: false
          },
          {
            name: "baseVault",
            isMut: true,
            isSigner: false
          },
          {
            name: "quoteVault",
            isMut: true,
            isSigner: false
          },
          {
            name: "lpTokenMint",
            isMut: true,
            isSigner: false
          },
          {
            name: "userAuthority",
            isMut: false,
            isSigner: true
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false
          }
        ],
        args: [
          {
            name: "baseAmount",
            type: "u64"
          },
          {
            name: "quoteAmount",
            type: "u64"
          },
          {
            name: "minimumLpAmount",
            type: "u64"
          }
        ]
      },
      {
        name: "removeLiquidity",
        accounts: [
          {
            name: "poolState",
            isMut: true,
            isSigner: false
          },
          {
            name: "userBaseToken",
            isMut: true,
            isSigner: false
          },
          {
            name: "userQuoteToken",
            isMut: true,
            isSigner: false
          },
          {
            name: "userLpToken",
            isMut: true,
            isSigner: false
          },
          {
            name: "baseVault",
            isMut: true,
            isSigner: false
          },
          {
            name: "quoteVault",
            isMut: true,
            isSigner: false
          },
          {
            name: "lpTokenMint",
            isMut: true,
            isSigner: false
          },
          {
            name: "userAuthority",
            isMut: false,
            isSigner: true
          },
          {
            name: "tokenProgram",
            isMut: false,
            isSigner: false
          }
        ],
        args: [
          {
            name: "lpAmount",
            type: "u64"
          },
          {
            name: "minimumBaseAmount",
            type: "u64"
          },
          {
            name: "minimumQuoteAmount",
            type: "u64"
          }
        ]
      }
    ],
    accounts: [
      {
        name: "PoolState",
        type: {
          kind: "struct",
          fields: [
            {
              name: "baseTokenMint",
              type: "publicKey"
            },
            {
              name: "quoteTokenMint",
              type: "publicKey"
            },
            {
              name: "lpTokenMint",
              type: "publicKey"
            },
            {
              name: "baseVault",
              type: "publicKey"
            },
            {
              name: "quoteVault",
              type: "publicKey"
            },
            {
              name: "authority",
              type: "publicKey"
            },
            {
              name: "nonce",
              type: "u8"
            },
            {
              name: "openTime",
              type: "u64"
            },
            {
              name: "lpSupply",
              type: "u64"
            },
            {
              name: "lastRewardTime",
              type: "u64"
            },
            {
              name: "rewardPerSecond",
              type: "u64"
            }
          ]
        }
      }
    ],
    types: [
      {
        name: "SwapDirection",
        type: {
          kind: "enum",
          variants: [
            {
              name: "BaseToQuote"
            },
            {
              name: "QuoteToBase"
            }
          ]
        }
      }
    ],
    errors: [
      {
        code: 6000,
        name: "InvalidNonce",
        msg: "Invalid nonce"
      },
      {
        code: 6001,
        name: "InvalidBaseVault",
        msg: "Invalid base token vault"
      },
      {
        code: 6002,
        name: "InvalidQuoteVault",
        msg: "Invalid quote token vault"
      },
      {
        code: 6003,
        name: "InvalidLpMint",
        msg: "Invalid LP token mint"
      },
      {
        code: 6004,
        name: "InsufficientLiquidity",
        msg: "Insufficient liquidity"
      },
      {
        code: 6005,
        name: "SlippageExceeded",
        msg: "Slippage tolerance exceeded"
      }
    ]
  };
  
  