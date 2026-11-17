<script setup lang="ts">
import {
  computed,
  provide,
  shallowReactive,
  shallowRef,
  type ComputedRef,
} from 'vue';
import { useMutationObserver } from '@vueuse/core';
import { imageGroupKey, useImagePreview, type ImageEntry } from './context';
import XImagePreview from './XImagePreview.vue';

defineOptions({ inheritAttrs: false });
const registry = shallowReactive(new Map<symbol, ComputedRef<ImageEntry>>());
const order = shallowRef<symbol[]>([]);
function synchronizeOrder() {
  const ids = [...registry.keys()].sort((a, b) => {
    const first = registry.get(a)?.value.element;
    const second = registry.get(b)?.value.element;
    if (!first || !second) return 0;
    const position = first.compareDocumentPosition(second);
    return position & 4 ? -1 : position & 2 ? 1 : 0;
  });
  if (
    ids.length !== order.value.length ||
    ids.some((id, index) => order.value[index] !== id)
  )
    order.value = ids;
}
const entries = computed(() =>
  order.value.flatMap((id) => {
    const entry = registry.get(id)?.value;
    return entry?.src.trim() ? [entry] : [];
  }),
);
const { current, index, open, close, move, restoreFocus } =
  useImagePreview(entries);
provide(imageGroupKey, {
  register(id, entry) {
    registry.set(id, entry);
    synchronizeOrder();
  },
  unregister(id) {
    registry.delete(id);
    synchronizeOrder();
  },
  open(id, element) {
    synchronizeOrder();
    open(id, element);
  },
});
// 插槽的后代可独立重排；仅预览打开时观察 DOM，及时更新序号和按钮边界。
useMutationObserver(
  computed(() => current.value?.element?.ownerDocument.body),
  synchronizeOrder,
  { childList: true, subtree: true },
);
</script>

<template>
  <slot />
  <XImagePreview
    :current="current"
    :index="index"
    :count="entries.length"
    @close="close"
    @move="move"
    @restore-focus="restoreFocus"
  />
</template>
