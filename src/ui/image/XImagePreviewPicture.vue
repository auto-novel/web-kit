<script setup lang="ts">
import { ref } from 'vue';
defineProps<{ src: string; alt: string }>();
const status = ref<'loading' | 'loaded' | 'error'>('loading');
</script>

<template>
  <p
    v-if="status === 'loading'"
    role="status"
    class="pointer-events-none absolute text-white"
  >
    加载中…
  </p>
  <p v-if="status === 'error'" role="alert" class="text-white">图片加载失败</p>
  <img
    v-show="status !== 'error'"
    :src="src"
    :alt="alt"
    class="block max-h-full max-w-full object-contain"
    draggable="false"
    @load="status = 'loaded'"
    @error="status = 'error'"
  />
</template>
