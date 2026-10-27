import type { XUi } from '../classes';

export type XErrorUi = XUi<'root' | 'icon' | 'title' | 'description'>;

export interface XErrorProps {
  title?: string;
  description?: string;
  ui?: XErrorUi;
}
