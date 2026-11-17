<script setup lang="ts">
import { XImage, XImageGroup } from '@novelia/web-kit/ui';

function sample(color: string, caption: string, width = 640, height = 360) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 640 360"><rect width="640" height="360" fill="${color}"/><circle cx="480" cy="90" r="45" fill="#fef3c7"/><path d="M0 360 210 150 410 360M230 360 460 180 640 360" fill="#064e3b"/><text x="24" y="44" fill="white" font-size="24">${caption}</text></svg>`)}`;
}

const single = sample('#0d9488', 'Mountain', 960, 540);
const images = [
  { color: '#2563eb', caption: 'Morning', alt: '晨光下的山景' },
  { color: '#7c3aed', caption: 'Evening', alt: '暮色中的山景' },
  { color: '#be185d', caption: 'Sunset', alt: '落日映照的山景' },
].map(({ color, caption, alt }) => ({
  alt,
  src: sample(color, caption, 480, 270),
  previewSrc: sample(color, caption, 1920, 1080),
}));
</script>

<template>
  <div class="space-y-8">
    <div id="image" class="scroll-mt-20 space-y-4">
      <XImage
        :src="single"
        alt="阳光下的青绿色山景"
        :width="320"
        :height="180"
      />
    </div>

    <div id="image-group" class="scroll-mt-20 space-y-4">
      <div class="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <XImageGroup>
          <XImage
            v-for="image in images"
            :key="image.alt"
            :src="image.src"
            :preview-src="image.previewSrc"
            :alt="image.alt"
            width="100%"
            height="auto"
            lazy
          />
        </XImageGroup>
      </div>
    </div>
  </div>
</template>
