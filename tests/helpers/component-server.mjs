import { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';
import { createServer } from 'vite';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

export function renderWithRouter(node) {
  const app = createSSRApp({ render: () => node });
  installTestRouter(app);
  return renderToString(app);
}
import { webKitNuxtUiOptions } from '@novelia/web-kit/nuxt-ui';

export function installTestRouter(app) {
  app.use(
    createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { render: () => null } }],
    }),
  );
}

// Explicit Nuxt UI imports still need the Vite plugin's generated theme aliases.
export async function createComponentServer({ dom = false } = {}) {
  const vuePlugin = vue();
  if (dom) {
    const configure = vuePlugin.configResolved;
    vuePlugin.configResolved = function (config) {
      return configure.call(this, { ...config, isProduction: true });
    };
    // Evaluate through Vite's module runner, but compile client render functions
    // for jsdom rather than SSR-only functions that cannot be mounted.
    for (const name of ['load', 'transform']) {
      const hook = vuePlugin[name];
      const handler = typeof hook === 'function' ? hook : hook.handler;
      const wrapped = function (...args) {
        const index = name === 'load' ? 1 : 2;
        args[index] = { ...args[index], ssr: false };
        return handler.apply(this, args);
      };
      vuePlugin[name] =
        typeof hook === 'function' ? wrapped : { ...hook, handler: wrapped };
    }
  }
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const server = await createServer({
    configFile: false,
    root,
    logLevel: 'error',
    plugins: [vuePlugin, ui({ ...webKitNuxtUiOptions, root })],
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
  });
  after(() => server.close());
  return server;
}
