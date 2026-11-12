import type { NuxtUIOptions } from '@nuxt/ui/vite';

// 通用控件直接使用 Nuxt UI；此处仅维护 Novelia 的统一外观。
// 宿主使用 ui(webKitNuxtUiOptions)，并在 Tailwind 之后导入 styles.css。
const fieldTheme = {
  slots: {
    base: 'rounded-sm font-normal disabled:opacity-50 placeholder:text-muted',
  },
  variants: {
    variant: {
      outline: 'border border-border bg-transparent ring-0',
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
  'rounded-floating bg-popover text-ink shadow-floating ring-0';
const menuItem =
  'rounded-floating text-ink before:rounded-floating data-highlighted:not-data-disabled:before:bg-hover';

/**
 * Vue/Vite 的共享接入预设。禁用第二套主题状态和隐式自动导入；
 * 明暗色由 web-kit 的 data-theme / ThemeOverride 统一驱动。
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
      compoundVariants: [
        { disabled: false, class: 'hover:text-primary-hover' },
      ],
    },
    button: {
      slots: { base: 'cursor-pointer rounded-sm font-normal' },
      compoundVariants: [
        {
          color: 'neutral',
          variant: 'soft',
          class:
            'bg-ink/8 hover:bg-ink/14 active:bg-ink/20 disabled:bg-ink/8 aria-disabled:bg-ink/8',
        },
        {
          color: 'neutral',
          variant: 'subtle',
          class:
            'bg-ink/8 hover:bg-ink/14 active:bg-ink/20 disabled:bg-ink/8 aria-disabled:bg-ink/8',
        },
        {
          color: 'neutral',
          variant: 'ghost',
          class:
            'bg-transparent hover:bg-ink/10 active:bg-ink/16 disabled:bg-transparent aria-disabled:bg-transparent',
        },
        {
          color: 'success',
          variant: 'solid',
          class: 'text-on-success',
        },
        {
          color: 'info',
          variant: 'solid',
          class: 'text-on-info',
        },
        {
          color: 'warning',
          variant: 'solid',
          class: 'text-on-warning',
        },
      ],
    },
    input: fieldTheme,
    inputNumber: fieldTheme,
    textarea: fieldTheme,
    select: {
      ...fieldTheme,
      slots: {
        ...fieldTheme.slots,
        content: floatingContent,
        item: menuItem,
        itemTrailingIcon: 'text-primary',
      },
      variants: {
        ...fieldTheme.variants,
        variant: {
          outline:
            'border border-border bg-transparent ring-0 hover:bg-transparent disabled:bg-transparent',
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
    tabs: {
      slots: {
        list: 'gap-0 rounded-sm',
        trigger: 'cursor-pointer font-medium disabled:opacity-50',
        content: 'outline-none',
      },
      defaultVariants: { variant: 'link' },
    },
    slider: {
      slots: {
        track: 'bg-border',
        thumb: 'bg-surface shadow-sm ring-inset',
      },
      compoundVariants: [
        { orientation: 'horizontal', class: { track: 'h-1' } },
        { orientation: 'vertical', class: { track: 'w-1' } },
      ],
    },
    skeleton: { base: 'bg-border' },
    separator: { slots: { border: 'border-divider' } },
    pageHeader: {
      slots: {
        root: 'mb-6 border-b-0 py-0',
        wrapper: 'flex-row items-center justify-between',
        title:
          'min-w-0 text-2xl leading-tight font-medium wrap-anywhere text-balance text-ink sm:text-3xl',
        description: 'mt-2 text-sm text-muted',
        links: 'shrink-0 flex-wrap gap-2',
      },
    },
    popover: { slots: { content: floatingContent } },
    tooltip: { slots: { content: floatingContent } },
    modal: {
      slots: {
        content: 'bg-modal text-ink divide-divider',
        header: 'min-h-0 gap-3 px-6 pt-6 pb-4',
        title: 'text-lg font-medium text-ink',
        body: 'px-6 py-4',
        footer: 'justify-end gap-3 px-6 py-4',
      },
      variants: {
        transition: {
          true: {
            overlay: 'motion-reduce:animate-none',
            content: 'motion-reduce:animate-none',
          },
        },
        fullscreen: {
          false: { content: 'rounded-floating shadow-floating ring-0' },
        },
        overlay: { true: { overlay: 'bg-black/45' } },
      },
    },
    slideover: {
      slots: {
        overlay: 'bg-black/45',
        content: 'bg-modal text-ink divide-divider shadow-floating',
      },
      variants: {
        transition: {
          true: {
            overlay: 'motion-reduce:animate-none',
            content: 'motion-reduce:animate-none',
          },
        },
      },
    },
    toast: {
      slots: {
        root: `${floatingContent} px-5 py-2.5`,
        title: 'font-medium text-ink',
        description: 'text-ink',
      },
    },
    card: {
      slots: { root: 'rounded-floating shadow-none' },
    },
  },
} satisfies NuxtUIOptions;
