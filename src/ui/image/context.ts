import { computed, ref, watch, type ComputedRef, type InjectionKey } from 'vue';

export interface ImageEntry {
  id: symbol;
  src: string;
  alt: string;
  element: HTMLElement | null;
}

export function useImagePreview(entries: ComputedRef<ImageEntry[]>) {
  const activeId = ref<symbol>();
  let trigger: HTMLElement | null = null;
  const current = computed(() =>
    entries.value.find((item) => item.id === activeId.value),
  );
  const index = computed(() =>
    entries.value.findIndex((item) => item.id === activeId.value),
  );
  function open(id: symbol, element: HTMLElement | null) {
    trigger = element;
    activeId.value = id;
  }
  function close() {
    activeId.value = undefined;
  }
  function move(delta: number) {
    const item = entries.value[index.value + delta];
    if (current.value && item) activeId.value = item.id;
  }
  function restoreFocus(event: Event) {
    event.preventDefault();
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }
  watch(current, (item) => {
    if (!item) close();
  });
  return { current, index, open, close, move, restoreFocus };
}

export interface ImageGroupContext {
  register: (id: symbol, entry: ComputedRef<ImageEntry>) => void;
  unregister: (id: symbol) => void;
  open: (id: symbol, element: HTMLElement | null) => void;
}
export const imageGroupKey: InjectionKey<ImageGroupContext> =
  Symbol('XImageGroup');
