/**
 * analytics.ts — Umami 无 Cookie 统计模块
 * 对应 PRD 需求 3.2
 *
 * 合规要求：
 * - 不使用 Cookie
 * - 不记录图片内容或用户身份信息
 * - 仅统计功能使用频率，用于产品改进
 *
 * 使用方式：
 *   import { track } from '../lib/analytics';
 *   track('overlay_button_click', { platform: 'Midjourney' });
 */

// ── 配置 ────────────────────────────────────────────────────
// 替换为你的 Umami 实例地址和网站 ID
const UMAMI_ENDPOINT = 'https://cloud.umami.is/api/send';
const WEBSITE_ID = import.meta.env.WXT_BRIDGE_UMAMI_WEBSITE_ID as string; // ← 替换

// 是否启用统计（开发模式下可设为 false）
const ANALYTICS_ENABLED = import.meta.env.WXT_BRIDGE_UMAMI_OPEN === 'true';

// ── 事件类型定义 ─────────────────────────────────────────────
export type TrackEvent =
  | 'overlay_button_show'        // Overlay Button 成功注入并展示
  | 'overlay_button_click'       // 用户点击悬浮图标
  | 'context_menu_click'         // 右键菜单点击（兜底路径）
  | 'resolve_source_type'        // 图源识别结果
  | 'bulk_extract_trigger'       // 全页图片提取触发
  | 'site_adapter_match'         // 命中 AI 平台适配器
  | 'jump_to_main_site'          // 成功跳转主站
  | 'exif_risk_detected'         // 检测到含 GPS 等敏感 EXIF 信息
  | 'exif_panel_open'            // EXIF 面板打开
  | 'exif_clean_click'           // 点击一键脱敏
  | 'fetch_proxy_used'           // 触发了背景代理抓取
  | 'fetch_proxy_success'        // 代理抓取成功
  | 'fetch_proxy_fail'           // 代理抓取失败
  | 'popup_open'                 // Popup 打开
  | 'bulk_send'                  // 批量发送图片
  | string;                      // 允许自定义事件

export interface TrackPayload {
  /** AI 平台名称（Midjourney / 豆包 / Generic 等） */
  platform?: string;
  /** 图源类型（img / blob / canvas / background） */
  sourceType?: string;
  /** 图片数量（批量操作时） */
  count?: number;
  /** 风险等级（EXIF 相关） */
  riskLevel?: string;
  /** 错误类型 */
  errorType?: string;
  /** 其他自定义字段（不能包含任何可识别个人信息） */
  [key: string]: string | number | boolean | undefined;
}

// ── 内部实现 ─────────────────────────────────────────────────

/** 获取一个稳定的匿名会话标识（不跨会话，不关联用户身份） */
function getSessionId(): string {
  const key = 'bp_anon_sid';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

/** 获取浏览器语言（粗粒度，不精确到子地区） */
function getLanguage(): string {
  return (navigator.language || 'unknown').split('-')[0]; // 'zh-CN' → 'zh'
}

/** 发送统计事件（fire-and-forget，失败不影响主流程） */
async function sendEvent(
  eventName: TrackEvent,
  payload: TrackPayload = {}
): Promise<void> {
  if (!ANALYTICS_ENABLED || WEBSITE_ID === 'YOUR_UMAMI_WEBSITE_ID') return;

  try {
    // 确保 payload 不含敏感信息
    const safePayload = sanitizePayload(payload);

    const body = {
      type: 'event',
      payload: {
        website: WEBSITE_ID,
        name: eventName,
        data: safePayload,
        // Umami 无 Cookie 方案：用 session 标识区分会话，不持久化
        session: getSessionId(),
        language: getLanguage(),
        // 不发送 URL、referrer、IP 等可识别信息
      },
    };

    // 使用 sendBeacon 保证页面关闭时也能发送
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      navigator.sendBeacon(UMAMI_ENDPOINT, blob);
    } else {
      // sendBeacon 不可用时的兜底
      fetch(UMAMI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {}); // 静默忽略网络错误
    }
  } catch {
    // 统计失败绝不影响主流程
  }
}

/**
 * 清理 payload，确保不包含可识别个人信息
 * - 删除 URL、路径等可能含用户数据的字段
 * - 截断过长字符串
 */
function sanitizePayload(payload: TrackPayload): TrackPayload {
  const safe: TrackPayload = {};
  const ALLOWED_KEYS = [
    'platform', 'sourceType', 'count', 'riskLevel',
    'errorType', 'preset', 'action', 'method',
    'imageCount', 'success',
  ];

  for (const key of ALLOWED_KEYS) {
    if (payload[key] !== undefined) {
      const val = payload[key];
      if (typeof val === 'string') {
        // 截断超长字符串，避免意外包含 URL
        safe[key] = val.slice(0, 100);
      } else {
        safe[key] = val;
      }
    }
  }

  return safe;
}

// ── 公开 API ──────────────────────────────────────────────────

/**
 * 主埋点函数
 * @example
 *   track('overlay_button_click', { platform: 'Midjourney' });
 */
export function track(event: TrackEvent, payload: TrackPayload = {}): void {
  // 异步发送，不阻塞主线程
  sendEvent(event, payload).catch(() => {});
}

/**
 * 便捷函数：追踪图源识别结果
 */
export function trackResolveSource(
  sourceType: 'img' | 'blob' | 'canvas' | 'background' | 'unsupported',
  platform: string
): void {
  track('resolve_source_type', { sourceType, platform });
}

/**
 * 便捷函数：追踪平台适配命中
 */
export function trackAdapterMatch(platform: string): void {
  if (platform !== 'Generic') {
    track('site_adapter_match', { platform });
  }
}

/**
 * 便捷函数：追踪 EXIF 风险
 */
export function trackExifRisk(riskLevel: string, platform: string): void {
  if (riskLevel !== 'none') {
    track('exif_risk_detected', { riskLevel, platform });
  }
}
