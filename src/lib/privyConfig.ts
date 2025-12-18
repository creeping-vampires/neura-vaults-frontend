import { fallback, http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { createPublicClient, defineChain } from "viem";
import { explorerUrl } from "@/utils/constant";


export const hyperliquid = defineChain({
  id: 999,
  name: "Hyper EVM",
  network: "hyper evm",
  nativeCurrency: { decimals: 18, name: "HYPE", symbol: "HYPE" },
  rpcUrls: { default: { http: ["https://rpc.hyperliquid.xyz/evm"] } },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: explorerUrl,
    },
  },
});


const QUICKNODE_RPC_URLS = [
  "https://fabled-palpable-frost.hype-mainnet.quiknode.pro/84574a9f2fa13a080e64a67217155a3946894216/evm/",
];

const PUBLIC_RPC_URL = [
  "https://hyperliquid.drpc.org",
  "https://rpc.hyperliquid.xyz/evm",
  "https://rpc.hypurrscan.io",
  "https://rpc.hyperlend.finance",
  "https://hyperliquid-json-rpc.stakely.io",
  "https://hyperliquid.rpc.blxrbdn.com",
];

export const publicClient = createPublicClient({
  chain: hyperliquid,
  transport: fallback([
    http(PUBLIC_RPC_URL[0], { batch: true }),
    http(PUBLIC_RPC_URL[1], { batch: true }),
    http(PUBLIC_RPC_URL[2], { batch: true }),
    http(PUBLIC_RPC_URL[3], { batch: true }),
    http(PUBLIC_RPC_URL[4], { batch: true }),
    http(PUBLIC_RPC_URL[5], { batch: true }),
    http(QUICKNODE_RPC_URLS[0], { batch: true }),
  ]),
});

export const wagmiConfig = createConfig({
  chains: [hyperliquid],
  transports: {
    [hyperliquid.id]: fallback([
      http(PUBLIC_RPC_URL[0], {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
      http(PUBLIC_RPC_URL[1], {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
      http(PUBLIC_RPC_URL[2], {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
      http(PUBLIC_RPC_URL[3], {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
      http(PUBLIC_RPC_URL[4], {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
      http(PUBLIC_RPC_URL[5], {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
      http(QUICKNODE_RPC_URLS[0], {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
    ]),
  },
  batch: {
    multicall: {
      batchSize: 1024,
      wait: 50,
    },
  },
  pollingInterval: 12_000,
});