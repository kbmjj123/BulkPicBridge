import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
	manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
		default_locale: 'en',
    version: '1.0.0',
    permissions: ['contextMenus', 'tabs', 'activeTab', 'alarms',
      'scripting'],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: 'popup/index.html',
      default_icon: {
        '16': 'icon-16.png',
				'32': 'icon-32.png',
				'48': 'icon-48.png',
				'96': 'icon-96.png',
				'128': 'icon-128.png',
      },
    },
    icons: {
			'16': 'icon-16.png',
      '32': 'icon-32.png',
			'48': 'icon-48.png',
			'96': 'icon-96.png',
      '128': 'icon-128.png',
    },
    // 允许 Content Script 注入所有页面
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
  vite: () => ({
    css: {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
        ],
      },
    },
  }),
});
