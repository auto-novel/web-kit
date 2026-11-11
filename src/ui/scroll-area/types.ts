import type { XUi } from '../classes';

export type XScrollAreaUi = XUi<
  'root' | 'viewport' | 'scrollbar' | 'thumb' | 'corner'
>;

export interface XScrollAreaProps {
  /** 滚动条方向；both 同时启用横向和纵向滚动。 */
  orientation?: 'vertical' | 'horizontal' | 'both';
  type?: 'auto' | 'always' | 'scroll' | 'hover';
  scrollHideDelay?: number;
  /** 鼠标拖动滚动：false（默认）关闭，true 开启，'inertia' 附带惯性；data-drag-scroll-ignore 可排除局部内容。 */
  dragScroll?: boolean | 'inertia';
  /** 分区样式覆盖；默认高度随内容，通过外层 max-height 或 height 限定滚动区域。 */
  ui?: XScrollAreaUi;
}
