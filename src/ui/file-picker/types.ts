/** 只选择文件，不负责读取、校验或上传；透传属性及 class/style 作用于外层容器。 */
export interface XFilePickerProps {
  /** 原生文件类型提示，如 image/* 或 .txt,.md；不能代替业务校验。 */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}
