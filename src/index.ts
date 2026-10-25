export { createWebKit } from './create';
export { useWebKit } from './context';
export type {
  WebKit,
  WebKitContext,
  WebKitOptions,
  WebKitStrikeOptions,
} from './types';

// Aggregate only the curated public module entries, never their internals.
export * from './ui/index';
export * from './utils/index';
export * from './shell/index';
export * from './forum';

export { isKnownRole, roleLabels, roles } from './auth/whoami';
export type { UserRole, Whoami, WhoamiUser } from './auth/whoami';
export type { ApiClientOptions } from './api/client';
export type {
  BanUserRequest,
  CreateStrikeRequest,
  CreateStrikeResponse,
} from './api/requests';
export { default as MyStrikeListView } from './views/MyStrikeListView.vue';
export type { Theme, ThemeOverride, ThemePreference, WebTheme } from './theme';
