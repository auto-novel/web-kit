import type { XUi } from '../classes';

export type XSwitchSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type XSwitchUi = XUi<'root' | 'thumb'>;

export interface XSwitchProps {
  modelValue?: boolean;
  /** 开关尺寸，默认 md。 */
  size?: XSwitchSize;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  ui?: XSwitchUi;
}
