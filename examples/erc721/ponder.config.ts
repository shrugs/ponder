import type { PonderConfig } from "@ponder/core";

export const config: PonderConfig = {
  networks: [
    { name: "mainnet", chainId: 1, rpcUrl: process.env.PONDER_RPC_URL_1 },
  ],
  contracts: [
    {
      name: "Blitmap",
      network: "mainnet",
      abi: "./abis/Blitmap.json",
      address: "0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63",
      startBlock: 12439123,
    },
  ],
};
