import type { ImgHTMLAttributes } from 'vue';
import type { XUi } from '../classes';

export type XImageUi = XUi<'root' | 'image'>;

/** 缩略图触发 load/error 事件；加载失败时显示 error 插槽或默认提示。 */
export interface XImageProps {
  src: string;
  /** 仅打开预览后加载，默认使用 src。 */
  previewSrc?: string;
  /** 默认允许预览；关闭后不参与图片分组，也不进入键盘焦点顺序。 */
  preview?: boolean;
  /** 缩略图原生属性；src、alt、尺寸及 loading 由组件 props 控制。 */
  imgAttrs?: Omit<
    ImgHTMLAttributes,
    'src' | 'alt' | 'width' | 'height' | 'loading'
  >;
  alt?: string;
  width?: number | string;
  height?: number | string;
  lazy?: boolean;
  /** class/style 和其他透传属性作用于缩略图根节点。 */
  ui?: XImageUi;
}
