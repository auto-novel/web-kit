<script setup lang="ts">
import { useLoadingBar } from './useLoadingBar';

defineOptions({ inheritAttrs: false });
const view = useLoadingBar();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="view.rendered"
      v-bind="$attrs"
      class="x-loading-bar"
      :class="{ 'x-loading-bar--hidden': !view.visible }"
      role="progressbar"
      :aria-label="
        view.status === 'error'
          ? '加载失败'
          : view.status === 'success'
            ? '加载完成'
            : '正在加载'
      "
      :aria-busy="view.status === 'loading'"
    >
      <div
        :key="view.cycle"
        class="x-loading-bar__progress"
        :data-status="view.status"
        :style="{ maxWidth: `${view.progress}%` }"
      />
    </div>
  </Teleport>
</template>

<style scoped>
/* Naive LoadingBar 风格：无轨道、无圆角、无阴影的顶部 2px 细条。 */
.x-loading-bar {
  position: fixed;
  z-index: var(--web-kit-loading-bar-z-index, 5999);
  top: 0;
  right: 0;
  left: 0;
  height: var(--web-kit-loading-bar-height, 2px);
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.3s linear;
}

.x-loading-bar--hidden {
  opacity: 0;
  transition-duration: 0.8s;
}

.x-loading-bar__progress {
  width: 100%;
  height: 100%;
  background: var(--color-primary, #18a058);
  transition:
    max-width 4s linear,
    background-color 0.2s linear;
}

.x-loading-bar__progress[data-status='success'],
.x-loading-bar__progress[data-status='error'] {
  transition-duration: 0.2s;
}

.x-loading-bar__progress[data-status='error'] {
  background: var(--color-error, #d03050);
}

@media (prefers-reduced-motion: reduce) {
  .x-loading-bar,
  .x-loading-bar__progress {
    transition: none;
  }
}
</style>
