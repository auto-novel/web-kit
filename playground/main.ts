import { createWebKit, MyStrikeListView } from '@novelia/web-kit';
import ui from '@nuxt/ui/vue-plugin';
import { createApp, nextTick } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';

import App from './App.vue';
import { componentPages } from './componentPages';
import HomeView from './HomeView.vue';
import './style.css';

const webKit = createWebKit({
  auth: { app: 'playground', url: '/auth' },
  brand: 'Playground',
  repository: {
    url: 'https://github.com/auto-novel/auth',
    buildTime: __BUILD_TIME__,
    commitSha: __COMMIT_SHA__,
  },
});

const router = createRouter({
  history: createWebHashHistory(),
  async scrollBehavior(to, _from, savedPosition) {
    await nextTick();
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash };
    return { top: 0 };
  },
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/theme',
      name: 'theme',
      component: () => import('./ThemeView.vue'),
    },
    {
      path: '/nuxt-ui',
      name: 'nuxt-ui',
      component: () => import('./NuxtUiView.vue'),
    },
    {
      path: '/components',
      name: 'components',
      component: () => import('./ComponentsView.vue'),
    },
    ...componentPages.map(({ slug, anchor, path = '/components' }) => ({
      path: `/components/${slug}`,
      redirect: { path, hash: `#${anchor}` },
    })),
    {
      path: '/strikes',
      name: 'strikes',
      component: MyStrikeListView,
    },
  ],
});

const app = createApp(App).use(webKit).use(router).use(ui);

// Resolve the initial lazy route before mounting so scrollBehavior can find anchors.
void router.isReady().then(() => app.mount('#app'));
