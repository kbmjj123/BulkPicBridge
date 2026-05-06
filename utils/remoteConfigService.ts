/**
 * remoteConfigService — 远程配置服务
 *
 * 职责：
 * 1. 从 Cloudflare R2 拉取 menu-config.json
 * 2. 缓存到 chrome.storage.local（24 小时有效）
 * 3. 拉取失败时使用内置兜底配置
 * 4. 提供按域名获取站点配置的工具函数
 */

import { DEFAULT_CONFIG } from './config';

const CONFIG_URL = 'https://cdn.bulkpictools.com/bridge/menu-config.json';
const CACHE_KEY = 'remote_config';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时

interface CachedConfig {
  config: RemoteConfig;
  fetchedAt: number;
}

// ── 内存缓存（同一 Service Worker 生命周期内复用） ────────────
let memoryCache: RemoteConfig | null = null;

/**
 * 获取配置（优先内存缓存 → chrome.storage → 远程 fetch → 兜底）
 */
export async function getConfig(): Promise<RemoteConfig> {
  // 1. 内存缓存（最快）
  if (memoryCache) return memoryCache;

  // 2. chrome.storage 持久缓存
  const stored = await getCachedConfig();
  if (stored) {
    memoryCache = stored;
    return stored;
  }

  // 3. 远程 fetch
  const fetched = await fetchRemoteConfig();
  if (fetched) {
    memoryCache = fetched;
    await saveCachedConfig(fetched);
    return fetched;
  }

  // 4. 兜底
  console.warn('[BulkPic] 使用内置兜底配置');
  memoryCache = DEFAULT_CONFIG;
  return DEFAULT_CONFIG;
}

/**
 * 强制刷新配置（插件更新、24 小时到期时调用）
 */
export async function refreshConfig(): Promise<RemoteConfig> {
  memoryCache = null;
  const fetched = await fetchRemoteConfig();
  if (fetched) {
    memoryCache = fetched;
    await saveCachedConfig(fetched);
    return fetched;
  }
  // fetch 失败，保留旧缓存
  const stored = await getCachedConfig(true); // 忽略过期
  if (stored) {
    memoryCache = stored;
    return stored;
  }
  return DEFAULT_CONFIG;
}

/**
 * 从 R2 拉取最新配置
 */
async function fetchRemoteConfig(): Promise<RemoteConfig | null> {
  try {
    const resp = await fetch(CONFIG_URL, {
      cache: 'no-cache',
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json() as RemoteConfig;

    // 基础校验
    if (!json.tools || !json.sites) throw new Error('配置格式错误');

    console.log('[BulkPic] 远程配置拉取成功, version:', json.version);
    return json;
  } catch (err) {
    console.warn('[BulkPic] 远程配置拉取失败:', err);
    return null;
  }
}

/**
 * 从 chrome.storage 读取缓存
 */
async function getCachedConfig(ignoreExpiry = false): Promise<RemoteConfig | null> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cached = result[CACHE_KEY] as CachedConfig | undefined;
    if (!cached) return null;

    const isExpired = Date.now() - cached.fetchedAt > CACHE_TTL_MS;
    if (isExpired && !ignoreExpiry) {
      console.log('[BulkPic] 配置缓存已过期，需要刷新');
      return null;
    }

    return cached.config;
  } catch {
    return null;
  }
}

/**
 * 保存配置到 chrome.storage
 */
async function saveCachedConfig(config: RemoteConfig): Promise<void> {
  try {
    const cached: CachedConfig = { config, fetchedAt: Date.now() };
    await chrome.storage.local.set({ [CACHE_KEY]: cached });
  } catch (err) {
    console.warn('[BulkPic] 配置缓存保存失败:', err);
  }
}

// ── 配置查询工具函数 ───────────────────────────────────────────

/**
 * 获取指定域名的站点配置，找不到时返回 default
 */
export function getSiteConfig(
  config: RemoteConfig,
  hostname: string
): SiteConfig & { minWidth: number; minHeight: number } {
  // 精确匹配
  if (config.sites[hostname]) {
    return mergeSiteConfig(config, config.sites[hostname]);
  }

  // 去掉 www 前缀再匹配
  const withoutWww = hostname.replace(/^www\./, '');
  if (config.sites[withoutWww]) {
    return mergeSiteConfig(config, config.sites[withoutWww]);
  }

  // 父域名匹配（如 sub.doubao.com 匹配 doubao.com）
  const parts = hostname.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join('.');
    if (config.sites[parent]) {
      return mergeSiteConfig(config, config.sites[parent]);
    }
  }

  // 兜底 default
  return mergeSiteConfig(config, config.sites['default'] ?? DEFAULT_CONFIG.sites['default']);
}

/**
 * 合并站点配置和全局 imageFilter，确保 minWidth/minHeight 有值
 */
function mergeSiteConfig(
  config: RemoteConfig,
  site: SiteConfig
): SiteConfig & { minWidth: number; minHeight: number } {
  return {
    ...site,
    minWidth: site.minWidth ?? config.imageFilter.minWidth,
    minHeight: site.minHeight ?? config.imageFilter.minHeight,
  };
}

/**
 * 获取 menuTools 对应的完整工具信息（已过滤 disabled）
 */
export function getMenuTools(
  config: RemoteConfig,
  menuToolSlugs: string[]
): ToolConfig[] {
  const toolMap = new Map(config.tools.map(t => [t.slug, t]));
  return menuToolSlugs
    .map(slug => toolMap.get(slug))
    .filter((t): t is ToolConfig => !!t && t.enabled)
    .sort((a, b) => a.order - b.order);
}

/**
 * 获取 quickTool 对应的工具信息
 */
export function getQuickTool(
  config: RemoteConfig,
  slug: string
): ToolConfig | null {
  return config.tools.find(t => t.slug === slug && t.enabled) ?? null;
}

/**
 * 检查域名是否在黑名单中
 * 支持精确匹配和 *.example.com 通配符
 */
export function isBlacklisted(hostname: string, blacklist: string[]): boolean {
  const h = hostname.toLowerCase();
  return blacklist.some(pattern => {
    const p = pattern.toLowerCase();
    if (p.startsWith('*.')) {
      // 通配符：*.example.com 匹配 sub.example.com
      const domain = p.slice(2);
      return h === domain || h.endsWith('.' + domain);
    }
    return h === p || h.endsWith('.' + p);
  });
}

/**
 * 获取工具标签（多语言）
 */
export function getToolLabel(tool: ToolConfig, lang: string): string {
  return tool.label[lang] ?? tool.label['en'] ?? tool.slug;
}