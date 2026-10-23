import type { XUi } from '../classes';
import type { XInputSize } from '../input/types';

export type XTextareaSize = XInputSize;
export type XTextareaUi = XUi<'root' | 'textarea' | 'count'>;
export interface XTextareaAutosize {
  minRows?: number;
  maxRows?: number;
}

export interface XTextareaProps {
  /** 始终绑定字符串；maxlength 保留原生属性行为，不裁剪外部模型。 */
  modelValue?: string;
  /** 自动调整高度，默认至少一行；到达 maxRows 后允许滚动。 */
  autosize?: boolean | XTextareaAutosize;
  showCount?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  invalid?: boolean;
  size?: XTextareaSize;
  ui?: XTextareaUi;
}
