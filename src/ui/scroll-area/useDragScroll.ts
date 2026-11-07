import { useEventListener, usePreferredReducedMotion } from '@vueuse/core';
import { onScopeDispose, ref, watch } from 'vue';

import type { XScrollAreaProps } from './types';

type Sample = { time: number; left: number; top: number };

export function useDragScroll(props: XScrollAreaProps) {
  const dragging = ref(false);
  const reducedMotion = usePreferredReducedMotion();
  let drag: {
    viewport: HTMLElement;
    pointerId: number;
    x: number;
    y: number;
    left: number;
    top: number;
    samples: Sample[];
  } | null = null;
  let suppressClick = false;
  let cancelAnimation: (() => void) | undefined;

  function stopInertia() {
    cancelAnimation?.();
    cancelAnimation = undefined;
  }

  function stopDrag() {
    drag = null;
    dragging.value = false;
  }

  function stop() {
    stopDrag();
    stopInertia();
  }

  function sample(time: number) {
    if (!drag) return;
    drag.samples.push({
      time,
      left: drag.viewport.scrollLeft,
      top: drag.viewport.scrollTop,
    });
    while (drag.samples.length > 1 && drag.samples[0]!.time < time - 100)
      drag.samples.shift();
  }

  function startInertia() {
    if (
      !drag ||
      !dragging.value ||
      props.dragScroll !== 'inertia' ||
      reducedMotion.value === 'reduce'
    )
      return;
    const { viewport, samples } = drag;
    const first = samples[0]!;
    const last = samples[samples.length - 1]!;
    const elapsed = last.time - first.time;
    if (elapsed <= 0) return;
    // 像素/毫秒；限制异常采样产生的速度，不暴露手感参数。
    const speed = (distance: number) =>
      Math.max(-3, Math.min(3, distance / elapsed));
    let vx =
      props.orientation === 'vertical' ? 0 : speed(last.left - first.left);
    let vy =
      props.orientation === 'horizontal' ? 0 : speed(last.top - first.top);
    if (Math.hypot(vx, vy) < 0.1) return;
    const view = viewport.ownerDocument.defaultView;
    if (!view) return;
    let previous = view.performance.now();
    let frame: number;
    cancelAnimation = () => view.cancelAnimationFrame(frame);
    const tick = (now: number) => {
      const dt = now - previous;
      previous = now;
      // 指数衰减的精确积分，使不同刷新率下的位移一致；时间常数 250ms。
      const decay = Math.exp(-dt / 250);
      const distance = 250 * (1 - decay);
      const left = viewport.scrollLeft + vx * distance;
      const top = viewport.scrollTop + vy * distance;
      viewport.scrollTo({ left, top, behavior: 'instant' });
      // 每轴单独停止，兼容 RTL 的负 scrollLeft，不做边缘回弹。
      vx = Math.abs(viewport.scrollLeft - left) > 1 ? 0 : vx * decay;
      vy = Math.abs(viewport.scrollTop - top) > 1 ? 0 : vy * decay;
      if (Math.hypot(vx, vy) < 0.02) return stopInertia();
      frame = view.requestAnimationFrame(tick);
    };
    frame = view.requestAnimationFrame(tick);
  }

  function onPointerDown(event: PointerEvent) {
    suppressClick = false;
    if (
      !props.dragScroll ||
      event.defaultPrevented ||
      event.pointerType !== 'mouse' ||
      event.button !== 0 ||
      (event.target as Element).closest(
        'a, button, input, textarea, select, label, [role="button"], [contenteditable]:not([contenteditable="false"]), [draggable="true"], [data-drag-scroll-ignore]',
      )
    )
      return;

    const viewport = event.currentTarget as HTMLElement;
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

  // 在 window 上监听，鼠标移出视口后仍可继续拖动。
  useEventListener(
    'pointermove',
    (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (!(event.buttons & 1)) return stopDrag();
      const dx = props.orientation === 'vertical' ? 0 : event.clientX - drag.x;
      const dy =
        props.orientation === 'horizontal' ? 0 : event.clientY - drag.y;
      if (!dragging.value && Math.hypot(dx, dy) < 5) return;
      if (!dragging.value)
        drag.viewport.ownerDocument.getSelection()?.removeAllRanges();
      dragging.value = true;
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
  useEventListener(['pointerup', 'pointercancel'], (event: PointerEvent) => {
    if (event.pointerId !== drag?.pointerId) return;
    if (event.type === 'pointerup') {
      sample(event.timeStamp);
      startInertia();
    }
    stopDrag();
  });
  // 捕获阶段先停止旧动画，再由视口开始新拖动；不阻止任何原生输入。
  useEventListener(['pointerdown', 'wheel', 'touchstart'], stopInertia, {
    capture: true,
    passive: true,
  });
  useEventListener(
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
      )
        stopInertia();
    },
    { capture: true },
  );
  useEventListener('blur', stop);
  useEventListener(
    typeof document === 'undefined' ? undefined : document,
    'visibilitychange',
    () => {
      if (document.hidden) stop();
    },
  );
  watch(() => [props.dragScroll, props.orientation], stop, { flush: 'sync' });
  watch(reducedMotion, stopInertia, { flush: 'sync' });
  onScopeDispose(stop);

  function onClick(event: MouseEvent) {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function onDragStart(event: DragEvent) {
    if (drag) event.preventDefault();
  }

  return { dragging, onPointerDown, onClick, onDragStart };
}
