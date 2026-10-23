import type { XUi } from '../classes';
import type { XInputSize } from '../input/types';

/** 无时区的 ISO 日期（YYYY-MM-DD），不包含时间。 */
export type XDateRange = [string, string];
export type XDateRangePickerUi = XUi<
  'root' | 'trigger' | 'clear' | 'content' | 'header' | 'navigation' | 'day'
>;

export interface XDateRangePickerProps {
  /** 只提交完整区间；清空为 null。 */
  modelValue?: XDateRange | null;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  /** 只读仍可打开查看，但不能选择或清空。 */
  readonly?: boolean;
  invalid?: boolean;
  size?: XInputSize;
  /** 日历的 BCP 47 locale；触发器仍显示 ISO 日期。 */
  locale?: string;
  min?: string;
  max?: string;
  ui?: XDateRangePickerUi;
}
