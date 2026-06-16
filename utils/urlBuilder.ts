/**
 * urlBuilder — 主站跳转 URL 构建工具
 * 生成携带正确参数的 bulkpictools.com/import 跳转链接
 */

export const MAIN_SITE = import.meta.env.WXT_BRIDGE_BULKPICTOOLS_URL || 'https://bulkpictools.com';
export const IMPORT_PATH = '/import';

export type ActionType = 'auto_run' | 'upload';
export type PresetType =
  | 'youtube_thumbnail'
  | 'wechat_cover'
  | 'twitter_card'
  | 'watermark'
  | 'exif_clean'
  | string;

export interface ImportParams {
  /** 图片原始 URL（方案 A，小图） */
  url?: string;
  /** sessionId（方案 B，大图走 IndexedDB） */
  sid?: string;
  /** 触发动作 */
  action?: ActionType;
  /** 预设处理方案 */
  preset?: PresetType;
  /** 批量 URL 列表（方案 A 批量版） */
  sources?: string[];
  /** 语言前缀，如 'zh'、'ja'，默认自动检测 */
  lang?: string;
}

/**
 * 构建单图跳转 URL
 */
export function buildImportUrl(params: ImportParams): string {
  // 语言检测：自动从浏览器环境推断
  const lang = params.lang ?? (() => {
    try {
      const l = (navigator.language || 'en').split('-')[0];
      return ['zh', 'ja', 'ko'].includes(l) ? l : 'en';
    } catch { return 'en'; }
  })();
  const prefix = lang !== 'en' ? `/${lang}` : '';
  const u = new URL(MAIN_SITE + prefix + IMPORT_PATH);

  if (params.url) {
    u.searchParams.set('url', params.url);
  }
  if (params.sid) {
    u.searchParams.set('sid', params.sid);
  }
  if (params.action) {
    u.searchParams.set('action', params.action);
  }
  if (params.preset) {
    u.searchParams.set('preset', params.preset);
  }
  if (params.sources && params.sources.length > 0) {
    // 批量 URL 用逗号分隔（仅限 ≤5 张且总长度合理时）
    u.searchParams.set('sources', params.sources.join(','));
  }

  return u.toString();
}

/**
 * 判断批量传输策略
 * - ≤5 张 且 URL 总长度 ≤ 2000 字符 → URL Params
 * - 否则 → IndexedDB sessionId
 */
export function shouldUseBlobSession(
  urls: string[],
  hasBlobData = false
): boolean {
  if (hasBlobData) return true;
  if (urls.length > 5) return true;
  const totalLen = urls.join(',').length;
  return totalLen > 2000;
}

/**
 * 构建 EXIF 脱敏跳转 URL
 */
export function buildExifCleanUrl(imageUrl: string): string {
  return buildImportUrl({
    url: imageUrl,
    action: 'auto_run',
    preset: 'exif_clean',
  });
}
