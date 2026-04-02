/**
 * resolveImageSource — 图源识别
 *
 * 豆包策略：img.src 本身就是带完整签名的可用 URL，
 * 直接在 content script 里 fetch（带页面 cookie + origin/referer）即可。
 * 不需要任何 URL 清洗，不需要 canvas，不需要 background 中转。
 */
const logger = createLogger('OverlayButton')
export type ImageSource =
  | { type: 'url'; value: string }
  | { type: 'blob'; value: Blob }
  | { type: 'unsupported'; reason: string };

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
  const attrs = ['data-src', 'data-origin-src', 'data-original', 'data-origin', 'data-full-src'];
  let el: Element | null = element;
  for (let i = 0; i < 5; i++) {
    if (!el) break;
    for (const attr of attrs) {
      const val = el.getAttribute(attr);
      if (val && (val.startsWith('http') || val.startsWith('/'))) return val;
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * 判断是否需要在 content script 里 fetch（而非直接返回 URL）
 * 这类图片有防盗链，必须带页面 cookie + origin/referer 才能拿到
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
 * 在 content script（页面上下文）里 fetch 图片
 * 自动携带页面 cookie，手动补 origin + referer
 * 服务器认为是页面自身请求 → 正常返回
 */
export async function fetchWithPageContext(
  url: string,
  pageUrl: string
): Promise<Blob | null> {
  try {
    const origin = new URL(pageUrl).origin;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'origin': origin,
        'referer': origin + '/',
        'accept': 'image/*,*/*',
      },
    });

    if (!response.ok) {
      logger.warn('[BulkPic] fetch 失败:', response.status);
      return null;
    }

    const blob = await response.blob();
    logger.log('[BulkPic] fetch 成功:', blob.size, 'bytes,', blob.type);
    return blob.size > 100 ? blob : null;

  } catch (err) {
    logger.warn('[BulkPic] fetch 出错:', err);
    return null;
  }
}

// ── 主函数 ────────────────────────────────────────────────────

export async function resolveImageSource(
  element: Element,
  _cleanUrl?: (url: string) => string  // 保留参数兼容性，豆包不再需要清洗
): Promise<ImageSource> {

  if (element.tagName === 'IMG') {
    const img = element as HTMLImageElement;
    // 直接用 img.src，不做任何清洗
    const src = img.currentSrc || img.src;

    if (!src) {
      const child = element.querySelector('img');
      if (child) return resolveImageSource(child);
      return { type: 'unsupported', reason: 'img src 为空' };
    }

    if (isDataUrl(src)) {
      const res = await fetch(src);
      return { type: 'blob', value: await res.blob() };
    }

    if (img.complete && img.naturalWidth > 0) {

      // 签名 CDN：content script fetch（带页面 cookie）
      if (isSignedCdnUrl(src)) {
        const blob = await fetchWithPageContext(src, location.href);
        if (blob) return { type: 'blob', value: blob };
        return { type: 'unsupported', reason: '图片请求失败' };
      }

      // Blob URL
      if (isBlobUrl(src)) {
        return { type: 'url', value: src };
      }

      // 普通 URL
      return { type: 'url', value: src };
    }

    if (src && !isSignedCdnUrl(src)) {
      return { type: 'url', value: src };
    }

    return { type: 'unsupported', reason: '图片尚未加载完成' };
  }else if(element.tagName === 'VIDEO'){
		const video = element as HTMLVideoElement;
		const container = video.closest('a[href*="/jobs/"]');
		const img = container?.querySelector('img[src]') as HTMLImageElement | null;
		return {
			type: 'url',value: img?.src || ''
		}
	}

  // CSS background-image
  const bg = getComputedStyle(element).backgroundImage;
  if (bg && bg !== 'none') {
    const url = extractUrlFromCss(bg);
    if (url) return { type: 'url', value: url };
  }

  // 父容器 data-* 属性
  const dataUrl = findDataAttrUrl(element);
  if (dataUrl) return { type: 'url', value: dataUrl };

  // Canvas
  if (element.tagName === 'CANVAS') {
    const canvas = element as HTMLCanvasElement;
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (blob) return { type: 'blob', value: blob };
    return { type: 'unsupported', reason: 'Canvas 导出失败' };
  }

  // 子节点兜底
  const childImg = element.querySelector('img');
  if (childImg) return resolveImageSource(childImg);

  return { type: 'unsupported', reason: '无法识别图片来源' };
}