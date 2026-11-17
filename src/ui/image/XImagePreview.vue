<script setup lang="ts">
import { watch } from 'vue';
import UModal from '@nuxt/ui/components/Modal.vue';
import {
  CloseOutlined,
  FileDownloadOutlined,
  NavigateBeforeOutlined,
  NavigateNextOutlined,
} from '@vicons/material';
import XImagePreviewPicture from './XImagePreviewPicture.vue';
import type { ImageEntry } from './context';

const props = defineProps<{
  current?: ImageEntry;
  index: number;
  count: number;
}>();
const emit = defineEmits<{
  close: [];
  move: [delta: number];
  restoreFocus: [event: Event];
}>();
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  emit('move', event.key === 'ArrowLeft' ? -1 : 1);
}
let swipe: { id: number; x: number; y: number } | undefined;
let suppressClickUntil = 0;
watch(
  () => props.current?.id,
  () => {
    swipe = undefined;
  },
);
function onTouchStart(event: TouchEvent) {
  swipe = undefined;
  if (event.touches.length !== 1) {
    suppressClickUntil = Date.now() + 500;
    return;
  }
  suppressClickUntil = 0;
  if (
    props.count < 2 ||
    (event.target as Element).closest('[data-image-preview-toolbar]')
  )
    return;
  const touch = event.touches[0]!;
  swipe = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
}
function onTouchMove(event: TouchEvent) {
  if (!swipe) return;
  const touch = Array.from(event.touches).find(
    (touch) => touch.identifier === swipe?.id,
  );
  if (event.touches.length !== 1 || !touch) {
    swipe = undefined;
    suppressClickUntil = Date.now() + 500;
    return;
  }
  if (Math.hypot(touch.clientX - swipe.x, touch.clientY - swipe.y) >= 10)
    suppressClickUntil = Date.now() + 500;
}
function onTouchEnd(event: TouchEvent) {
  const start = swipe;
  swipe = undefined;
  if (suppressClickUntil) suppressClickUntil = Date.now() + 500;
  if (!start || event.touches.length || props.count < 2) return;
  const touch = Array.from(event.changedTouches).find(
    (touch) => touch.identifier === start.id,
  );
  if (!touch) return;
  const dx = touch.clientX - start.x;
  const dy = touch.clientY - start.y;
  if (Math.hypot(dx, dy) >= 10) suppressClickUntil = Date.now() + 500;
  if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
  emit('move', dx < 0 ? 1 : -1);
}
function onTouchCancel() {
  swipe = undefined;
  suppressClickUntil = Date.now() + 500;
}
function onClickCapture(event: MouseEvent) {
  if (event.detail === 0 || Date.now() >= suppressClickUntil) return;
  suppressClickUntil = 0;
  event.preventDefault();
  event.stopPropagation();
}
const buttonClass =
  'grid size-10 shrink-0 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent';
</script>

<template>
  <UModal
    :open="!!current"
    title="图片预览"
    fullscreen
    :transition="false"
    :close="false"
    :ui="{
      overlay: 'bg-black/85',
      content: 'bg-transparent shadow-none ring-0',
    }"
    :content="{
      onCloseAutoFocus: (event: Event) => emit('restoreFocus', event),
    }"
    @update:open="!$event && emit('close')"
  >
    <template #content>
      <div
        class="relative flex h-dvh w-full items-center justify-center p-12 sm:p-16"
        :style="count > 1 ? { touchAction: 'pan-y pinch-zoom' } : undefined"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
        @touchcancel.passive="onTouchCancel"
        @click.capture="onClickCapture"
        @click.self="emit('close')"
        @keydown="onKeydown"
      >
        <XImagePreviewPicture
          v-if="current"
          :key="current.src"
          :src="current.src"
          :alt="current.alt"
        />
        <div
          role="group"
          data-image-preview-toolbar
          aria-label="图片预览工具栏"
          class="absolute bottom-[max(40px,env(safe-area-inset-bottom))] left-1/2 z-10 flex h-12 -translate-x-1/2 items-center rounded-full bg-black/35 px-3 text-white/90"
        >
          <template v-if="count > 1">
            <button
              type="button"
              :class="buttonClass"
              aria-label="上一张"
              title="上一张"
              :disabled="index <= 0"
              @click="emit('move', -1)"
            >
              <NavigateBeforeOutlined class="size-7" aria-hidden="true" />
            </button>
            <span
              class="min-w-16 px-2 text-center text-sm leading-none tabular-nums select-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {{ index + 1 }} / {{ count }}
            </span>
            <button
              type="button"
              :class="buttonClass"
              aria-label="下一张"
              title="下一张"
              :disabled="index >= count - 1"
              @click="emit('move', 1)"
            >
              <NavigateNextOutlined class="size-7" aria-hidden="true" />
            </button>
            <span class="mx-2 h-4 w-px bg-white/20" aria-hidden="true" />
          </template>
          <a
            :href="current?.src"
            download
            target="_blank"
            rel="noopener noreferrer"
            :class="buttonClass"
            aria-label="下载图片"
            title="下载图片"
          >
            <FileDownloadOutlined class="size-6" aria-hidden="true" />
          </a>
          <button
            type="button"
            :class="buttonClass"
            aria-label="关闭预览"
            title="关闭预览"
            @click="emit('close')"
          >
            <CloseOutlined class="size-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>
