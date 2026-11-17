<script setup lang="ts">
import { XImageCompare } from '@novelia/web-kit';
import { ref } from 'vue';
import ImageExample from './ImageExample.vue';

const position = ref(50);
function sample(color: string, caption: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="${color}"/><circle cx="320" cy="160" r="95" fill="#fef3c7"/><path d="M0 360 210 170 410 360M230 360 480 130 640 360" fill="#064e3b"/><text x="24" y="40" fill="white" font-size="24">${caption}</text></svg>`)}`;
}
const before = sample('#0d9488', 'Before');
const after = sample('#2563eb', 'After');
</script>

<template>
  <section class="space-y-8 py-8" aria-labelledby="images-heading">
    <h2 id="images-heading" class="heading-bar text-lg font-medium">图片</h2>
    <ImageExample />
    <div id="image-compare" class="scroll-mt-20 space-y-4">
      <div class="grid items-start gap-6 md:grid-cols-2">
        <XImageCompare
          v-model="position"
          :before="before"
          :after="after"
          alt="山景示意图"
          before-label="原图"
          after-label="处理后"
          :ui="{ before: 'max-h-80' }"
        />
        <XImageCompare
          :before="before"
          :after="after"
          alt="横幅示意图"
          :aspect="3"
          class="overflow-hidden rounded-lg"
        />
      </div>
      <p class="text-xs text-muted">左侧分界线：{{ position.toFixed(1) }}%</p>
    </div>
  </section>
</template>
