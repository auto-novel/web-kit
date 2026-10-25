<script setup lang="ts">
import { XButton, XFilePicker } from '@novelia/web-kit';
import { ref, shallowRef } from 'vue';
import ComponentPage from './ComponentPage.vue';

const defaultFiles = shallowRef<File[]>([]);
const imageFiles = shallowRef<File[]>([]);
const customFiles = shallowRef<File[]>([]);
const disabledFiles = shallowRef<File[]>([]);
const disabled = ref(true);
const picker = ref<InstanceType<typeof XFilePicker> | null>(null);
const code = `<script setup lang="ts">
import { XButton, XFilePicker } from '@novelia/web-kit';
import { ref, shallowRef } from 'vue';

const files = shallowRef<File[]>([]);
const disabled = ref(true);
const picker = ref<InstanceType<typeof XFilePicker> | null>(null);

function handleSelect(selected: File[]) {
  files.value = selected;
  // 校验、读取或上传由调用方自行实现。
}
<\/script>

<template>
  <!-- 默认单选，按钮文字为“选择文件” -->
  <XFilePicker @select="handleSelect" />

  <!-- accept 仅提示文件类型，不负责校验 -->
  <XFilePicker multiple accept="image/*,.pdf" @select="handleSelect" />

  <XFilePicker ref="picker" @select="handleSelect">
    <template #trigger="{ open, disabled }">
      <XButton :disabled="disabled" @click="open">自定义选择按钮</XButton>
    </template>
  </XFilePicker>
  <XButton @click="picker?.open()">通过 ref 打开</XButton>

  <XFilePicker :disabled="disabled" @select="handleSelect" />

  <ul>
    <li v-for="(file, index) in files" :key="index">
      {{ file.name }} · {{ file.size }} 字节
    </li>
  </ul>
</template>`;
</script>

<template>
  <ComponentPage
    description="通过系统文件对话框选择文件，仅返回 File[]，不读取、不上传。支持默认按钮、自定义触发器与 ref.open()。"
    :code="code"
  >
    <p class="text-sm leading-6 text-muted">
      取消选择不会触发
      select，也不会清空下方列表；同一文件可以重复选择。每个示例只展示最近一次选择的文件。
      accept
      只是系统文件对话框的类型提示，不是校验；文件校验与后续处理由调用方负责。
    </p>

    <section aria-labelledby="file-picker-default" class="space-y-3">
      <h2 id="file-picker-default" class="font-medium">默认单选</h2>
      <XFilePicker @select="defaultFiles = $event" />
      <ul
        v-if="defaultFiles.length"
        class="space-y-1 text-sm"
        aria-live="polite"
      >
        <li
          v-for="(file, index) in defaultFiles"
          :key="index"
          class="break-all"
        >
          {{ file.name }} · {{ file.size }} 字节
        </li>
      </ul>
      <p v-else class="text-sm text-muted">尚未选择文件。</p>
    </section>

    <section aria-labelledby="file-picker-multiple" class="space-y-3">
      <h2 id="file-picker-multiple" class="font-medium">多选与 accept 提示</h2>
      <p class="text-sm text-muted">可一次选择多个图片或 PDF 文件。</p>
      <XFilePicker
        multiple
        accept="image/*,.pdf"
        @select="imageFiles = $event"
      />
      <ul v-if="imageFiles.length" class="space-y-1 text-sm" aria-live="polite">
        <li v-for="(file, index) in imageFiles" :key="index" class="break-all">
          {{ file.name }} · {{ file.size }} 字节
        </li>
      </ul>
      <p v-else class="text-sm text-muted">尚未选择文件。</p>
    </section>

    <section aria-labelledby="file-picker-trigger" class="space-y-3">
      <h2 id="file-picker-trigger" class="font-medium">
        自定义 trigger 与组件 ref
      </h2>
      <p class="text-sm leading-6 text-muted">
        使用 trigger 作用域插槽时，调用方需绑定 @click="open" 与
        :disabled="disabled"。 也可在用户点击事件中调用组件 ref 暴露的 open()。
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <XFilePicker ref="picker" @select="customFiles = $event">
          <template #trigger="{ open, disabled: triggerDisabled }">
            <XButton
              :disabled="triggerDisabled"
              variant="outline"
              @click="open"
            >
              自定义选择按钮
            </XButton>
          </template>
        </XFilePicker>
        <XButton color="neutral" variant="soft" @click="picker?.open()">
          通过 ref 打开
        </XButton>
      </div>
      <ul
        v-if="customFiles.length"
        class="space-y-1 text-sm"
        aria-live="polite"
      >
        <li v-for="(file, index) in customFiles" :key="index" class="break-all">
          {{ file.name }} · {{ file.size }} 字节
        </li>
      </ul>
      <p v-else class="text-sm text-muted">尚未选择文件。</p>
    </section>

    <section aria-labelledby="file-picker-disabled" class="space-y-3">
      <h2 id="file-picker-disabled" class="font-medium">禁用</h2>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="disabled" type="checkbox" />
        禁用文件选择（同时适用于默认与自定义按钮）
      </label>
      <div class="flex flex-wrap items-center gap-3">
        <XFilePicker :disabled="disabled" @select="disabledFiles = $event" />
        <XFilePicker :disabled="disabled" @select="disabledFiles = $event">
          <template #trigger="{ open, disabled: triggerDisabled }">
            <XButton
              :disabled="triggerDisabled"
              variant="outline"
              @click="open"
            >
              自定义选择按钮
            </XButton>
          </template>
        </XFilePicker>
      </div>
      <ul
        v-if="disabledFiles.length"
        class="space-y-1 text-sm"
        aria-live="polite"
      >
        <li
          v-for="(file, index) in disabledFiles"
          :key="index"
          class="break-all"
        >
          {{ file.name }} · {{ file.size }} 字节
        </li>
      </ul>
      <p v-else class="text-sm text-muted">尚未选择文件。</p>
    </section>
  </ComponentPage>
</template>
