import type { XUi } from '../classes';

export type XImageCompareUi = XUi<
  | 'root'
  | 'before'
  | 'after'
  | 'afterImage'
  | 'beforeLabel'
  | 'afterLabel'
  | 'divider'
  | 'handle'
  | 'input'
>;

export interface XImageCompareProps {
  before: string;
  after: string;
  alt: string;
  /** 左侧为 before，右侧为 after；分界线百分比，范围 0–100，初始 50；换图时保留位置，由调用方决定是否重置。 */
  modelValue?: number;
  /** 省略时由 before 自然布局，after 保持比例裁切填充；指定正数时两图均裁切填充固定宽高比。 */
  aspect?: number;
  beforeLabel?: string;
  afterLabel?: string;
  /** 原生 range 的无障碍名称；其他透传属性作用于根容器。 */
  label?: string;
  disabled?: boolean;
  ui?: XImageCompareUi;
}
