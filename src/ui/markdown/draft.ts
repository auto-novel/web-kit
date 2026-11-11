import {
  effectScope,
  getCurrentScope,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import { useLocalStorage } from '../../utils/storage.ts';

const STORAGE_KEY = 'web-kit:markdown-drafts:v1';
const LIMIT = 20;

type Draft = { text: string; updatedAt: number; expiresAt?: number };
type Drafts = Record<string, Draft>;
const stores = new WeakMap<object, Ref<Drafts>>();
const empty = (): Drafts => Object.create(null);
const validKey = (key: string | undefined): key is string =>
  typeof key === 'string' && key.trim().length > 0;

function sanitize(value: unknown, preferredKey?: string): Drafts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const drafts = empty();
  for (const [key, item] of Object.entries(value)) {
    if (!validKey(key) || !item || typeof item !== 'object') continue;
    const draft = item as Draft;
    if (
      typeof draft.text === 'string' &&
      draft.text.trim() &&
      Number.isFinite(draft.updatedAt) &&
      (draft.expiresAt === undefined ||
        (Number.isFinite(draft.expiresAt) && draft.expiresAt > Date.now()))
    )
      drafts[key] = draft;
  }
  const newest = Object.keys(drafts).sort(
    (a, b) =>
      drafts[b]!.updatedAt - drafts[a]!.updatedAt ||
      (a === preferredKey ? -1 : b === preferredKey ? 1 : 0),
  );
  for (const key of newest.slice(LIMIT)) delete drafts[key];
  return drafts;
}

function getStore(): Ref<Drafts> {
  const browser = typeof window === 'undefined' ? undefined : window;
  const existing = browser && stores.get(browser);
  if (existing) return existing;
  const create = () =>
    useLocalStorage<Drafts>(STORAGE_KEY, {
      fallback: empty,
      validate: sanitize,
      encode: (drafts) =>
        Object.keys(drafts).length ? JSON.stringify(drafts) : undefined,
    });
  // 浏览器共享 watcher 不随首个编辑器卸载；SSR 不跨请求共享草稿。
  const store = browser ? effectScope(true).run(create)! : create();
  if (browser) stores.set(browser, store);
  return store;
}

function readDraft(store: Ref<Drafts>, key: string): Draft | undefined {
  const draft = store.value[key];
  return draft &&
    (draft.expiresAt === undefined || draft.expiresAt > Date.now())
    ? draft
    : undefined;
}

function removeDraft(store: Ref<Drafts>, key: string) {
  const next = Object.assign(empty(), store.value);
  delete next[key];
  store.value = next;
}

function save(store: Ref<Drafts>, key: string, text: string, maxAge?: number) {
  if (!text.trim()) return removeDraft(store, key);
  const updatedAt = Date.now();
  const next = Object.assign(empty(), store.value);
  next[key] = {
    text,
    updatedAt,
    ...(maxAge !== undefined && Number.isFinite(maxAge)
      ? { expiresAt: updatedAt + Math.max(0, maxAge) }
      : {}),
  };
  store.value = sanitize(next, key)!;
}

export interface MarkdownDraftOptions {
  /** 由业务包含应用、账号、资源和回复对象；空键禁用存储。 */
  key: MaybeRefOrGetter<string | undefined>;
  /** 无草稿时的初值；恢复初值不保存，用户编辑后不再跟随初值变化。 */
  initialValue?: MaybeRefOrGetter<string | undefined>;
  /** 有效期（毫秒），默认不过期；整个站点最多保留 20 份草稿。 */
  maxAge?: MaybeRefOrGetter<number | undefined>;
}

/** 独立管理正文，直接把 text 绑定到任意编辑器的 v-model。 */
export function useMarkdownDraft(options: MarkdownDraftOptions) {
  const text = ref('');
  const restored = ref(false);
  let store: Ref<Drafts> | undefined;
  let key: string | undefined;
  let alive = true;
  let followsInitialValue = true;
  let applying = false;

  function apply(value: string) {
    applying = true;
    text.value = value;
    applying = false;
  }

  watch(
    [
      () => {
        const value = toValue(options.key);
        return validKey(value) ? value : undefined;
      },
      () => toValue(options.initialValue),
    ],
    ([nextKey, initial], previous) => {
      if (!previous.length || nextKey !== key) {
        key = nextKey;
        if (key) store ??= getStore();
        const draft = key && store ? readDraft(store, key) : undefined;
        restored.value = !!draft;
        followsInitialValue = !draft;
        apply(draft?.text ?? initial ?? '');
      } else if (followsInitialValue) {
        apply(initial ?? '');
      }
    },
    { immediate: true, flush: 'sync' },
  );

  watch(
    text,
    (value) => {
      if (applying) return;
      followsInitialValue = false;
      restored.value = false;
      if (key && store) save(store, key, value, toValue(options.maxAge));
    },
    { flush: 'sync' },
  );

  if (getCurrentScope())
    onScopeDispose(() => {
      alive = false;
    });

  function reset() {
    followsInitialValue = false;
    restored.value = false;
    apply('');
  }

  function clear() {
    if (key && store) removeDraft(store, key);
    reset();
  }

  /** 请求前捕获快照；仅成功后调用，返回是否清空当前编辑器。 */
  function prepareSubmission(): () => boolean {
    const submittedKey = key;
    const submittedText = text.value;
    const submittedStore = store;
    const record = key && store ? readDraft(store, key) : undefined;
    let settled = false;
    return () => {
      if (settled) return false;
      settled = true;
      if (submittedKey && submittedStore) {
        const current = readDraft(submittedStore, submittedKey);
        // 保存会替换记录对象，不需要额外的版本号或所有权状态。
        if (current !== record || (current && current.text !== submittedText))
          return false;
        if (current) removeDraft(submittedStore, submittedKey);
      }
      if (!alive || key !== submittedKey || text.value !== submittedText)
        return false;
      reset();
      return true;
    };
  }

  return { text, restored, clear, prepareSubmission };
}
