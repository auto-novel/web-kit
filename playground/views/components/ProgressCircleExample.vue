<script setup lang="ts">
import { XProgressCircle, type XProgressCircleColor } from '@novelia/web-kit';
import { ref } from 'vue';
import ExampleControls from '../../components/ExampleControls.vue';

const percentage = ref(65);
const color = ref<XProgressCircleColor>('primary');
const progressOptions = ref(['running']);
</script>

<template>
  <div id="progress-circle" class="scroll-mt-20 space-y-4">
    <h3 class="text-sm font-medium">环形进度 · XProgressCircle</h3>
    <ExampleControls
      v-model:color="color"
      v-model:options="progressOptions"
      :controls="['color']"
      :extra-options="[{ label: '运行流光', value: 'running' }]"
    >
      <label class="flex items-center gap-3 text-sm">
        进度
        <USlider
          v-model="percentage"
          :min="0"
          :max="100"
          aria-label="进度"
          class="w-40"
        />
        <span class="w-10 text-muted tabular-nums">{{ percentage }}%</span>
      </label>
    </ExampleControls>
    <div class="flex flex-wrap items-center gap-6">
      <XProgressCircle
        :percentage="percentage"
        :color="color"
        size="sm"
        :running="progressOptions.includes('running')"
      />
      <XProgressCircle
        :percentage="percentage"
        :color="color"
        :running="progressOptions.includes('running')"
      />
      <XProgressCircle
        :percentage="percentage"
        :segments="[
          { percentage: 50, color: 'success' },
          { percentage: 20, color: 'warning' },
          { percentage: 10, color: 'error' },
        ]"
        size="lg"
        :running="progressOptions.includes('running')"
        aria-label="独立中心进度"
      />
    </div>
    <p class="text-sm text-muted">
      大号示例展示独立数据源：环形分段固定为成功 50%、警告 20%、失败 10%，合计
      80%；中心文字和无障碍进度由上方滑块单独控制，不代表分段总和。
    </p>
  </div>
</template>
