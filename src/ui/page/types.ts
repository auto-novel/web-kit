import type { XUi } from '../classes';

export type XPageUi = XUi<'aside'>;

export interface XPageProps {
  ui?: XPageUi;
}
