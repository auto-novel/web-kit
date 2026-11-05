import { createToastManager } from 'reka-ui';

export type ToastId = string;
export type ToastStatus = 'loading' | 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  /** 自定义 ID；重复添加同一条打开的消息会更新内容并重新计时。 */
  id?: ToastId;
  /** 自动关闭时间（毫秒），默认 4000；0 或 Infinity 表示不自动关闭。 */
  duration?: number;
  /** 消息关闭时触发（包括自动关闭和手动关闭）。 */
  onClose?: () => void;
  /** 消息退出动画结束、从列表移除时触发。 */
  onRemove?: () => void;
}

export interface ToastUpdateOptions extends Omit<ToastOptions, 'id'> {
  message?: string;
  status?: ToastStatus;
}

export interface ToastMessage extends Omit<ToastOptions, 'id'> {
  message: string;
}

export interface ToastPromiseMessages<Value = unknown> {
  loading?: string | ToastMessage;
  /** 完整文案，或根据成功值同步生成文案及阶段选项。 */
  success?: string | ToastMessage | ((value: Value) => string | ToastMessage);
  /** 完整文案，或根据原始失败原因同步生成文案；不会隐式提取 API 错误详情。 */
  error?: string | ToastMessage | ((reason: unknown) => string | ToastMessage);
}

export const toastManager = createToastManager();

function add(
  status: ToastStatus,
  message: string,
  options: ToastOptions = {},
): ToastId {
  return toastManager.add({ ...options, status, description: message });
}

function resolveMessage(message: string | ToastMessage): ToastMessage {
  return typeof message === 'string' ? { message } : message;
}

/** 通知只是副作用，不能覆盖原始操作的成功值或失败原因。 */
function notifyPromise(action: () => void): void {
  try {
    action();
  } catch (error) {
    try {
      console.error('[Toast.promise] 通知更新失败', error);
    } catch {
      // 即使错误报告失败，也必须保留原始 Promise 的结果。
    }
  }
}

export const Toast = {
  /** 展示操作进度，成功透传原值，失败透传原始 rejection；调用方负责处理失败。 */
  promise<Value>(
    promise: Promise<Value>,
    messages: ToastPromiseMessages<Value> = {},
    options: ToastOptions = {},
  ): Promise<Value> {
    let id: ToastId | undefined;
    notifyPromise(() => {
      if (messages.loading !== undefined) {
        const { message, ...lifecycle } = resolveMessage(messages.loading);
        id = add('loading', message, { ...options, ...lifecycle });
      }
    });

    function settle(
      status: 'success' | 'error',
      message?: string | ToastMessage,
    ) {
      if (message === undefined) {
        if (id !== undefined) toastManager.close(id);
        return;
      }
      const { message: description, ...lifecycle } = resolveMessage(message);
      // duration 要显式带上：即使调用方没有传，也要覆盖 loading 阶段可能写入的常驻时长。
      const settledOptions = {
        ...options,
        duration: options.duration,
        ...lifecycle,
      };
      if (id === undefined) {
        add(status, description, settledOptions);
      } else {
        const { id: _id, ...updates } = settledOptions;
        toastManager.update(id, { ...updates, status, description });
      }
    }

    return promise.then(
      (value) => {
        notifyPromise(() =>
          settle(
            'success',
            typeof messages.success === 'function'
              ? messages.success(value)
              : messages.success,
          ),
        );
        return value;
      },
      (reason: unknown) => {
        notifyPromise(() =>
          settle(
            'error',
            typeof messages.error === 'function'
              ? messages.error(reason)
              : messages.error,
          ),
        );
        throw reason;
      },
    );
  },
  success(message: string, options?: ToastOptions): ToastId {
    return add('success', message, options);
  },
  error(message: string, options?: ToastOptions): ToastId {
    return add('error', message, options);
  },
  info(message: string, options?: ToastOptions): ToastId {
    return add('info', message, options);
  },
  warning(message: string, options?: ToastOptions): ToastId {
    return add('warning', message, options);
  },
  /** 只更新打开的消息；不会重新打开已关闭的消息。 */
  update(id: ToastId, options: ToastUpdateOptions) {
    const { message, ...updates } = options;
    toastManager.update(id, {
      ...updates,
      ...(message === undefined ? {} : { description: message }),
    });
  },
  dismiss(id: ToastId) {
    toastManager.close(id);
  },
  dismissAll() {
    toastManager.close();
  },
} as const;
