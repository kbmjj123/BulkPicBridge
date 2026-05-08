/**
 * imageExtractor — 全页图片智能提取
 * 对应 PRD 需求 2.2：扫描当前页面，识别并列出所有可处理的图片
 *
 * 过滤规则：
 * - 宽高均 ≥ 200px
 * - 过滤 data-role="avatar" 或 URL 含 /icon/、/logo/ 的图片
 * - 支持 <img src>、CSS background-image、Blob URL
 */

export interface ExtractedImage {
  /** 原始图片 URL 或 Blob URL */
  url: string;
  /** 缩略图 Data URL（用于 Popup 预览） */
  thumbnail: string;
  width: number;
  height: number;
  /** 图源类型 */
  sourceType: 'img' | 'background' | 'blob' | 'canvas';
  /** 对应的 DOM 元素引用（内存中） */
  element?: Element;
}

// 需要过滤的 URL 关键词
const SKIP_URL_PATTERNS = [
  '/icon/', '/icons/',
  '/logo/', '/logos/',
  '/avatar/', '/avatars/',
  '/favicon',
  'data:image/svg',
  'sprite',
  '/badge/',
  '/button/',
  '/thumb/1x1',  // 1像素追踪图
];

// 需要过滤的 DOM 属性
const SKIP_ROLES = ['avatar', 'icon', 'logo', 'button', 'banner-small'];

/**
 * 判断图片是否应该被跳过
 */
function shouldSkipImage(el: Element, url: string): boolean {
  // URL 黑名单
  const lurl = url.toLowerCase();
  if (SKIP_URL_PATTERNS.some(p => lurl.includes(p))) return true;

  // data-role 过滤
  const role = el.getAttribute('data-role') || el.getAttribute('role') || '';
  if (SKIP_ROLES.some(r => role.toLowerCase().includes(r))) return true;

  // alt 文本暗示（头像、图标等）
  const alt = (el.getAttribute('alt') || '').toLowerCase();
  if (['avatar', 'icon', 'logo', 'profile'].some(w => alt.includes(w))) return true;

  // 父容器类名过滤
  const parentClass = (el.parentElement?.className || '').toLowerCase();
  if (['avatar', 'icon', 'logo', 'emoji', 'badge'].some(w => parentClass.includes(w))) return true;

  return false;
}

/**
 * 从 <img> 元素生成缩略图 Data URL
 * 使用 Canvas 缩放到 80×80 以内
 */
function generateThumbnail(img: HTMLImageElement): string {
  try {
    const MAX_SIZE = 80;
    const ratio = Math.min(MAX_SIZE / img.naturalWidth, MAX_SIZE / img.naturalHeight, 1);
    const w = Math.round(img.naturalWidth * ratio);
    const h = Math.round(img.naturalHeight * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return img.src;

    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    // 跨域图片无法绘制到 canvas，直接用原 URL 作缩略图
    return img.src;
  }
}

/**
 * 提取 CSS background-image 中的所有图片 URL
 */
function extractBackgroundImages(minWidth: number, minHeight: number): ExtractedImage[] {
  const results: ExtractedImage[] = [];
  const allElements = document.querySelectorAll('*');

  allElements.forEach(el => {
    const style = getComputedStyle(el);
    const bg = style.backgroundImage;
    if (!bg || bg === 'none') return;

    // 提取所有 url() 中的链接（可能有多个背景）
    const urlMatches = bg.matchAll(/url\(["']?([^"')]+)["']?\)/g);
    for (const match of urlMatches) {
      const url = match[1];
      if (!url || url.startsWith('data:image/svg')) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < minWidth || rect.height < minHeight) continue;
      if (shouldSkipImage(el, url)) continue;

      results.push({
        url,
        thumbnail: url, // background 图片无法直接生成缩略图
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        sourceType: 'background',
        element: el,
      });
    }
  });

  return results;
}

/**
 * 主函数：提取页面所有符合条件的图片
 */
export async function extractPageImages(adapter: SiteAdapter): Promise<ExtractedImage[]> {
  const results: ExtractedImage[] = [];
  const seenUrls = new Set<string>();

  const { minWidth, minHeight } = adapter;

  // ── 1. 提取所有 <img> 元素 ──────────────────────────────
  const imgSelector = adapter.imageSelector
    ? adapter.imageSelector.split(',').filter(s => !s.trim().startsWith('canvas')).join(',')
    : 'img';

  let imgElements: NodeListOf<Element>;
  try {
    imgElements = document.querySelectorAll(imgSelector || 'img');
  } catch {
    imgElements = document.querySelectorAll('img');
  }

  for (const el of imgElements) {
    if (el.tagName !== 'IMG') continue;
    const img = el as HTMLImageElement;

    // 等待图片加载
    if (!img.complete || img.naturalWidth === 0) continue;

    // 尺寸过滤
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w < minWidth || h < minHeight) continue;

    const url = img.currentSrc || img.src;
    if (!url || seenUrls.has(url)) continue;
    if (shouldSkipImage(img, url)) continue;

    // 过滤跳过容器
    if (adapter.skipContainerSelector && img.closest(adapter.skipContainerSelector)) continue;

    const cleanedUrl = adapter.cleanUrl ? adapter.cleanUrl(url) : url;
    seenUrls.add(cleanedUrl);

    results.push({
      url: cleanedUrl,
      thumbnail: generateThumbnail(img),
      width: w,
      height: h,
      sourceType: img.src.startsWith('blob:') ? 'blob' : 'img',
      element: img,
    });
  }

  // ── 2. 提取 Canvas 元素（针对 Midjourney 等） ────────────
  if (adapter.mayUseCanvas) {
    const canvases = document.querySelectorAll('canvas');
    for (const canvas of canvases) {
      const w = canvas.width;
      const h = canvas.height;
      if (w < minWidth || h < minHeight) continue;
      if (adapter.skipContainerSelector && canvas.closest(adapter.skipContainerSelector)) continue;

      try {
        const dataUrl = canvas.toDataURL('image/png');
        if (seenUrls.has(dataUrl)) continue;
        seenUrls.add(dataUrl);

        // 生成缩略图
        const MAX = 80;
        const ratio = Math.min(MAX / w, MAX / h, 1);
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = Math.round(w * ratio);
        thumbCanvas.height = Math.round(h * ratio);
        const ctx = thumbCanvas.getContext('2d');
        ctx?.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);

        results.push({
          url: dataUrl,
          thumbnail,
          width: w,
          height: h,
          sourceType: 'canvas',
          element: canvas,
        });
      } catch {
        // Canvas 跨域污染，跳过
      }
    }
  }

  // ── 3. 提取 CSS background-image ────────────────────────
  const bgImages = extractBackgroundImages(minWidth, minHeight);
  for (const item of bgImages) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      results.push(item);
    }
  }

  // 按面积排序（大图优先）
  results.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  return results;
}

/**
 * 序列化提取结果，用于通过 Chrome 消息传递给 Popup
 * （去掉不可序列化的 element 引用）
 */
export function serializeExtractedImages(
  images: ExtractedImage[]
): Omit<ExtractedImage, 'element'>[] {
  return images.map(({ element: _el, ...rest }) => rest);
}
