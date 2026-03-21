/**
 * devtools.ts — 开发调试工具
 * 仅在开发模式下启用，生产构建自动 tree-shake 掉
 *
 * 用法：在 content.ts 或 background.ts 顶部调用：
 *   import { initDevTools } from '../lib/devtools';
 *   initDevTools();
 *
 * 然后在浏览器 Console 中可以使用：
 *   BulkPicDev.extractImages()        // 手动触发图片提取
 *   BulkPicDev.testAdapter()          // 查看当前平台适配器
 *   BulkPicDev.testResolve(element)   // 测试图源识别
 *   BulkPicDev.testExif(url)          // 测试 EXIF 读取
 *   BulkPicDev.clearSessions()        // 清理 IndexedDB
 */

const IS_DEV = import.meta.env.DEV;

export function initDevTools() {
  if (!IS_DEV) return;

  const adapter = getAdapter(location.hostname);

  const devApi = {
    /** 查看当前平台适配器配置 */
    testAdapter() {
      console.group('[BulkPic DevTools] Current Adapter');
      console.log('Platform:', adapter.name);
      console.log('Hostname pattern:', adapter.hostname.toString());
      console.log('Image selector:', adapter.imageSelector);
      console.log('Container selector:', adapter.containerSelector);
      console.log('Skip selector:', adapter.skipContainerSelector);
      console.log('Min size:', `${adapter.minWidth}×${adapter.minHeight}`);
      console.log('May use Canvas:', adapter.mayUseCanvas);
      console.groupEnd();
      return adapter;
    },

    /** 手动触发全页图片提取，查看结果 */
    async extractImages() {
      console.log('[BulkPic DevTools] Extracting images...');
      const images = await extractPageImages(adapter);
      console.group(`[BulkPic DevTools] Found ${images.length} images`);
      images.forEach((img, i) => {
        console.log(`[${i + 1}] ${img.sourceType} | ${img.width}×${img.height} | ${img.url.slice(0, 80)}...`);
      });
      console.groupEnd();
      return images;
    },

    /** 测试图源识别（传入 DOM 元素） */
    async testResolve(element: Element) {
      console.log('[BulkPic DevTools] Resolving source for:', element);
      const result = await resolveImageSource(element, adapter.cleanUrl);
      console.log('[BulkPic DevTools] Result:', result);
      return result;
    },

    /** 测试 EXIF 读取 */
    async testExif(imageUrl: string) {
      const { checkExifFromUrl, generateRiskReport } = await import('./exifReader');
      console.log('[BulkPic DevTools] Reading EXIF from:', imageUrl);
      const exif = await checkExifFromUrl(imageUrl);
      const report = generateRiskReport(exif);
      console.group('[BulkPic DevTools] EXIF Report');
      console.log('Risk Level:', report.riskLevel);
      console.log('Summary:', report.summary);
      console.log('Risks:', report.risks);
      console.log('Raw EXIF:', exif?.raw);
      console.groupEnd();
      return report;
    },

    /** 查看 IndexedDB 中的 session */
    async getSession(sessionId: string) {
      const data = await getSession(sessionId);
      console.log('[BulkPic DevTools] Session:', data);
      return data;
    },

    /** 清理过期 sessions */
    async clearSessions() {
      await cleanExpiredSessions();
      console.log('[BulkPic DevTools] Expired sessions cleared');
    },

    /** 列出页面所有图片元素（不过滤） */
    listAllImages() {
      const imgs = document.querySelectorAll('img');
      console.group(`[BulkPic DevTools] All <img> elements: ${imgs.length}`);
      imgs.forEach((img, i) => {
        const rect = img.getBoundingClientRect();
        console.log(
          `[${i + 1}]`,
          `${Math.round(rect.width)}×${Math.round(rect.height)}`,
          img.naturalWidth ? `(natural: ${img.naturalWidth}×${img.naturalHeight})` : '(not loaded)',
          img.src.slice(0, 80)
        );
      });
      console.groupEnd();
      return imgs;
    },

    /** 高亮所有会被注入 Overlay Button 的图片 */
    highlightTargets() {
      const selector = adapter.imageSelector || 'img';
      let elements: NodeListOf<Element>;
      try {
        elements = document.querySelectorAll(selector);
      } catch {
        elements = document.querySelectorAll('img');
      }

      let count = 0;
      elements.forEach(el => {
        if (el.tagName === 'IMG') {
          const img = el as HTMLImageElement;
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (w >= adapter.minWidth && h >= adapter.minHeight) {
            (el as HTMLElement).style.outline = '3px solid #0ea5e9';
            (el as HTMLElement).style.outlineOffset = '2px';
            count++;
          }
        }
      });

      console.log(`[BulkPic DevTools] Highlighted ${count} target images (blue outline)`);
      console.log('Run BulkPicDev.clearHighlights() to remove');
      return count;
    },

    /** 清除高亮 */
    clearHighlights() {
      document.querySelectorAll('img').forEach(img => {
        (img as HTMLElement).style.outline = '';
        (img as HTMLElement).style.outlineOffset = '';
      });
      console.log('[BulkPic DevTools] Highlights cleared');
    },

    help() {
      console.log(`
[BulkPic DevTools] 可用命令：
  BulkPicDev.testAdapter()         — 查看当前平台适配器
  BulkPicDev.extractImages()       — 手动提取页面图片
  BulkPicDev.testResolve(el)       — 测试图源识别
  BulkPicDev.testExif(url)         — 测试 EXIF 读取
  BulkPicDev.getSession(sid)       — 查看 IndexedDB session
  BulkPicDev.clearSessions()       — 清理过期 sessions
  BulkPicDev.listAllImages()       — 列出所有图片元素
  BulkPicDev.highlightTargets()    — 高亮会注入按钮的图片
  BulkPicDev.clearHighlights()     — 清除高亮
      `);
    }
  };

  // 挂载到 window，方便在 Console 中调用
  (window as any).BulkPicDev = devApi;

  console.log(
    '%c[BulkPic DevTools] 已启用 | 输入 BulkPicDev.help() 查看命令',
    'background: #0ea5e9; color: white; padding: 2px 8px; border-radius: 4px;'
  );
}