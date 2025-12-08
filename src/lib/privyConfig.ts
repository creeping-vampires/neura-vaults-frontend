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
  "https://special-chaotic-shadow.hype-mainnet.quiknode.pro/57a587f805ee0af8b921820701ae8adfa798d775/evm",
  "https://falling-side-knowledge.hype-mainnet.quiknode.pro/4343317b096c30f4a761052426a49bde58fbb339/evm",
  "https://broken-sleek-wave.hype-mainnet.quiknode.pro/2fbd820d764bee7768e86104db34da48c9b8157e/evm",
  "https://quiet-sleek-scion.hype-mainnet.quiknode.pro/70b9a3f4fed3a0792c62f6709f63c36b8a494f1b/evm",
];

const PUBLIC_RPC_URL = "https://rpc.hyperliquid.xyz/evm";

export const publicClient = createPublicClient({
  chain: hyperliquid,
  transport: fallback([
    http(QUICKNODE_RPC_URLS[0], { batch: true }),
    http(PUBLIC_RPC_URL, { batch: true }),
    http(QUICKNODE_RPC_URLS[1], { batch: true }),
    http(QUICKNODE_RPC_URLS[2], { batch: true }),
    http(QUICKNODE_RPC_URLS[3], { batch: true }),
  ]),
});

export const wagmiConfig = createConfig({
  chains: [hyperliquid],
  transports: {
    [hyperliquid.id]: fallback([
      http(QUICKNODE_RPC_URLS[0], {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
      http(PUBLIC_RPC_URL, {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
      http(QUICKNODE_RPC_URLS[1], {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
      http(QUICKNODE_RPC_URLS[2], {
        batch: {
          batchSize: 10,
          wait: 50,
        },
      }),
      http(QUICKNODE_RPC_URLS[3], {
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