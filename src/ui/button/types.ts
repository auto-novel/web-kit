import type { Component } from 'vue';

import type { XColor, XSize, XVariant } from '../types';

export type XButtonSize = XSize | 'tiny' | 'icon' | 'icon-sm' | 'icon-xs';

export interface XButtonProps {
  as?: string | Component;
  type?: 'button' | 'submit' | 'reset';
  /** 语义色，默认 primary；中性操作使用 neutral。 */
  color?: XColor;
  /** 呈现方式，默认 solid；浅色背景使用 soft。 */
  variant?: XVariant;
  size?: XButtonSize;
  disabled?: boolean;
  /** 显示加载指示器，并禁用点击和表单提交。 */
  loading?: boolean;
  /** 自动管理点击处理期间的加载状态，默认关闭。 */
  loadingAuto?: boolean;
  onClick?:
    ((event: MouseEvent) => unknown) | Array<(event: MouseEvent) => unknown>;
}
