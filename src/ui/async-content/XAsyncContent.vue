<script setup lang="ts">
import { computed } from 'vue';

import XButton from '../button/XButton.vue';
import { mergeClasses } from '../classes';
import XEmpty from '../empty/XEmpty.vue';
import type { XAsyncContentProps } from './types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<XAsyncContentProps>(), {
  error: '',
  empty: false,
  errorTitle: '加载失败',
  retryLabel: '再试一次',
  emptyTitle: '暂无内容',
  size: 'default',
  ui: () => ({}),
});

defineSlots<{
  default?(): unknown;
  loading?(): unknown;
  error?(props: { error: string; retry: (() => void) | undefined }): unknown;
  empty?(): unknown;
}>();

const layout = computed(() =>
  props.size === 'compact'
    ? {
        minHeight: 'min-h-52',
        padding: 'p-6',
        heading: 'mt-3 text-sm font-medium text-ink',
        retry: 'mt-4',
      }
    : {
        minHeight: props.size === 'large' ? 'min-h-96' : 'min-h-80',
        padding: 'p-8',
        heading: 'mt-4 text-lg font-semibold text-ink',
        retry: 'mt-5',
      },
);
</script>

<template>
  <div
    v-bind="{ ...$attrs, class: undefined }"
    :class="mergeClasses('contents', ui.root, $attrs.class)"
  >
    <slot v-if="loading" name="loading">
      <div
        :class="
          mergeClasses(
            'grid place-items-center gap-3 py-9 text-sm text-muted',
            ui.loading,
          )
        "
        role="status"
      >
        <span
          :class="
            mergeClasses(
              'size-8 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none',
              ui.spinner,
            )
          "
          aria-hidden="true"
        />
        <span>正在加载…</span>
      </div>
    </slot>

    <slot v-else-if="error" name="error" :error="error" :retry="onRetry">
      <div
        :class="
          mergeClasses(
            'grid place-items-center text-center',
            layout.minHeight,
            layout.padding,
            ui.error,
          )
        "
      >
        <div>
          <div
            :class="
              mergeClasses(
                'mx-auto grid size-12 place-items-center rounded-full bg-error-soft text-error-text',
                ui.icon,
              )
            "
            aria-hidden="true"
          >
            !
          </div>

          <h2 v-if="errorTitle" :class="mergeClasses(layout.heading, ui.title)">
            {{ errorTitle }}
          </h2>
          <p :class="mergeClasses('mt-2 text-sm text-muted', ui.description)">
            {{ error }}
          </p>
          <XButton
            v-if="onRetry"
            :class="mergeClasses(layout.retry, ui.retry)"
            @click="onRetry()"
          >
            {{ retryLabel }}
          </XButton>
        </div>
      </div>
    </slot>
    <slot v-else-if="empty" name="empty">
      <XEmpty
        :title="emptyTitle"
        :description="emptyDescription"
        :size="size"
        :ui="{
          root: ui.empty,
          icon: ui.icon,
          title: ui.title,
          description: ui.description,
        }"
      />
    </slot>
    <slot v-else />
  </div>
</template>
