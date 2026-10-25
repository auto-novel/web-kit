// 复合控件保留自己的方向键语义；自定义控件可通过 data 属性退出分页快捷键。
const ignoredTarget = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[data-pagination-keyboard-ignore]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="tablist"]',
  '[role="menubar"]',
  '[role="tree"]',
  '[role="treegrid"]',
  '[role="grid"]',
  '[role="radiogroup"]',
  '[role="toolbar"]',
].join(',');

const overlaySelector =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-reka-popper-content-wrapper]';

function isElement(node: unknown): node is Element {
  return !!node && typeof (node as Element).matches === 'function';
}

/**
 * 只检查事件 target 到分页作用域边界之间的控件，
 * 避免分页自身位于 dialog/toolbar 等容器时被祖先误伤。
 */
export function paginationKeyBoundary(
  event: KeyboardEvent,
  root: Element | null,
) {
  if (root && event.composedPath().includes(root)) return root;
  return isElement(event.currentTarget) ? event.currentTarget : null;
}

export function ignoresPaginationKeyboard(
  event: KeyboardEvent,
  boundary: Element | null,
) {
  const path = event.composedPath();
  const end = boundary ? path.indexOf(boundary) : -1;
  return (end < 0 ? path : path.slice(0, end)).some((target) => {
    return isElement(target) && target.matches(ignoredTarget);
  });
}

/** 位于分页作用域内的浮层属于自身交互，不应阻断翻页。 */
export function hasPaginationOverlay(
  document: Document,
  boundary: Element | null,
) {
  return Array.from(document.querySelectorAll(overlaySelector)).some(
    (element) => {
      if (boundary && element.contains(boundary)) return false;
      if (element.closest('[hidden], [inert], [data-state="closed"]'))
        return false;
      const style = document.defaultView?.getComputedStyle(element);
      return style?.display !== 'none' && style?.visibility !== 'hidden';
    },
  );
}
