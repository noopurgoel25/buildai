import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Only the public Convex site address is used here. Secrets stay server-side.
  const env = loadEnv(mode, process.cwd(), ['CONVEX_SITE_URL', 'CONVEX_URL', 'VITE_CONVEX_URL']);
  return {
    define: { 'import.meta.env.VITE_CONVEX_URL': JSON.stringify(env.VITE_CONVEX_URL || env.CONVEX_URL) },
    server: { watch: { usePolling: true }, proxy: { '/api': { target: env.CONVEX_SITE_URL, changeOrigin: true } } },
  };
});
