<script setup lang="ts">
import { NumberFieldInput, NumberFieldRoot } from 'reka-ui';
import { useTemplateRef, type InputHTMLAttributes } from 'vue';

import { mergeClasses } from '../classes';
import { fieldInputClass, fieldVariants } from '../field';
import type { XNumberInputProps } from './types';

// class/style 留在外壳，其余原生属性与事件交给 input；name 由根节点转成数值表单字段。
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<Omit<XNumberInputProps, 'modelValue'>>(),
  {
    step: 1,
    size: 'md',
    ui: () => ({}),
  },
);
const model = defineModel<number | null>({ default: null });
const input = useTemplateRef<HTMLInputElement>('input');

function update(value: number | null | undefined) {
  if (props.disabled || props.readonly) return;
  model.value =
    typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// 使用原生 input ref，不把 Reka 的组件实例当作 DOM。
defineExpose({
  focus: (options?: FocusOptions) => input.value?.focus(options),
  blur: () => input.value?.blur(),
});
</script>

<template>
  <NumberFieldRoot
    :model-value="model"
    :min="min"
    :max="max"
    :step="step"
    :name="name"
    :disabled="disabled"
    :readonly="readonly"
    disable-wheel-change
    :style="$attrs.style"
    :class="
      mergeClasses(
        fieldVariants({ size, invalid, disabled }),
        ui.root,
        $attrs.class,
      )
    "
    @update:model-value="update"
  >
    <NumberFieldInput
      as-child
      v-bind="{ ...$attrs, class: undefined, style: undefined }"
      :aria-invalid="
        invalid
          ? true
          : ($attrs['aria-invalid'] as InputHTMLAttributes['aria-invalid'])
      "
      :class="mergeClasses(fieldInputClass, ui.input)"
    >
      <input ref="input" />
    </NumberFieldInput>
  </NumberFieldRoot>
</template>
