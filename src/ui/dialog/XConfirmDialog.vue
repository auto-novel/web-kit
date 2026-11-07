<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';

import XButton from '../button/XButton.vue';
import { mergeClasses } from '../classes';
import XDialog from './XDialog.vue';
import type { XConfirmDialogProps } from './types';

const props = withDefaults(defineProps<XConfirmDialogProps>(), {
  ui: () => ({}),
  confirmLabel: '确认',
  cancelLabel: '取消',
  closeOnOverlay: true,
});

const emit = defineEmits<{
  'update:open': [open: boolean];
  confirm: [];
}>();

const cancelButton =
  useTemplateRef<InstanceType<typeof XButton>>('cancelButton');
const dialogUi = computed(() => ({
  content: mergeClasses(
    'w-[calc(100%-2rem)] max-w-md overflow-y-auto p-5 sm:p-6',
    props.ui.content,
  ),
  overlay: props.ui.overlay,
  header: 'p-0 sm:p-0',
  title: props.ui.title,
  description: props.ui.description,
  footer: mergeClasses('mt-6 p-0 sm:p-0', props.ui.actions),
}));

function requestOpen(open: boolean) {
  if (!props.loading) emit('update:open', open);
}

function focusCancel(event: Event) {
  if (event.defaultPrevented || props.loading) return;
  const button = cancelButton.value?.$el;
  if (!button) return;
  event.preventDefault();
  button.focus({ preventScroll: true });
}

function confirm() {
  if (!props.loading) emit('confirm');
}
defineOptions({ inheritAttrs: false });
</script>

<template>
  <XDialog
    v-bind="$attrs"
    :open="open"
    :title="title"
    :description="description"
    :ui="dialogUi"
    :closable="!loading"
    :show-close="false"
    :close-on-overlay="closeOnOverlay"
    @update:open="requestOpen"
    @open-auto-focus="focusCancel"
  >
    <template #footer>
      <XButton
        ref="cancelButton"
        :class="mergeClasses(ui.cancel)"
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="requestOpen(false)"
      >
        {{ cancelLabel }}
      </XButton>
      <XButton
        :class="mergeClasses(ui.confirm)"
        :color="danger ? 'danger' : 'primary'"
        :disabled="loading"
        @click="confirm"
      >
        {{ loading ? '处理中…' : confirmLabel }}
      </XButton>
    </template>
  </XDialog>
</template>
