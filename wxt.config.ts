import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
	manifest: {
    name: 'BulkPic Bridge',
    description: 'BulkPic Bridge — 从 Midjourney、豆包等平台一键将图片送入 bulkpictools.com 的 29 个处理工具。裁切、压缩、水印、格式转换、EXIF 脱敏，全程本地，不经过任何服务器。',
    version: '1.0.0',
    permissions: ['contextMenus', 'tabs', 'activeTab', 'alarms',
      'scripting'],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: 'popup/index.html',
      default_icon: {
        '32': 'icon-32.png',
        '128': 'icon-128.png',
      },
    },
    icons: {
      '32': 'icon-32.png',
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
