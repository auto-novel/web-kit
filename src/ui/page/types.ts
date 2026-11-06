import type { XUi } from '../classes';

export type XPageUi = XUi<'aside'>;

export interface XPageProps {
  ui?: XPageUi;
}

export interface XPageHeaderProps {
  title: string;
  description?: string;
}
