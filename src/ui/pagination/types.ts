import type { XUi } from '../classes';

export type XPaginationUi = XUi<
  | 'root'
  | 'list'
  | 'prev'
  | 'next'
  | 'item'
  | 'ellipsis'
  | 'summary'
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
  /** 左右方向键翻页，默认关闭；默认仅在分页内生效。 */
  keyboard?: boolean;
  /** 扩展键盘作用域，例如可聚焦的列表容器；仍跳过输入框及方向键控件。 */
  keyboardScope?: HTMLElement | null;
}
