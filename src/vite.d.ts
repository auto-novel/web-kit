export interface HtmlBootstrapOptions {
  /** Google Analytics 4 衡量 ID（例如 G-XXXXXXXXXX）；仅在生产构建启用，不配置或 false 时关闭。 */
  analytics?: string | false;
}

/** 在挂载容器内放置 <pre id="fallback-error"></pre> 以显示启动错误。 */
export declare function htmlBootstrapPlugin(options?: HtmlBootstrapOptions): {
  name: string;
  configResolved(config: { command: string; isProduction: boolean }): void;
  transformIndexHtml: {
    order: 'pre';
    handler: () => {
      tag: 'script';
      children: string;
      injectTo: 'head-prepend' | 'head';
    }[];
  };
};
