import type { XUi } from '../classes';
import type { XInputSize } from '../input/types';

export type XNumberInputSize = XInputSize;
export type XNumberInputUi = XUi<'root' | 'input'>;

export interface XNumberInputProps {
  /** 空值统一为 null；数值在失焦或按 Enter 时提交。 */
  modelValue?: number | null;
  min?: number;
  max?: number;
  /** 默认 1；小数输入使用对应的小数步长。 */
  step?: number;
  /** 表单字段名；表单提交数值，不提交格式化后的显示文本。 */
  name?: string;
  disabled?: boolean;
  readonly?: boolean;
  invalid?: boolean;
  size?: XNumberInputSize;
  ui?: XNumberInputUi;
}
