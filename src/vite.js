import { minify } from 'vite';

/** 生产构建压缩目标为 ES2015，脚本在应用入口之前执行。 */
const startupScript = `(function () {
  function report(message) {
    // Vue 挂载后会移除该节点；head 执行时 body 尚未解析，必须延迟查询。
    var fallback = document.getElementById('fallback-error');
    if (fallback) {
      fallback.appendChild(document.createTextNode('Error: ' + message + '\\n'));
    }
  }

  window.addEventListener('error', function (event) {
    if (String(event.message).indexOf('ResizeObserver loop') !== -1) {
      return;
    }
    if (event.message) {
      report(event.lineno + ':' + event.colno + ' ' + event.message + ' ' + (event.filename || ''));
    } else if (event.target && event.target.tagName === 'SCRIPT' && event.target.type === 'module') {
      report('Failed to load module: ' + event.target.src);
    }
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    report('Unhandled rejection: ' + (reason && reason.message ? reason.message : String(reason)));
  });
})();`;

const themeBootstrapScript = `(function () {
  var theme;
  try {
    theme = JSON.parse(localStorage.getItem('web-kit:theme:v1'));
  } catch (error) {
    // 无效 JSON 或存储不可用时，和 kit 运行时一样跟随系统。
  }

  if (theme !== 'light' && theme !== 'dark') {
    theme = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
})();`;

const analyticsScript = (id) => `(function () {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', ${JSON.stringify(id)});

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ${JSON.stringify(id)};
  document.head.appendChild(script);
})();`;

export function htmlBootstrapPlugin({ analytics } = {}) {
  if (analytics && !/^G-[A-Z0-9]+$/.test(analytics)) {
    throw new Error(
      'analytics must be a Google Analytics 4 measurement ID (G-…).',
    );
  }

  let productionBuild = false;
  return {
    name: 'web-kit-html-bootstrap',
    configResolved(config) {
      productionBuild = config.command === 'build' && config.isProduction;
    },
    transformIndexHtml: {
      order: 'pre',
      async handler() {
        const tags = [startupScript, themeBootstrapScript].map((children) => ({
          tag: 'script',
          children,
          injectTo: 'head-prepend',
        }));
        if (analytics && productionBuild) {
          tags.push({
            tag: 'script',
            children: analyticsScript(analytics),
            injectTo: 'head',
          });
        }
        if (productionBuild) {
          await Promise.all(
            tags.map(async (tag) => {
              const { code, errors } = await minify(
                'bootstrap.js',
                tag.children,
                {
                  module: false,
                  compress: { target: 'es2015' },
                  mangle: true,
                  codegen: { removeWhitespace: true, legalComments: 'none' },
                },
              );
              if (errors.length) {
                throw new Error(
                  errors.map(({ message }) => message).join('\n'),
                );
              }
              tag.children = code;
            }),
          );
        }
        return tags;
      },
    },
  };
}
