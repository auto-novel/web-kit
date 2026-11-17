import type { XUi } from '../classes';

export type XProgressCircleColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral';

export type XProgressCircleSize = 'sm' | 'md' | 'lg';

export interface XProgressCircleSegment {
  percentage: number;
  color?: XProgressCircleColor;
}

export type XProgressCircleUi = XUi<
  'root' | 'svg' | 'track' | 'segment' | 'label' | 'shimmer'
>;

/** class/style 与透传属性作用于根节点；ui 定制各样式分区。 */
export interface XProgressCircleProps {
  /** 中央显示及无障碍进度，范围 0–100。 */
  percentage: number;
  /**
   * 可选多色分段，按顺序累计并截断至 100%；省略时显示单色进度。
   * 分段总和可与 percentage 不同，中央显示及无障碍进度始终以 percentage 为准。
   */
  segments?: ReadonlyArray<XProgressCircleSegment>;
  color?: XProgressCircleColor;
  /** 环形尺寸：sm 56px、md 88px、lg 120px。 */
  size?: XProgressCircleSize;
  /** 已填充分段以透明度呼吸动画提示运行状态，不改变实际进度。 */
  running?: boolean;
  ui?: XProgressCircleUi;
}
