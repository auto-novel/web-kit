import { htmlBootstrapPlugin } from '../src/vite.js';
import { webKitNuxtUiOptions } from '@novelia/web-kit/nuxt-ui';
import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    htmlBootstrapPlugin(),
    vue(),
    // Nuxt UI 已包含 Tailwind 插件；生成目录放在包根目录以供类型检查复用。
    ui({
      ...webKitNuxtUiOptions,
      root: `${import.meta.dirname}/..`,
      // 仅 playground 自动导入组件；共享库和 composables 保持显式导入。
      components: {
        dirs: [],
        dts: `${import.meta.dirname}/components.d.ts`,
        // 使用包导出路径，避免类型声明绑定 pnpm 的版本化安装目录。
        importPathTransform: (path) =>
          path.replace(/^.*\/@nuxt\/ui\/dist\/runtime\//, '@nuxt/ui/runtime/'),
      },
    }),
  ],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT_SHA__: JSON.stringify(''),
  },
});
