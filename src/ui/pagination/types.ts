import type { XUi } from '../classes';

export type XPaginationUi = XUi<
  | 'root'
  | 'list'
  | 'prev'
  | 'next'
  | 'item'
  | 'ellipsis'
  | 'jumpContent'
  | 'jumpLabel'
  | 'jumpInput'
  | 'jumpButton'
>;

/** class/style 与透传属性作用于分页导航根节点。 */
export interface XPaginationProps {
  ui?: XPaginationUi;
  page: number;
  totalPages: number;
  /**
   * 左右方向键翻页，默认关闭。
   * `true` 仅在分页内部生效；传入元素时扩展到该容器；传 `'window'` 时在页面级生效。
   * 输入框、可编辑区域、方向键控件、浮层和文本选择会保留原有操作。
   */
  keyboard?: boolean | 'window' | HTMLElement | null;
}
