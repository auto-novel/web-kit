import type { AttentionStatus, StrikeReadState } from './api/requests';
import type { Whoami } from './auth/whoami';
import { useLocalStorage } from './utils/storage';
import {
  computed,
  readonly,
  watch,
  type ComputedRef,
  type DeepReadonly,
  type Ref,
} from 'vue';

export interface AttentionContext {
  readonly status: DeepReadonly<Ref<AttentionStatus | undefined>>;
  readonly refresh: () => Promise<void>;
  readonly updateStrikeReadState: (throughId: number) => Promise<void>;
}

interface AttentionSession {
  userId: number;
  pendingThroughId?: number;
  request?: Promise<void>;
}

interface AttentionApi {
  whoami: ComputedRef<Whoami>;
  getAttentionStatus(): Promise<AttentionStatus>;
  updateMyStrikeReadState(throughId: number): Promise<StrikeReadState>;
}

// 与 access token 保持相同的检查间隔和刷新年龄。
const POLL_INTERVAL = 15 * 60 * 1000;
const COOLDOWN = 60 * 60 * 1000;
const STORAGE_KEY = 'web-kit:attention:v1';

interface StoredAttention {
  userId: number;
  status: AttentionStatus;
  fetchedAt: number;
}

function validateStored(value: unknown): StoredAttention | undefined {
  const record = value as StoredAttention | null;
  if (
    !record ||
    !Number.isSafeInteger(record.userId) ||
    record.userId <= 0 ||
    !Number.isFinite(record.fetchedAt) ||
    record.fetchedAt < 0 ||
    typeof record.status?.strikes?.hasUnread !== 'boolean'
  )
    return;
  return {
    userId: record.userId,
    status: record.status,
    fetchedAt: record.fetchedAt,
  };
}

export function createAttention(api: AttentionApi): AttentionContext {
  let session: AttentionSession | undefined;
  let timer: ReturnType<typeof globalThis.setInterval> | undefined;
  const stored = useLocalStorage<StoredAttention | undefined>(STORAGE_KEY, {
    validate: validateStored,
    fallback: () => undefined,
  });

  const status = computed(() =>
    stored.value?.userId === api.whoami.value.user?.id
      ? stored.value?.status
      : undefined,
  );

  function publish(
    current: AttentionSession,
    value: Omit<StoredAttention, 'userId'>,
  ) {
    if (session !== current) return;
    stored.value = { userId: current.userId, ...value };
  }

  async function synchronize(current: AttentionSession) {
    if (session !== current) return;
    if (current.pendingThroughId === undefined) {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
      )
        return;
      const cached =
        stored.value?.userId === current.userId ? stored.value : undefined;
      const now = Date.now();
      if (
        cached &&
        cached.fetchedAt > 0 &&
        now >= cached.fetchedAt &&
        now - cached.fetchedAt < COOLDOWN
      )
        return;
    }
    while (session === current) {
      if (current.pendingThroughId !== undefined) {
        const throughId = current.pendingThroughId;
        const result = await api.updateMyStrikeReadState(throughId);
        if (session !== current) return;
        // 已读写入立即广播；查询失败也不能继续沿用写入前的冷却。
        publish(current, {
          status: { ...status.value, strikes: result },
          fetchedAt: 0,
        });
        // Keep any larger boundary queued while the write was in flight.
        if (current.pendingThroughId === throughId) {
          current.pendingThroughId = undefined;
        }
        if (current.pendingThroughId !== undefined) continue;
      }

      // Reads and writes share one queue, so a late write response cannot
      // overwrite a newer query. Always query again after acknowledging.
      const result = await api.getAttentionStatus();
      if (session !== current) return;
      if (current.pendingThroughId !== undefined) continue;
      publish(current, { status: result, fetchedAt: Date.now() });
      return;
    }
  }

  function refresh(): Promise<void> {
    const current = session;
    if (!current) return Promise.resolve();
    if (current.request) return current.request;
    current.request = Promise.resolve()
      .then(() => synchronize(current))
      .catch(() => {
        // 保留旧状态与待提交的已读边界，下次正常刷新时重试。
      })
      .finally(() => {
        current.request = undefined;
      });
    return current.request;
  }

  function updateStrikeReadState(throughId: number): Promise<void> {
    if (!session) return Promise.resolve();
    if (!Number.isSafeInteger(throughId) || throughId < 0) {
      return Promise.resolve();
    }
    session.pendingThroughId = Math.max(
      session.pendingThroughId ?? 0,
      throughId,
    );
    return refresh();
  }

  function refreshWhenVisible() {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'visible') void refresh();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', refreshWhenVisible);
  }
  // immediate + sync：创建时补一次当前用户，之后登录/登出都在同一个 tick 内
  // 切换状态与轮询定时器，与页面读取 whoami 的时机一致。
  watch(
    () => api.whoami.value.user?.id,
    (userId) => {
      session = userId !== undefined ? { userId } : undefined;
      if (!session) stored.value = undefined;
      // 只在已登录时保留轮询定时器。
      if (session) {
        timer ??= globalThis.setInterval(refreshWhenVisible, POLL_INTERVAL);
        void refresh();
      } else if (timer !== undefined) {
        globalThis.clearInterval(timer);
        timer = undefined;
      }
    },
    { immediate: true, flush: 'sync' },
  );

  return Object.freeze({
    status: readonly(status),
    refresh,
    updateStrikeReadState,
  });
}
