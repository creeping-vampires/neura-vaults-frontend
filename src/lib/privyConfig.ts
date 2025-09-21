import { explorerUrl } from "@/utils/constant";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { createPublicClient, defineChain, http, fallback } from "viem";

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

export const privyConfig: PrivyClientConfig = {
  appearance: {
    accentColor: "#06b6d4",
    theme: "light",
    showWalletLoginFirst: true,
    logo: "https://auth.privy.io/logos/privy-logo.png",
  },
  loginMethods: ["wallet", "email", "google", "twitter"],
  embeddedWallets: {
    ethereum: {
      createOnLogin: "all-users",
    },
  },
  defaultChain: hyperliquid,
  supportedChains: [hyperliquid],
};

const QUICKNODE_RPC_URLS = [
  "https://broken-sleek-wave.hype-mainnet.quiknode.pro/2fbd820d764bee7768e86104db34da48c9b8157e/evm",
  "https://falling-side-knowledge.hype-mainnet.quiknode.pro/4343317b096c30f4a761052426a49bde58fbb339/evm",
  "https://quiet-sleek-scion.hype-mainnet.quiknode.pro/70b9a3f4fed3a0792c62f6709f63c36b8a494f1b/evm",
  "https://special-chaotic-shadow.hype-mainnet.quiknode.pro/57a587f805ee0af8b921820701ae8adfa798d775/evm",];

const PUBLIC_RPC_URL = "https://rpc.hyperliquid.xyz/evm";

export const publicClient = createPublicClient({
  chain: hyperliquid,
  transport: fallback([
    http(QUICKNODE_RPC_URLS[0], { batch: true }),
    http(PUBLIC_RPC_URL, { batch: true }),
    http(QUICKNODE_RPC_URLS[1], { batch: true }),
    http(QUICKNODE_RPC_URLS[2], { batch: true }),
    http(QUICKNODE_RPC_URLS[3], { batch: true }),
  ])
});
