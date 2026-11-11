<script setup lang="ts">
import { DriveFolderUploadOutlined } from '@vicons/material';

import { mergeClasses } from '../classes';
import type { XDropZoneProps } from './types';
import { useFileDrop } from './useFileDrop';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<XDropZoneProps>(), {
  disabled: false,
  ui: () => ({}),
});
const emit = defineEmits<{ drop: [files: File[], event: DragEvent] }>();
const { active } = useFileDrop(
  () => props.disabled,
  (files, event) => emit('drop', files, event),
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="active"
      v-bind="{ ...$attrs, class: undefined }"
      :class="
        mergeClasses(
          'fixed inset-0 z-[200] bg-black/70 p-4 text-white sm:p-10',
          ui.overlay,
          $attrs.class,
        )
      "
      role="status"
    >
      <div
        :class="
          mergeClasses(
            'pointer-events-none flex size-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-white/70 p-6 text-center text-xl sm:text-2xl',
            ui.content,
          )
        "
      >
        <slot name="icon">
          <DriveFolderUploadOutlined
            :class="mergeClasses('size-12', ui.icon)"
            aria-hidden="true"
          />
        </slot>
        <div :class="mergeClasses(ui.description)">
          <slot>松开以接收文件</slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>
