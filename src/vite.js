/** 注入的脚本必须保持 ES5 语法 */
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

  document.documentElement.dataset.theme = theme;
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

  let enableAnalytics = false;
  return {
    name: 'web-kit-html-bootstrap',
    configResolved(config) {
      enableAnalytics =
        !!analytics && config.command === 'build' && config.isProduction;
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        const tags = [startupScript, themeBootstrapScript].map((children) => ({
          tag: 'script',
          children,
          injectTo: 'head-prepend',
        }));
        if (enableAnalytics) {
          tags.push({
            tag: 'script',
            children: analyticsScript(analytics),
            injectTo: 'head',
          });
        }
        return tags;
      },
    },
  };
}
