import { onBeforeUnmount, onMounted, shallowReactive, watch } from 'vue';
import { loadingBarManager } from './manager';

/** 仅在客户端挂载后运行计时器；卸载不会结束调用方拥有的任务。 */
export function useLoadingBar(manager = loadingBarManager) {
  const view = shallowReactive({
    rendered: false,
    visible: false,
    progress: 0,
    status: 'loading' as 'loading' | 'success' | 'error',
    cycle: 0,
  });
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let shownAt = 0;

  function later(action: () => void, delay: number) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      action();
    }, delay);
    timers.add(timer);
  }
  function clearTimers() {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  }
  function advance() {
    // 这不是实际百分比：任务结束前始终不超过 95%。
    view.progress += (95 - view.progress) / 2;
    later(advance, 4000);
  }
  function show() {
    shownAt = Date.now();
    view.rendered = true;
    view.visible = true;
    view.progress = 0;
    view.status = 'loading';
    view.cycle++;
    later(() => {
      view.progress = 80;
      later(advance, 4000);
    }, 16);
  }
  function start() {
    clearTimers();
    // 收尾期间有新任务，直接开始新一轮，不让旧隐藏计时器影响它。
    if (view.rendered) show();
    else later(show, 180);
  }
  function finish() {
    if (!view.rendered) {
      clearTimers();
      return;
    }
    // 等待最短展示时长时保留初始化推进，避免刚显示就结束的任务只有完成闪现。
    later(
      () => {
        clearTimers();
        view.status = manager.state.failed ? 'error' : 'success';
        view.progress = 100;
        later(() => {
          view.visible = false;
          later(() => {
            view.rendered = false;
          }, 800);
        }, 200);
      },
      Math.max(0, 300 - (Date.now() - shownAt)),
    );
  }

  let stop: (() => void) | undefined;
  onMounted(() => {
    stop = watch(
      () => manager.state.pending > 0,
      (pending) => {
        if (pending) start();
        else finish();
      },
      { immediate: true, flush: 'sync' },
    );
  });
  onBeforeUnmount(() => {
    stop?.();
    clearTimers();
  });
  return view;
}
