import type { XUi } from '../classes';

export type XDropZoneUi = XUi<'overlay' | 'content' | 'icon' | 'description'>;

/** class/style 与透传属性作用于全屏遮罩；ui 定制内部区域。 */
export interface XDropZoneProps {
  ui?: XDropZoneUi;
  /** 禁用时不显示遮罩，也不拦截拖放。 */
  disabled?: boolean;
  /** 递归展开拖入的目录，默认 false；读取失败触发 error 而非 drop。 */
  directories?: boolean;
}
