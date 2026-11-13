import type { NuxtUIOptions } from '@nuxt/ui/vite';

// 通用控件直接使用 Nuxt UI；此处仅维护 Novelia 的统一外观。
// 宿主使用 ui(webKitNuxtUiOptions)，并在 Tailwind 之后导入 styles.css。
const fieldTheme = {
  slots: {
    base: 'rounded-sm font-normal disabled:opacity-50 placeholder:text-muted',
  },
  variants: {
    variant: {
      outline: 'border border-default bg-transparent ring-0',
    },
  },
  compoundVariants: [
    {
      color: 'primary' as const,
      variant: 'outline' as const,
      class:
        'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15',
    },
    {
      color: 'error' as const,
      variant: 'outline' as const,
      class:
        'border-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/15',
    },
  ],
};

const floatingContent =
  'rounded-floating bg-popover text-default shadow-floating ring-0';
const menuItem =
  'rounded-floating text-default before:rounded-floating data-highlighted:not-data-disabled:before:bg-hover';

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
      primary: 'green',
      secondary: 'teal',
      success: 'green',
      info: 'blue',
      warning: 'amber',
      error: 'rose',
      neutral: 'zinc',
    },
    link: {
      base: 'rounded-sm transition-colors outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
      variants: {
        active: {
          true: 'text-primary',
          false: 'text-primary',
        },
      },
      compoundVariants: [{ disabled: false, class: 'hover:text-primary/75' }],
    },
    button: {
      slots: {
        base: 'cursor-pointer rounded-sm font-normal disabled:opacity-40 aria-disabled:opacity-40 disabled:cursor-not-allowed aria-disabled:cursor-not-allowed',
      },
    },
    slider: {
      slots: {
        thumb: 'bg-white border-0 ring-0 shadow-sm',
      },
    },
    switch: {
      slots: {
        thumb: 'bg-white border-0 ring-0 shadow-sm',
      },
    },
    select: {
      ...fieldTheme,
      slots: {
        ...fieldTheme.slots,
        content: floatingContent,
        item: menuItem,
        itemTrailingIcon: 'text-primary',
      },
      variants: {
        variant: {
          outline: `${fieldTheme.variants.variant.outline} hover:bg-transparent disabled:bg-transparent`,
        },
      },
    },
    selectMenu: {
      ...fieldTheme,
      slots: {
        ...fieldTheme.slots,
        content: floatingContent,
        item: menuItem,
      },
    },
    inputMenu: {
      ...fieldTheme,
      slots: {
        ...fieldTheme.slots,
        content: floatingContent,
        item: menuItem,
      },
    },
    dropdownMenu: {
      slots: { content: floatingContent, item: menuItem },
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
        wrapper:
          'min-w-0 flex-row flex-nowrap items-center justify-between gap-4',
        title:
          'min-w-0 flex-1 truncate text-2xl leading-tight font-medium text-nowrap text-default sm:text-3xl',
        description: 'mt-2 text-sm text-muted',
        links: 'shrink-0 flex-nowrap gap-2',
      },
    },
    modal: {
      slots: {
        content: 'bg-modal text-default divide-default',
        header: 'min-h-0 gap-3 px-6 pt-6 pb-4',
        title: 'text-lg font-medium text-default',
        body: 'px-6 py-4',
        footer: 'justify-end gap-3 px-6 py-4',
      },
      variants: {
        fullscreen: {
          false: { content: 'rounded-floating shadow-floating ring-0' },
        },
        overlay: { true: { overlay: 'bg-black/45' } },
      },
    },
    slideover: {
      slots: {
        overlay: 'bg-black/45',
        content: 'bg-modal text-default divide-default shadow-floating',
      },
    },
  },
} satisfies NuxtUIOptions;
