<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
  type StyleValue,
} from 'vue';
import { mergeClasses } from '../classes';
import { imageGroupKey, useImagePreview } from './context';
import type { XImageProps } from './types';
import XImagePreview from './XImagePreview.vue';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<XImageProps>(), { preview: true });
const emit = defineEmits<{ load: [event: Event]; error: [event: Event] }>();
const failed = ref(false);
watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
function onLoad(event: Event) {
  failed.value = false;
  emit('load', event);
}
function onError(event: Event) {
  failed.value = true;
  emit('error', event);
}
const root = useTemplateRef<HTMLElement>('root');
const group = inject(imageGroupKey, undefined);
const id = Symbol('image');
const entry = computed(() => ({
  id,
  src: props.preview === false ? '' : props.previewSrc || props.src,
  alt: props.alt ?? '',
  element: root.value,
}));
const previewable = computed(() => !!entry.value.src.trim());
const local = group
  ? undefined
  : useImagePreview(computed(() => (previewable.value ? [entry.value] : [])));
onMounted(() => group?.register(id, entry));
onBeforeUnmount(() => {
  group?.unregister(id);
  stopTracking();
});
function preview() {
  if (!previewable.value) return;
  if (group) group.open(id, root.value);
  else local?.open(id, root.value);
}
let origin: { x: number; y: number; id: number } | undefined;
let stopTracking = () => {};
const dragged = ref(false);
function pointerdown(event: PointerEvent) {
  if (event.button !== 0 || !previewable.value) return;
  stopTracking();
  const view = root.value?.ownerDocument.defaultView;
  if (!view) return;
  origin = { x: event.clientX, y: event.clientY, id: event.pointerId };
  dragged.value = false;
  view.addEventListener('pointermove', track);
  view.addEventListener('pointerup', finish);
  view.addEventListener('pointercancel', cancel);
  view.addEventListener('blur', cancel);
  stopTracking = () => {
    view.removeEventListener('pointermove', track);
    view.removeEventListener('pointerup', finish);
    view.removeEventListener('pointercancel', cancel);
    view.removeEventListener('blur', cancel);
    origin = undefined;
  };
}
function track(event: PointerEvent) {
  if (
    origin &&
    origin.id === event.pointerId &&
    Math.hypot(event.clientX - origin.x, event.clientY - origin.y) >= 5
  )
    dragged.value = true;
}
function finish(event: PointerEvent) {
  if (event.pointerId !== origin?.id) return;
  track(event);
  stopTracking();
}
function cancel(event: Event) {
  if ('pointerId' in event && event.pointerId !== origin?.id) return;
  dragged.value = true;
  stopTracking();
}
function click(event: MouseEvent) {
  if (!event.defaultPrevented && (event.detail === 0 || !dragged.value))
    preview();
}
function keydown(event: KeyboardEvent) {
  if (!previewable.value || (event.key !== 'Enter' && event.key !== ' '))
    return;
  event.preventDefault();
  preview();
}
function dimension(value?: number | string) {
  return value === undefined
    ? undefined
    : typeof value === 'number' || /^\d+(\.\d+)?$/.test(value)
      ? `${value}px`
      : value;
}
</script>

<template>
  <div
    ref="root"
    v-bind="{ ...$attrs, class: undefined, style: undefined }"
    :role="previewable ? 'button' : undefined"
    :tabindex="previewable ? 0 : undefined"
    data-drag-scroll-allow
    :aria-haspopup="previewable ? 'dialog' : undefined"
    :aria-label="previewable ? (alt ? `预览 ${alt}` : '预览图片') : undefined"
    :class="
      mergeClasses(
        'inline-block max-w-full overflow-hidden align-middle leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        previewable ? 'cursor-zoom-in' : undefined,
        ui?.root,
        $attrs.class,
      )
    "
    :style="[
      { width: dimension(width), height: dimension(height) },
      $attrs.style as StyleValue,
    ]"
    @pointerdown="pointerdown"
    @dragstart="dragged = true"
    @click="click"
    @keydown="keydown"
  >
    <img
      v-show="!failed"
      v-bind="imgAttrs"
      :src="src"
      :alt="alt ?? ''"
      :width="width"
      :height="height"
      :loading="lazy ? 'lazy' : undefined"
      :class="
        mergeClasses(
          'block h-full w-full object-contain',
          ui?.image,
          imgAttrs?.class,
        )
      "
      draggable="false"
      @load="onLoad"
      @error="onError"
    />
    <span
      v-if="failed"
      role="img"
      :aria-label="alt || '图片加载失败'"
      class="flex h-full w-full min-h-16 items-center justify-center bg-elevated px-3 py-4 text-sm leading-normal text-muted"
    >
      <slot name="error">图片加载失败</slot>
    </span>
  </div>
  <XImagePreview
    v-if="local"
    :current="local.current.value"
    :index="local.index.value"
    :count="1"
    @close="local.close"
    @move="local.move"
    @restore-focus="local.restoreFocus"
  />
</template>
