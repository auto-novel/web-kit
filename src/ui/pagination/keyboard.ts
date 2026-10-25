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
  '[role="menu"]',
  '[role="menubar"]',
  '[role="listbox"]',
  '[role="tree"]',
  '[role="treegrid"]',
  '[role="grid"]',
  '[role="radiogroup"]',
  '[role="toolbar"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
].join(',');

export function ignoresPaginationKeyboard(event: KeyboardEvent) {
  return event.composedPath().some((target) => {
    const element = target as Element;
    return (
      typeof element.matches === 'function' && element.matches(ignoredTarget)
    );
  });
}

export function hasPaginationOverlay(document: Document) {
  return Array.from(
    document.querySelectorAll(
      '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-reka-popper-content-wrapper]',
    ),
  ).some((element) => {
    if (element.closest('[hidden], [inert], [data-state="closed"]'))
      return false;
    const style = document.defaultView?.getComputedStyle(element);
    return style?.display !== 'none' && style?.visibility !== 'hidden';
  });
}
