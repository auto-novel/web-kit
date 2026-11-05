<script setup lang="ts">
import { XPage, XPageHeader, useWebKit } from '@novelia/web-kit';

const { whoami } = useWebKit();
</script>

<template>
  <XPage class="pb-6">
    <XPageHeader title="个人资料" />
    <div class="flex flex-col gap-4">
      <p class="text-sm">
        登录状态：{{
          whoami.isSignedIn ? (whoami.user?.username ?? '已登录') : '未登录'
        }}
      </p>
      <p class="text-muted text-sm">
        这个路由只用来验证布局内的页面切换、滚动复位和侧栏选中态。
      </p>
    </div>
  </XPage>
</template>
