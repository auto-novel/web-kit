import type { XUi } from '../classes';
import type { XSize } from '../types';

export type XSwitchUi = XUi<'root' | 'thumb'>;

export interface XSwitchProps {
  modelValue?: boolean;
  /** 开关尺寸，默认 md。 */
  size?: XSize;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  ui?: XSwitchUi;
}
