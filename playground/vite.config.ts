import { htmlBootstrapPlugin } from '@novelia/web-kit/vite';
import { webKitNuxtUiOptions } from '@novelia/web-kit/nuxt-ui';
import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// web-kit 的本地调试入口：以源码方式加载 kit，改组件/CSS 立即热更新。
export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    htmlBootstrapPlugin(),
    vue(),
    // Nuxt UI 已包含 Tailwind 插件；生成目录放在包根目录以供类型检查复用。
    ui({ ...webKitNuxtUiOptions, root: `${import.meta.dirname}/..` }),
  ],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT_SHA__: JSON.stringify(''),
  },
});
