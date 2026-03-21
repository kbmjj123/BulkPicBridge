/**
 * resolveImageSource — 图源智能识别
 *
 * 签名 CDN（豆包/字节系）策略：
 * 图片已在页面加载完成，直接 canvas.drawImage → toBlob
 * 完全不发任何网络请求，彻底绕过签名校验
 */

export type ImageSource =
  | { type: 'url'; value: string }
  | { type: 'blob'; value: Blob }
  | { type: 'unsupported'; reason: string };

// ── 工具函数 ──────────────────────────────────────────────────

function extractUrlFromCss(bg: string): string | null {
  const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
  return match ? match[1] : null;
}

function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:');
}

function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

function findDataAttrUrl(element: Element): string | null {
  const dataAttrs = ['data-src', 'data-origin-src', 'data-original', 'data-origin', 'data-full-src'];
  let current: Element | null = element;
  for (let i = 0; i < 5; i++) {
    if (!current) break;
    for (const attr of dataAttrs) {
      const val = current.getAttribute(attr);
      if (val && (val.startsWith('http') || val.startsWith('/'))) return val;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * 判断是否为签名 CDN 图片（需要 canvas 导出，禁止 fetch）
 */
export function isSignedCdnUrl(url: string): boolean {
  if (!url || isDataUrl(url) || isBlobUrl(url)) return false;
  return (
    url.includes('byteimg.com') ||
    url.includes('imagex-sign') ||
    url.includes('x-signature') ||
    url.includes('x-expires')
  );
}

/**
 * 从 img 元素导出 Blob
 *
 * 豆包等跨域图片直接 drawImage 会触发 Tainted canvas 错误。
 * 解决方案：新建一个带 crossOrigin='anonymous' 的 img，
 * 重新加载同一张图片（浏览器通常有缓存，速度很快），
 * 加载成功后再 canvas 导出。
 *
 * 注意：服务器需要返回 Access-Control-Allow-Origin 头才能成功。
 * 豆包的 byteimg CDN 支持 CORS，所以这个方案可行。
 */
async function imgElementToBlob(img: HTMLImageElement): Promise<Blob | null> {
  return new Promise(resolve => {
    try {
      // 先尝试直接导出（同源图片可以直接成功）
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      try {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
        return;
      } catch {
        // 跨域 tainted，走下面的 crossOrigin 方案
      }

      // crossOrigin 方案：重新加载图片，带 CORS 头
      const corsImg = new Image();
      corsImg.crossOrigin = 'anonymous';

      corsImg.onload = () => {
        try {
          const c2 = document.createElement('canvas');
          c2.width = corsImg.naturalWidth;
          c2.height = corsImg.naturalHeight;
          const ctx2 = c2.getContext('2d');
          if (!ctx2) { resolve(null); return; }
          ctx2.drawImage(corsImg, 0, 0);
          c2.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
        } catch (e) {
          console.warn('[BulkPic] crossOrigin canvas export failed:', e);
          resolve(null);
        }
      };

      corsImg.onerror = () => {
        console.warn('[BulkPic] crossOrigin image load failed');
        resolve(null);
      };

      // 直接用原始 src，浏览器会复用缓存
      // 豆包 byteimg CDN 支持 CORS，crossOrigin='anonymous' 会触发带
      // Origin 头的请求，CDN 返回 Access-Control-Allow-Origin，canvas 解锁
      corsImg.src = img.currentSrc || img.src;

    } catch (e) {
      console.warn('[BulkPic] imgElementToBlob failed:', e);
      resolve(null);
    }
  });
}

/**
 * 在页面中找到 src 包含指定关键词且尺寸最大的 img 元素
 */
export function findLargestImg(srcKeyword: string): HTMLImageElement | null {
  const imgs = [...document.querySelectorAll('img')] as HTMLImageElement[];
  const matches = imgs.filter(img =>
    img.src.includes(srcKeyword) && img.complete && img.naturalWidth > 0
  );
  if (!matches.length) return null;
  return matches.reduce((a, b) => a.naturalWidth >= b.naturalWidth ? a : b);
}

// ── 主函数 ────────────────────────────────────────────────────

export async function resolveImageSource(
  element: Element,
  cleanUrl?: (url: string) => string
): Promise<ImageSource> {

  const clean = (url: string) => cleanUrl ? cleanUrl(url) : url;

  if (element.tagName === 'IMG') {
    const img = element as HTMLImageElement;
    const src = img.currentSrc || img.src;

    if (!src) {
      // src 为空，找子节点
      const child = element.querySelector('img');
      if (child) return resolveImageSource(child, cleanUrl);
      return { type: 'unsupported', reason: 'img src 为空' };
    }

    // ① Data URL → 直接转 Blob
    if (isDataUrl(src)) {
      const res = await fetch(src);
      return { type: 'blob', value: await res.blob() };
    }

    // ② 图片已加载完成
    if (img.complete && img.naturalWidth > 0) {

      // ── 签名 CDN：必须 canvas 导出，禁止任何 fetch ──
      if (isSignedCdnUrl(src)) {
        console.log('[BulkPic] Signed CDN → canvas export');
        const blob = await imgElementToBlob(img);
        if (blob) return { type: 'blob', value: blob };
        return { type: 'unsupported', reason: '签名图片 canvas 导出失败（跨域 tainted）' };
      }

      // ── Blob URL → 直接返回，由 Background 代理 fetch ──
      if (isBlobUrl(src)) {
        return { type: 'url', value: src };
      }

      // ── 普通 URL → 直接返回 ──
      return { type: 'url', value: clean(src) };
    }

    // 图片未加载完成，返回 URL 等待
    if (src && !isSignedCdnUrl(src)) {
      return { type: 'url', value: clean(src) };
    }

    return { type: 'unsupported', reason: '图片尚未加载完成' };
  }

  // ③ CSS background-image
  const bg = getComputedStyle(element).backgroundImage;
  if (bg && bg !== 'none') {
    const url = extractUrlFromCss(bg);
    if (url) return { type: 'url', value: clean(url) };
  }

  // ④ 父容器 data-* 属性
  const dataUrl = findDataAttrUrl(element);
  if (dataUrl) return { type: 'url', value: clean(dataUrl) };

  // ⑤ Canvas 元素
  if (element.tagName === 'CANVAS') {
    const canvas = element as HTMLCanvasElement;
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (blob) return { type: 'blob', value: blob };
    return { type: 'unsupported', reason: 'Canvas 导出失败' };
  }

  // ⑥ 子节点兜底
  const childImg = element.querySelector('img');
  if (childImg) return resolveImageSource(childImg, cleanUrl);

  return { type: 'unsupported', reason: '无法识别图片来源' };
}