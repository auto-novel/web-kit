import { shallowReactive, shallowReadonly } from 'vue';

export interface LoadingBarTask {
  /** 结束当前任务；重复调用无效，不影响其他任务。 */
  finish(): void;
  /** 以失败状态结束当前任务；不会自动弹出通知。 */
  error(): void;
}

/** 内部工厂：状态不包含 DOM 或计时器，展示生命周期由挂载组件管理。 */
export function createLoadingBar() {
  const state = shallowReactive({ pending: 0, failed: false });

  /** 开始独立任务；并发任务全部结束后才收起，同批任一失败则整体显示失败。 */
  function start(): LoadingBarTask {
    if (state.pending === 0) state.failed = false;
    state.pending++;
    let settled = false;
    function settle(failed: boolean) {
      if (settled) return;
      settled = true;
      if (failed) state.failed = true;
      state.pending--;
    }
    return Object.freeze({
      finish: () => settle(false),
      error: () => settle(true),
    });
  }

  const api = Object.freeze({
    start,
    /** 保留原始成功值和失败原因；调用方仍需处理 rejection。 */
    promise<Value>(promise: Promise<Value>): Promise<Value> {
      const task = start();
      return promise.then(
        (value) => {
          task.finish();
          return value;
        },
        (reason: unknown) => {
          task.error();
          throw reason;
        },
      );
    },
  });

  return { state: shallowReadonly(state), api };
}

export const loadingBarManager = createLoadingBar();

/** 全局顶部加载条；需挂载 WebKitApp 或单个 XLoadingBar。 */
export const LoadingBar = loadingBarManager.api;
