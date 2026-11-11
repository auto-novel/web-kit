<script setup lang="ts">
import UApp from '@nuxt/ui/components/App.vue';
import { zh_cn } from '@nuxt/ui/locale';
import { RouterView } from 'vue-router';

import XToaster from '../ui/toast/XToaster.vue';
import XLoadingBar from '../ui/loading-bar/XLoadingBar.vue';

defineOptions({ inheritAttrs: false });
</script>

<template>
  <UApp :locale="zh_cn" :toaster="{ position: 'top-center' }">
    <slot>
      <RouterView />
    </slot>
    <XToaster />
    <XLoadingBar />
  </UApp>
</template>
