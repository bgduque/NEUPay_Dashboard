import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_NEU_DEV_PROXY_TARGET;

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: 5173,
      host: true,
      proxy: proxyTarget
        ? {
            '/api':      { target: proxyTarget, changeOrigin: true },
            '/actuator': { target: proxyTarget, changeOrigin: true },
          }
        : undefined,
    },
    build: {
      sourcemap: mode !== 'production',
      target: 'es2022',
    },
  };
});
