import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // Define env variables that should be available in the client
    define: {
      'import.meta.env.VITE_PRIVY_APP_ID': JSON.stringify(env.VITE_PRIVY_APP_ID),
    },
    server: {
      host: "::",
      port: 8080,
    },
    optimizeDeps: {
      include: ["@privy-io/react-auth"],
      esbuildOptions: {
        sourcemap: false,
      },
    },
    build: {
      sourcemap: false,
      minify: "esbuild",
      target: "esnext",
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks for better caching
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
            charts: ['recharts'],
            crypto: ['viem', 'wagmi', '@privy-io/react-auth', '@privy-io/wagmi'],
            animations: ['framer-motion', 'animejs'],
            utils: ['axios', 'clsx', 'tailwind-merge']
          },
          // Optimize chunk naming for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        },
      },
    },
    plugins: mode === "development" ? [react(), componentTagger()] : [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
