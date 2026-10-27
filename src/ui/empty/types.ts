import type { XUi } from '../classes';

export type XEmptyUi = XUi<'root' | 'icon' | 'title' | 'description'>;

export interface XEmptyProps {
  title?: string;
  description?: string;
  size?: 'compact' | 'default' | 'large';
  ui?: XEmptyUi;
}
