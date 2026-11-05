<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';

import { useWebKit } from '../context';
import XConfirmDialog from '../ui/dialog/XConfirmDialog.vue';
import { Toast } from '../ui/toast';
import { getApiErrorMessage } from '../ui/toast/apiError';

const props = defineProps<{
  userId: number;
  username: string;
  authorBlocked: boolean;
  /** 宿主负责请求及缓存同步；卸载后仍需完成更新，但应自行丢弃旧会话的响应。 */
  setUserBlocked: (userId: number, blocked: boolean) => Promise<unknown>;
}>();
const emit = defineEmits<{ close: [] }>();
const { whoami } = useWebKit();
// 缓存更新不应改变本次确认操作。
const blocked = props.authorBlocked;
const pending = ref(false);
let dialogRevision = 0;
onScopeDispose(() => {
  dialogRevision++;
});
watch(
  () => [props.userId, whoami.value.user?.id],
  () => {
    dialogRevision++;
    emit('close');
  },
  { flush: 'sync' },
);
async function confirm() {
  const viewer = whoami.value.user?.id;
  if (pending.value || viewer === undefined || viewer === props.userId) return;
  const submittedRevision = dialogRevision;
  const isCurrent = () => dialogRevision === submittedRevision;
  pending.value = true;
  try {
    await props.setUserBlocked(props.userId, !blocked);
    if (isCurrent()) {
      Toast.success(blocked ? '已取消屏蔽' : '已屏蔽用户');
      emit('close');
    }
  } catch (error) {
    if (isCurrent())
      Toast.error(
        getApiErrorMessage(error, blocked ? '取消屏蔽失败' : '屏蔽失败'),
      );
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <XConfirmDialog
    open
    :title="`${blocked ? '取消屏蔽' : '屏蔽'} @${username}`"
    :description="
      blocked
        ? '取消后，该用户的内容将重新出现在列表中。'
        : '屏蔽后，将隐藏该用户的内容及其发起的评论串，仅对你生效。'
    "
    :confirm-label="blocked ? '取消屏蔽' : '屏蔽用户'"
    :loading="pending"
    :danger="!blocked"
    @update:open="
      (open) => {
        if (!open && !pending) emit('close');
      }
    "
    @confirm="confirm"
  />
</template>
