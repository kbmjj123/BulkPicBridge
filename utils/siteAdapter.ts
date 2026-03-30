export interface SiteAdapter {
  hostname: string | RegExp;
  name: string;
  imageSelector?: string;
  containerSelector?: string;
  minWidth: number;
  minHeight: number;
  mayUseCanvas?: boolean;
  cleanUrl?: (url: string) => string;
  skipContainerSelector?: string;
	preset?: string;
}

function cleanDoubaoUrl(url: string): string {
  try {
    const u = new URL(url);
    // 去掉 ~tplv 及其后缀（如 ~tplv-xxx-downsize_watermark_1_5_b.png）
    // u.pathname = u.pathname.replace(/~tplv[^?#]*/, '');
    return u.toString();
  } catch {
    return url;
  }
}

function cleanLeonardoUrl(url: string): string {
  try {
    const u = new URL(url);
    ['w', 'h', 'width', 'height', 'q', 'quality', 'fit', 'auto', 'format'].forEach(p =>
      u.searchParams.delete(p)
    );
    return u.toString();
  } catch {
    return url;
  }
}

export const SITE_ADAPTERS: SiteAdapter[] = [
  {
    hostname: /midjourney\.com$/,
    name: 'Midjourney',
    imageSelector: 'img[src*="cdn.midjourney.com"], canvas',
    minWidth: 200,
    minHeight: 200,
    mayUseCanvas: true,
    skipContainerSelector: 'nav, header, .sidebar',
  },
  {
    hostname: /doubao\.com$/,
    name: '豆包',
    imageSelector: 'img[src*="byteimg.com"]',
    minWidth: 200,
    minHeight: 200,
    cleanUrl: cleanDoubaoUrl,
    skipContainerSelector: 'header, nav, [data-testid="file_drop_area"]',
  },
  {
    hostname: /bing\.com$/,
    name: 'Bing Image Creator (DALL-E)',
    imageSelector: 'img.mimg, .gir_mmimg img, [class*="imageResult"] img',
    minWidth: 200,
    minHeight: 200,
    skipContainerSelector: 'header, #b_header, nav',
  },
  {
    hostname: /app\.leonardo\.ai$/,
    name: 'Leonardo.ai',
    imageSelector: 'img[src*="cdn.leonardo.ai"], img[src*="generations"]',
    minWidth: 200,
    minHeight: 200,
    cleanUrl: cleanLeonardoUrl,
  },
  {
    hostname: /openai\.com$/,
    name: 'ChatGPT (DALL-E)',
    imageSelector: 'img[src*="oaidalleapiprodscus"]',
    minWidth: 200,
    minHeight: 200,
  },
  {
    hostname: /stability\.ai$/,
    name: 'Stability AI',
    imageSelector: '.generated-image img',
    minWidth: 200,
    minHeight: 200,
  },
  {
    hostname: /.*/,
    name: 'Generic',
    imageSelector: 'img',
    minWidth: 200,
    minHeight: 200,
  },
];

export function getAdapter(hostname: string): SiteAdapter {
  for (const adapter of SITE_ADAPTERS) {
    if (adapter.hostname instanceof RegExp) {
      if (adapter.hostname.test(hostname)) return adapter;
    } else {
      if (hostname === adapter.hostname || hostname.endsWith('.' + (adapter.hostname as string))) {
        return adapter;
      }
    }
  }
  return SITE_ADAPTERS[SITE_ADAPTERS.length - 1];
}

export function isKnownAIPlatform(hostname: string): boolean {
  return getAdapter(hostname).name !== 'Generic';
}