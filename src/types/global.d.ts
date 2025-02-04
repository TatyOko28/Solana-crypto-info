declare namespace NodeJS {
    interface Global {
      MOCK_TOKEN_DATA: {
        symbol: string;
        decimals: number;
        metadata: {
          name: string;
          symbol: string;
          description: string;
        };
      };
      MOCK_POOL_DATA: {
        baseToken: typeof MOCK_TOKEN_DATA;
        quoteToken: typeof MOCK_TOKEN_DATA;
        baseTokenAddress: string;
        quoteTokenAddress: string;
        lpTokenAddress: string;
        baseVault: string;
        quoteVault: string;
        authority: string;
        nonce: number;
        openTime: string;
        lpSupply: string;
        contractABI: string;
      };
    }
  }
  