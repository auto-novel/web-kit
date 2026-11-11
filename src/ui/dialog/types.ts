import type { XUi } from '../classes';

export type XConfirmDialogUi = XUi<
  | 'content'
  | 'overlay'
  | 'title'
  | 'description'
  | 'actions'
  | 'cancel'
  | 'confirm'
>;

/** confirm 仅通知操作；调用方在成功后关闭，loading 阻止交互关闭。 */
export interface XConfirmDialogProps {
  ui?: XConfirmDialogUi;
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 是否允许点击遮罩取消，默认 true；loading 时始终禁止交互关闭。 */
  closeOnOverlay?: boolean;
  loading?: boolean;
  danger?: boolean;
}
