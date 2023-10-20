import type { Config } from "@ponder/core";
import type { AbiEvent } from "abitype";
import { http } from "viem";

import OrgFundFactoryAbi from "./abis/OrgFundFactory.json" assert { type: "json" };

export const config: Config = {
  networks: [
    {
      name: "mainnet",
      chainId: 1,
      transport: http(process.env.PONDER_RPC_URL_1),
    },
  ],
  contracts: [
    // {gs
    //   name: "OrgFundFactory",
    //   network: "mainnet",
    //   abi: "./abis/OrgFundFactory.json",
    //   address: "0x10fD9348136dCea154F752fe0B6dB45Fc298A589",
    //   startBlock: 15926225,
    //   endBlock: 15983825,
    // },
    {
      name: "NdaoEntity",
      network: "mainnet",
      abi: "./abis/NdaoEntity.json",
      startBlock: 15926225,
      endBlock: 15983825,
      factory: {
        address: "0x10fD9348136dCea154F752fe0B6dB45Fc298A589",
        // this illustrates finding the event item from an existing abi
        event: OrgFundFactoryAbi.find(
          (item) => item.name === "EntityDeployed"
        ) as AbiEvent,
        // ^ because of the const import type thing
        // https://github.com/wagmi-dev/wagmi/discussions/1084
        parameter: "entity",
      },
    },
  ],
};
