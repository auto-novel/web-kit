import type { NuxtUIOptions } from '@nuxt/ui/vite';

// 通用控件直接使用 Nuxt UI；此处仅维护 Novelia 的统一外观。
// 宿主使用 ui(webKitNuxtUiOptions)，并在 Tailwind 之后导入 styles.css。
// 横向短选项使用更紧凑的内边距；list 保留 Nuxt UI 默认间距。
const selectionGroupTheme = {
  compoundVariants: (
    [
      { size: 'xs', padding: 'px-2 py-1' },
      { size: 'sm', padding: 'px-2.5 py-1.5' },
      { size: 'md', padding: 'px-3 py-2' },
      { size: 'lg', padding: 'px-3.5 py-2.5' },
      { size: 'xl', padding: 'px-4 py-3' },
    ] as const
  ).map(({ size, padding }) => ({
    size,
    variant: ['card', 'table'] as ('card' | 'table')[],
    class: { item: padding },
  })),
};

const menuItem = 'data-highlighted:not-data-disabled:before:bg-hover';

/**
 * Vue/Vite 的共享接入预设。禁用第二套主题状态和隐式自动导入；
 * 明暗色由 web-kit 统一切换根元素 .light / .dark，支持 ThemeOverride。
 * 在 Nuxt 中可复用此处的 ui 配置与 styles.css，勿直接传入整个 Vite 预设。
 */
export const webKitNuxtUiOptions = {
  colorMode: false,
  autoImport: false,
  components: false,
  dts: false,
  scanPackages: ['@novelia/web-kit'],
  ui: {
    colors: {
      secondary: 'teal',
      warning: 'amber',
      error: 'rose',
      neutral: 'zinc',
    },
    link: {
      base: 'transition-colors outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
      variants: {
        active: {
          false: 'text-primary',
        },
      },
      compoundVariants: [{ disabled: false, class: 'hover:text-primary/75' }],
    },
    button: {
      slots: {
        base: 'cursor-pointer font-normal',
      },
    },
    radioGroup: {
      ...selectionGroupTheme,
      slots: {
        label: 'font-normal',
      },
    },
    checkboxGroup: selectionGroupTheme,
    checkbox: {
      slots: {
        label: 'font-normal',
      },
    },
    slider: {
      slots: {
        thumb: 'bg-white border-0 ring-0 shadow-sm',
      },
    },
    switch: {
      slots: {
        thumb: 'bg-white border-0 shadow-sm',
      },
    },
    select: {
      slots: {
        content: 'bg-popover',
        item: menuItem,
      },
    },
    selectMenu: {
      slots: {
        content: 'bg-popover',
        item: menuItem,
      },
    },
    inputMenu: {
      slots: {
        content: 'bg-popover',
        item: menuItem,
      },
    },
    dropdownMenu: {
      slots: { content: 'bg-popover', item: menuItem },
    },
    popover: {
      slots: { content: 'bg-popover' },
    },
    tooltip: {
      slots: {
        content: 'h-auto max-w-64',
        text: 'min-w-0 overflow-visible text-clip whitespace-pre-line break-words',
      },
    },
    pageHeader: {
      slots: {
        root: 'mb-6 border-b-0 py-0',
        wrapper: 'min-w-0 flex-row flex-nowrap items-center justify-between',
        title:
          'min-w-0 flex-1 truncate text-2xl leading-tight font-medium text-nowrap text-default sm:text-3xl',
        description: 'mt-2 text-sm',
        links: 'shrink-0 flex-nowrap gap-2',
      },
    },
    modal: {
      slots: { content: 'bg-dialog' },
      variants: {
        overlay: { true: { overlay: 'bg-black/45' } },
      },
    },
    slideover: {
      slots: {
        overlay: 'bg-black/45',
        content: 'bg-dialog',
      },
    },
    drawer: {
      slots: {
        overlay: 'bg-black/45',
        content: 'bg-dialog',
      },
    },
  },
} satisfies NuxtUIOptions;
