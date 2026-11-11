<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import UButton from '@nuxt/ui/components/Button.vue';
import UModal from '@nuxt/ui/components/Modal.vue';
import { mergeClasses } from '../classes';
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
defineOptions({ inheritAttrs: false });

const cancelButton =
  useTemplateRef<InstanceType<typeof UButton>>('cancelButton');
const dialogUi = computed(() => ({
  content: mergeClasses('max-w-md divide-y-0', props.ui.content),
  overlay: mergeClasses(props.ui.overlay),
  header: 'p-5 pb-0 sm:p-6 sm:pb-0',
  title: mergeClasses(props.ui.title),
  description: mergeClasses(props.ui.description),
  footer: mergeClasses('px-5 pt-6 pb-5 sm:px-6 sm:pb-6', props.ui.actions),
}));
const content = {
  onOpenAutoFocus(event: Event) {
    const button = cancelButton.value?.$el;
    if (event.defaultPrevented || props.loading || !button) return;
    event.preventDefault();
    button.focus({ preventScroll: true });
  },
  onPointerDownOutside(event: Event) {
    if (props.loading || !props.closeOnOverlay) event.preventDefault();
  },
};
function requestOpen(open: boolean) {
  if (!props.loading) emit('update:open', open);
}
function confirm() {
  if (!props.loading) emit('confirm');
}
</script>

<template>
  <UModal
    v-bind="$attrs"
    :open="open"
    :title="title"
    :description="description"
    :ui="dialogUi"
    :dismissible="!loading"
    :close="false"
    :content="content"
    @update:open="requestOpen"
  >
    <template #footer>
      <UButton
        ref="cancelButton"
        :class="mergeClasses(ui.cancel)"
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="requestOpen(false)"
      >
        {{ cancelLabel }}
      </UButton>
      <UButton
        :class="mergeClasses(ui.confirm)"
        :color="danger ? 'error' : 'primary'"
        :disabled="loading"
        @click="confirm"
      >
        {{ loading ? '处理中…' : confirmLabel }}
      </UButton>
    </template>
  </UModal>
</template>
