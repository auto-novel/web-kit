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
  /** 左右方向键翻页，默认关闭；仅当焦点在分页内时生效。 */
  keyboard?: boolean;
}
