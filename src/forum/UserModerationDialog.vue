<script setup lang="ts">
import { computed, effectScope, onScopeDispose, ref, watch } from 'vue';

import { useWebKitInternals } from '../context';
import UInputMenu from '@nuxt/ui/components/InputMenu.vue';
import UButton from '@nuxt/ui/components/Button.vue';
import UModal from '@nuxt/ui/components/Modal.vue';
import { Toast } from '../ui/toast';
import { getApiErrorMessage } from '../ui/toast/apiError';

const props = defineProps<{
  open: boolean;
  action: 'strike' | 'ban';
  userId: number;
  username: string;
  evidence: string;
  /** 宿主绑定具体评论及站点，负责删除和缓存同步；需绑定稳定目标，不能在执行时读取可变目标。 */
  deleteComment?: () => Promise<unknown>;
  /** 仅论坛提供；传入时显示封禁后删除全部评论的选项。 */
  deleteCommentsByAuthor?: (userId: number) => Promise<unknown>;
}>();
const emit = defineEmits<{
  'update:open': [open: boolean];
  /** 仅通知当前界面；缓存同步必须在删除回调内完成。 */
  commentDeleted: [];
  commentsDeleted: [];
}>();
const { session, createStrike, banUser } = useWebKitInternals();
const { whoami } = session;
const reason = ref('');
const pointOptions = [1, 2, 3];
const point = ref(1);
const removeComments = ref(false);
const submitting = ref(false);
// Reka AutocompleteInput 不继承根节点 disabled，以只读和模型守卫锁定提交值。
const reasonModel = computed({
  get: () => reason.value,
  set: (value: string) => {
    if (!submitting.value) reason.value = value;
  },
});
const isStrike = computed(() => props.action === 'strike');
const reasonPresets = computed(() =>
  isStrike.value ? ['骂人', '灌水', '网赚盘'] : ['营利', '宣扬纳粹'],
);
const title = computed(
  () => `${isStrike.value ? '处罚' : '封禁'} @${props.username}`,
);
const canSubmit = computed(
  () =>
    whoami.value.asAdmin &&
    whoami.value.user?.id !== props.userId &&
    reason.value.trim().length > 0 &&
    (!isStrike.value || pointOptions.includes(point.value)),
);
// 仅用于防止旧请求关闭新弹窗或向新目标发送事件，不限制全局 Toast。
let dialogRevision = 0;
onScopeDispose(() => {
  dialogRevision++;
});
watch(
  () => [
    props.open,
    props.action,
    props.userId,
    props.username,
    props.evidence,
    props.deleteComment,
  ],
  () => {
    dialogRevision++;
    reason.value = '';
    point.value = 1;
    removeComments.value = false;
  },
  { flush: 'sync' },
);
watch(
  () => [whoami.value.user?.id, whoami.value.asAdmin],
  () => {
    dialogRevision++;
    emit('update:open', false);
  },
  { flush: 'sync' },
);
function updateOpen(open: boolean) {
  if (!submitting.value) emit('update:open', open);
}
async function submit() {
  if (!props.open || !canSubmit.value || submitting.value) return;
  submitting.value = true;
  const submittedRevision = dialogRevision;
  const {
    action,
    username,
    userId,
    evidence,
    deleteComment,
    deleteCommentsByAuthor,
  } = props;
  const strike = action === 'strike';
  const value = reason.value.trim();
  const points = point.value;
  const shouldRemoveComments = !strike && removeComments.value;
  // 账号或权限一旦变化，即使后来恢复，也不能继续旧会话的后续删除。
  let sessionUnchanged = true;
  const canUpdateDialog = () => dialogRevision === submittedRevision;
  // 独立于组件生命周期监听会话变化，持续到本次提交结束。
  const sessionScope = effectScope(true);
  sessionScope.run(() =>
    watch(
      () => [whoami.value.user?.id, whoami.value.asAdmin],
      () => {
        sessionUnchanged = false;
      },
      { flush: 'sync' },
    ),
  );
  try {
    if (strike) {
      await createStrike({
        username,
        reason: value,
        evidence,
        point: points,
      });
    } else {
      await banUser({ username, reason: value });
    }
    // 会话变化后不再发起删除；关闭或卸载弹窗不影响原目标的操作。
    let message = `已${strike ? '处罚' : '封禁'} @${username}`;
    try {
      if (sessionUnchanged && strike && deleteComment) {
        await deleteComment();
        message += '，并删除被处罚的评论';
        if (canUpdateDialog()) emit('commentDeleted');
      } else if (
        sessionUnchanged &&
        shouldRemoveComments &&
        deleteCommentsByAuthor
      ) {
        await deleteCommentsByAuthor(userId);
        message += '，并删除该用户的全部评论';
        if (canUpdateDialog()) emit('commentsDeleted');
      }
      Toast.success(message);
    } catch {
      Toast.error(
        `${strike ? '处罚' : '封禁'}已成功，但删除评论失败，请手动删除`,
      );
    } finally {
      if (canUpdateDialog()) emit('update:open', false);
    }
  } catch (error) {
    Toast.error(
      getApiErrorMessage(error, strike ? '处罚用户失败' : '封禁用户失败'),
    );
  } finally {
    sessionScope.stop();
    submitting.value = false;
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :dismissible="!submitting"
    :close="!submitting"
    :ui="{ content: 'w-md' }"
    @update:open="updateOpen"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="submit">
        <label class="block">
          <span class="text-sm font-medium text-ink">
            {{ isStrike ? '处罚原因' : '封禁原因' }}
          </span>
          <UInputMenu
            v-model="reasonModel"
            :content="{ side: 'bottom' }"
            mode="autocomplete"
            :items="reasonPresets"
            size="sm"
            class="mt-1.5 w-full"
            :placeholder="
              isStrike ? '选择或填写处罚原因' : '选择或填写封禁原因'
            "
            :disabled="submitting"
            :readonly="submitting"
            required
            autofocus
          >
            <template #empty>无匹配原因，可直接填写</template>
          </UInputMenu>
        </label>

        <fieldset v-if="isStrike" :disabled="submitting">
          <legend class="text-sm font-medium text-ink">处罚分值</legend>
          <div class="mt-1.5 flex gap-2">
            <label v-for="option in pointOptions" :key="option">
              <input
                v-model="point"
                type="radio"
                name="strike-point"
                :value="option"
                class="peer sr-only"
              />
              <span
                class="block cursor-pointer rounded-sm border border-border bg-surface px-4 py-1.5 text-sm text-muted transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                :class="{
                  'hover:border-primary hover:text-primary peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:outline-primary':
                    option === 1,
                  'hover:border-warning hover:text-warning peer-checked:border-warning peer-checked:bg-warning-soft peer-checked:text-warning peer-focus-visible:outline-warning':
                    option === 2,
                  'hover:border-error hover:text-error peer-checked:border-error peer-checked:bg-error-soft peer-checked:text-error peer-focus-visible:outline-error':
                    option === 3,
                }"
              >
                {{ option }} 分
              </span>
            </label>
          </div>
        </fieldset>

        <label
          v-else-if="deleteCommentsByAuthor"
          class="flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-paper/60 p-3"
        >
          <input
            v-model="removeComments"
            type="checkbox"
            class="mt-0.5 size-4 shrink-0 accent-primary"
            :disabled="submitting"
          />
          <span>
            <span class="block text-sm font-medium text-ink">
              删除该用户的全部评论
            </span>
            <span class="mt-1 block text-xs leading-5 text-muted">
              包括该用户在所有帖子及外部资源下发表的评论。
            </span>
          </span>
        </label>

        <div v-if="isStrike">
          <p class="text-sm font-medium text-ink">处罚依据</p>
          <p
            class="mt-1.5 max-h-28 overflow-y-auto whitespace-pre-wrap wrap-anywhere rounded-sm bg-paper px-3 py-2 text-xs leading-5 text-muted"
          >
            {{ evidence }}
          </p>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="updateOpen(false)"
          >
            取消
          </UButton>
          <UButton
            type="submit"
            color="error"
            :loading="submitting"
            :disabled="!canSubmit || submitting"
          >
            {{ submitting ? '处理中…' : isStrike ? '确认处罚' : '确认封禁' }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
