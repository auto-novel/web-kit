<script setup lang="ts">
import type { MyStrike } from '../api/requests';
import { GavelOutlined } from '@vicons/material';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useWebKit, useWebKitInternals } from '../context';
import XButton from '../ui/button/XButton.vue';
import XEmpty from '../ui/empty/XEmpty.vue';
import XError from '../ui/error/XError.vue';
import XSkeleton from '../ui/skeleton/XSkeleton.vue';
import XPagination from '../ui/pagination/XPagination.vue';
import XTime from '../ui/time/XTime.vue';
import { getApiErrorMessage } from '../ui/toast/apiError';

const PAGE_SIZE = 20;

const route = useRoute();
const router = useRouter();
const { whoami } = useWebKit();
const { attention, loadMyStrikes } = useWebKitInternals();
const strikes = ref<MyStrike[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');
let requestId = 0;

const page = computed(() => {
  const value = Number(route.query.page);
  return Number.isInteger(value) && value > 0 ? value : 1;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / PAGE_SIZE)),
);

async function loadStrikes() {
  const currentRequestId = ++requestId;
  error.value = '';

  if (!whoami.value.isSignedIn) {
    strikes.value = [];
    total.value = 0;
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const result = await loadMyStrikes({
      page: page.value,
      pageSize: PAGE_SIZE,
    });
    if (currentRequestId !== requestId) return;
    strikes.value = result.items;
    total.value = result.total;
    void attention.updateStrikeReadState(result.latestStrikeId);
  } catch (reason) {
    if (currentRequestId !== requestId) return;
    strikes.value = [];
    total.value = 0;
    error.value = getApiErrorMessage(reason, '无法加载处罚记录');
  } finally {
    if (currentRequestId === requestId) loading.value = false;
  }
}

function changePage(nextPage: number) {
  void router.push({
    path: route.path,
    query: nextPage > 1 ? { page: String(nextPage) } : {},
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

watch([() => whoami.value.user?.id, page], loadStrikes, { immediate: true });
onBeforeUnmount(() => requestId++);
</script>

<template>
  <div class="page-container py-4 md:py-6">
    <div class="mx-auto max-w-4xl">
      <header class="mb-5">
        <h1 class="text-2xl font-bold tracking-tight text-ink">处罚记录</h1>
        <p class="mt-1 text-sm text-muted">查看你的账号处罚及其撤销状态。</p>
      </header>

      <section v-if="!whoami.isSignedIn" class="py-8 text-center">
        <div
          class="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary"
          aria-hidden="true"
        >
          <GavelOutlined class="size-6" />
        </div>
        <h2 class="mt-4 text-lg font-semibold text-ink">登录后查看处罚记录</h2>
        <p class="mt-2 text-sm text-muted">
          请使用页面右上角的登录入口登录账号。
        </p>
      </section>

      <section v-else aria-live="polite">
        <div v-if="loading" class="divide-y divide-divider" role="status">
          <span class="sr-only">正在加载处罚记录…</span>
          <div v-for="index in 4" :key="index" class="py-5">
            <div class="flex items-center justify-between gap-4">
              <XSkeleton class="h-5 w-1/3 bg-border" />
              <XSkeleton class="h-5 w-16 rounded-full" />
            </div>
            <XSkeleton class="mt-3 h-4 w-full" />
            <XSkeleton class="mt-2 h-4 w-2/3" />
          </div>
        </div>
        <XError v-else-if="error" title="处罚记录加载失败" :description="error">
          <XButton @click="loadStrikes">再试一次</XButton>
        </XError>
        <XEmpty
          v-else-if="!strikes.length"
          title="暂无处罚记录"
          description="你的账号目前没有处罚记录。"
        />
        <div v-else class="divide-y divide-divider">
          <article v-for="strike in strikes" :key="strike.id" class="py-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="text-base font-semibold text-ink">
                  {{ strike.reason }}
                </h2>
                <p class="mt-1 text-xs text-muted">
                  <XTime :time="strike.createdAt" />
                  <span aria-hidden="true">·</span>
                  记录 #{{ strike.id }}
                </p>
              </div>

              <div
                class="flex flex-none items-center gap-2 text-xs font-medium"
              >
                <span
                  class="rounded-full px-2.5 py-1"
                  :class="
                    strike.revokedAt
                      ? 'bg-paper text-muted'
                      : 'bg-error-soft text-error-text'
                  "
                >
                  {{ strike.revokedAt ? '已撤销' : '生效中' }}
                </span>
                <span class="rounded-full bg-paper px-2.5 py-1 text-ink">
                  {{ strike.point }} 分
                </span>
              </div>
            </div>

            <div class="mt-4 rounded-md bg-paper px-4 py-3">
              <p class="text-xs font-medium text-muted">处罚依据</p>
              <p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink">
                {{ strike.evidence || '未提供' }}
              </p>
            </div>

            <p v-if="strike.revokedAt" class="mt-3 text-xs text-muted">
              撤销于
              <XTime :time="strike.revokedAt" />
            </p>
          </article>
        </div>

        <XPagination
          v-if="!loading && !error && totalPages > 1"
          :page="page"
          :total-pages="totalPages"
          @update:page="changePage"
        />
      </section>
    </div>
  </div>
</template>
