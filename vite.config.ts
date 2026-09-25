import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { aiProxy, devApi } from './server/devApi.ts';

export default defineConfig(({ mode }) => {
  // Prefixo '' = lê TODAS as variáveis do .env.local, mas só aqui no servidor.
  // Nada disso vai pro navegador (só variáveis VITE_* iriam, e não usamos nenhuma).
  const env = loadEnv(mode, import.meta.dirname, ''); // pasta do projeto, mesmo rodando de outro lugar

  return {
    plugins: [react(), tailwindcss(), devApi(env)],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: { proxy: aiProxy(env) },
    preview: { proxy: aiProxy(env) },
  };
});
