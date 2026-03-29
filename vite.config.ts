import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.QWEN_API_KEY': JSON.stringify(env.QWEN_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      commonjsOptions: {
        transformMixedEsModules: true,
      }
    },
    optimizeDeps: {
      include: ['@authing/react-ui-components']
    },
    base: './', // 确保打包后的文件使用相对路径，这样双击 index.html 也能运行（如果环境允许的话）
  };
});
