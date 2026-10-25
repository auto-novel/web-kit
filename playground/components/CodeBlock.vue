<script setup lang="ts">
defineProps<{ code: string }>();
</script>

<template>
  <pre
    class="overflow-x-auto rounded-sm border border-border bg-surface p-4 text-xs leading-6 text-ink"
  ><code>{{ code }}</code></pre>
</template>
