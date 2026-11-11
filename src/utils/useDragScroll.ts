import { useEventListener, usePreferredReducedMotion } from '@vueuse/core';
import {
  computed,
  onScopeDispose,
  readonly,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue';

export interface UseDragScrollOptions {
  /** 默认启用；可传 ref 或 getter 动态开关。 */
  enabled?: MaybeRefOrGetter<boolean>;
  /** 默认只滚动纵轴，普通 DOM 容器可选双轴。 */
  orientation?: MaybeRefOrGetter<'vertical' | 'horizontal' | 'both'>;
  /** 松开鼠标后惯性滚动，默认关闭；尊重降低动态效果偏好。 */
  inertia?: MaybeRefOrGetter<boolean>;
}

type Sample = { time: number; left: number; top: number };
const interactiveSelector =
  'a, button, input, textarea, select, label, [role="button"], [role="slider"], [role="scrollbar"], [role="combobox"], [role="listbox"], [role="option"], [role="menuitem"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [contenteditable]:not([contenteditable="false"]), [draggable="true"], [data-drag-scroll-ignore]';

/**
 * 给实际滚动元素增加鼠标按住内容拖动能力，可用于原生 div 或 UScrollArea.$el。
 * 自动绑定/清理事件，不接管触屏、滚轮或键盘滚动，也不包装滚动组件。
 */
export function useDragScroll(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: UseDragScrollOptions = {},
) {
  const element = computed(() => toValue(target));
  const view = computed(() => element.value?.ownerDocument.defaultView);
  const document = computed(() => element.value?.ownerDocument);
  const enabled = computed(() => toValue(options.enabled) ?? true);
  const orientation = computed(
    () => toValue(options.orientation) ?? 'vertical',
  );
  const inertia = computed(() => toValue(options.inertia) ?? false);
  const reducedMotion = usePreferredReducedMotion();
  const dragging = ref(false);
  let drag: {
    viewport: HTMLElement;
    pointerId: number;
    x: number;
    y: number;
    left: number;
    top: number;
    samples: Sample[];
  } | null = null;
  let savedStyle:
    | {
        viewport: HTMLElement;
        userSelect: string;
        userSelectPriority: string;
        cursor: string;
        cursorPriority: string;
      }
    | undefined;
  let suppressClick = false;
  let cancelAnimation: (() => void) | undefined;

  function stopInertia() {
    cancelAnimation?.();
    cancelAnimation = undefined;
  }

  function stopDrag() {
    if (savedStyle) {
      const {
        viewport,
        userSelect,
        userSelectPriority,
        cursor,
        cursorPriority,
      } = savedStyle;
      if (viewport.style.userSelect === 'none') {
        viewport.style.setProperty(
          'user-select',
          userSelect,
          userSelectPriority,
        );
      }
      if (viewport.style.cursor === 'grabbing') {
        viewport.style.setProperty('cursor', cursor, cursorPriority);
      }
      savedStyle = undefined;
    }
    drag = null;
    dragging.value = false;
  }

  function stop() {
    stopDrag();
    stopInertia();
    suppressClick = false;
  }

  function sample(time: number) {
    if (!drag) return;
    drag.samples.push({
      time,
      left: drag.viewport.scrollLeft,
      top: drag.viewport.scrollTop,
    });
    while (drag.samples.length > 1 && drag.samples[0]!.time < time - 100) {
      drag.samples.shift();
    }
  }

  function startInertia() {
    if (
      !drag ||
      !dragging.value ||
      !inertia.value ||
      reducedMotion.value === 'reduce'
    )
      return;
    const { viewport, samples } = drag;
    const first = samples[0]!;
    const last = samples[samples.length - 1]!;
    const elapsed = last.time - first.time;
    if (elapsed <= 0) return;
    const speed = (distance: number) =>
      Math.max(-3, Math.min(3, distance / elapsed));
    let vx =
      orientation.value === 'vertical' ? 0 : speed(last.left - first.left);
    let vy =
      orientation.value === 'horizontal' ? 0 : speed(last.top - first.top);
    if (Math.hypot(vx, vy) < 0.1) return;
    const window = viewport.ownerDocument.defaultView;
    if (!window) return;
    let previous = window.performance.now();
    let frame: number;
    cancelAnimation = () => window.cancelAnimationFrame(frame);
    const tick = (now: number) => {
      const dt = now - previous;
      previous = now;
      // 精确积分的指数衰减，使不同刷新率下的手感一致。
      const decay = Math.exp(-dt / 250);
      const distance = 250 * (1 - decay);
      const left = viewport.scrollLeft + vx * distance;
      const top = viewport.scrollTop + vy * distance;
      viewport.scrollTo({ left, top, behavior: 'instant' });
      // 每轴单独停止，兼容 RTL 的负 scrollLeft。
      vx = Math.abs(viewport.scrollLeft - left) > 1 ? 0 : vx * decay;
      vy = Math.abs(viewport.scrollTop - top) > 1 ? 0 : vy * decay;
      if (Math.hypot(vx, vy) < 0.02) return stopInertia();
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
  }

  function onPointerDown(event: PointerEvent) {
    suppressClick = false;
    if (
      !enabled.value ||
      event.defaultPrevented ||
      event.pointerType !== 'mouse' ||
      event.button !== 0 ||
      (event.target as Element | null)?.closest?.(interactiveSelector)
    )
      return;
    const viewport = element.value;
    if (!viewport) return;
    stopDrag();
    drag = {
      viewport,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
      samples: [],
    };
    sample(event.timeStamp);
  }

  useEventListener(element, 'pointerdown', onPointerDown);
  useEventListener(
    element,
    'click',
    (event: MouseEvent) => {
      if (!suppressClick || event.detail === 0) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true },
  );
  useEventListener(element, 'dragstart', (event: DragEvent) => {
    if (drag) event.preventDefault();
  });
  // 监听所属窗口，移出容器后仍可继续拖动。
  useEventListener(
    view,
    'pointermove',
    (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (!(event.buttons & 1)) return stopDrag();
      const dx = orientation.value === 'vertical' ? 0 : event.clientX - drag.x;
      const dy =
        orientation.value === 'horizontal' ? 0 : event.clientY - drag.y;
      if (!dragging.value && Math.hypot(dx, dy) < 5) return;
      if (!dragging.value) {
        const { viewport } = drag;
        viewport.ownerDocument.getSelection()?.removeAllRanges();
        savedStyle = {
          viewport,
          userSelect: viewport.style.userSelect,
          userSelectPriority: viewport.style.getPropertyPriority('user-select'),
          cursor: viewport.style.cursor,
          cursorPriority: viewport.style.getPropertyPriority('cursor'),
        };
        viewport.style.userSelect = 'none';
        viewport.style.cursor = 'grabbing';
        dragging.value = true;
      }
      suppressClick = true;
      event.preventDefault();
      drag.viewport.scrollTo({
        left: drag.left - dx,
        top: drag.top - dy,
        behavior: 'instant',
      });
      sample(event.timeStamp);
    },
    { passive: false },
  );
  useEventListener(
    view,
    ['pointerup', 'pointercancel'],
    (event: PointerEvent) => {
      if (event.pointerId !== drag?.pointerId) return;
      if (event.type === 'pointerup') {
        sample(event.timeStamp);
        startInertia();
      } else {
        suppressClick = false;
      }
      stopDrag();
    },
  );
  useEventListener(view, ['pointerdown', 'wheel', 'touchstart'], stopInertia, {
    capture: true,
    passive: true,
  });
  useEventListener(
    view,
    'keydown',
    (event: KeyboardEvent) => {
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'PageUp',
          'PageDown',
          'Home',
          'End',
          ' ',
        ].includes(event.key)
      ) {
        stopInertia();
      }
    },
    { capture: true },
  );
  useEventListener(view, 'blur', stop);
  useEventListener(document, 'visibilitychange', () => {
    if (document.value?.hidden) stop();
  });
  watch([element, enabled, orientation, inertia], stop, { flush: 'sync' });
  watch(reducedMotion, stopInertia, { flush: 'sync' });
  onScopeDispose(stop);

  return { dragging: readonly(dragging), stop };
}
