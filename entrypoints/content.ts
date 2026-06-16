/**
 * content.ts — Content Script 主入口（v1 + v2 合并版）
 *
 * 基于用户最新代码，追加 v2 新增逻辑：
 * 1. 启动时拉取远程配置，检查黑名单
 * 2. 使用 OverlayButtonV2（三按钮：快捷工具 + checkbox + 菜单）
 * 3. 处理 Sidebar 的图片 fetch 请求（FETCH_IMAGE_FOR_SIDEBAR）
 * 4. 处理选中状态同步（bulkpic:selectionChange → FORWARD_TO_SIDEBAR）
 * 5. 处理 Sidebar 发来的取消选中 / 清空指令
 */


const logger = createLogger('content')

// 主站域名和导入路径（可配置）
const MAIN_SITE = import.meta.env.WXT_BRIDGE_BULKPICTOOLS_URL || 'https://bulkpictools.com'
const IMPORT_PATH = '/import'
const BUTTON_FORBIDEN_HOST = ['bulkpictools.com', import.meta.env.WXT_BRIDGE_BULKPICTOOLS_URL]

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  async main() {
    // 跳过 iframe（无法跨域访问）
    if (window.self !== window.top) return;

    const hostname = location.hostname;

    // ── 拉取远程配置 ──────────────────────────────────────────
    const config = await getConfig();

    // 主站 /import 页面：数据中转桥接（必须在黑名单检查之前，否则会被拦截）
    if (MAIN_SITE.indexOf(hostname) > -1 && /\/import$/.test(location.pathname)) {
      handleImportBridge();
      return;
    }

    if (isBlacklisted(hostname, config.blacklist)) {
      logger.log('[BulkPic Bridge] 黑名单域名，跳过注入:', hostname);
      return;
    }

    const siteConfig = getSiteConfig(config, hostname);

		let manager: OverlayButtonManager | null = null;
		if(BUTTON_FORBIDEN_HOST.findIndex(item => item.indexOf(hostname) > -1) === -1){
			// ── 初始化 OverlayButtonManager v2（三按钮） ────────────
			manager = new OverlayButtonManager(config, hostname);
			manager.init();
		}


    // 埋点：平台适配命中
    trackAdapterMatch(hostname);

    // EXIF 面板初始化
    initExifPanel();

    // ── 消息监听 ─────────────────────────────────────────────
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {

      // 右键菜单触发的 EXIF 检测
      if (message.type === 'SHOW_EXIF_PANEL' && message.imageUrl) {
        triggerExifCheck(message.imageUrl);
        return false;
      }

      // Popup 触发的全页图片提取
      if (message.type === 'EXTRACT_ALL_IMAGES') {
        track('bulk_extract_trigger', { platform: hostname });
        // 构建临时适配器供 extractor 使用
        const adapter = {
          name: hostname,
          hostname: new RegExp(hostname),
          minWidth: siteConfig.minWidth,
          minHeight: siteConfig.minHeight,
          imageSelector: siteConfig.imageSelector,
          skipContainerSelector: siteConfig.skipContainerSelector,
        } as any;
        extractPageImages(adapter).then(images => {
          const serialized = serializeExtractedImages(images);
          sendResponse({ images: serialized, count: serialized.length });
        }).catch(err => {
          logger.error('[BulkPic] Extract error:', err);
          sendResponse({ images: [], count: 0, error: err.message });
        });
        return true;
      }

      // v2：Sidebar 请求 fetch 签名 CDN 图片（必须在页面上下文里 fetch）
      if (message.type === 'FETCH_IMAGE_FOR_SIDEBAR' && message.url) {
        fetchWithPageContext(message.url, location.href)
          .then(async blob => {
            if (!blob) { sendResponse({ success: false }); return; }
            const arrayBuffer = await blob.arrayBuffer();
            sendResponse({
              success: true,
              arrayBuffer: arrayBufferToBase64(arrayBuffer),
              mimeType: blob.type || 'image/jpeg',
            });
          })
          .catch(() => sendResponse({ success: false }));
        return true;
      }

      // v2：Sidebar 发来的取消选中指令
      if (message.type === 'DESELECT_IMAGE') {
        window.dispatchEvent(new CustomEvent('bulkpic:deselect', {
          detail: { url: message.url },
        }));
        return false;
      }

      // v2：Sidebar 发来的清空选中指令
      if (message.type === 'CLEAR_SELECTION') {
        clearSelection();
        return false;
      }

      // Sidebar 挂载时拉取当前选中数据（解决首次打开竞争条件）
      if (message.type === 'GET_SELECTION') {
        sendResponse({ images: getSelectedImages() });
        return false;
      }

      return false;
    });

    // OverlayButton 触发的 EXIF 自定义事件
    window.addEventListener('bulkpic:showExif', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      showExifPanel(detail.report, detail.imageUrl, detail.targetRect);
    });

    // v2：选中变化 → 广播给 Sidebar（通过 background 转发）
    window.addEventListener('bulkpic:selectionChange', async (e: Event) => {
      const detail = (e as CustomEvent).detail;
			logger.log('[BulkPic] Selection change:', detail.images);
      // 先尝试打开/确保 Sidebar 已打开，再转发数据
      try {
        await browser.runtime.sendMessage({ type: 'OPEN_SIDEBAR' });
      } catch {
        // 打开失败不影响数据推送（Sidebar 可能已打开）
      }
      browser.runtime.sendMessage({
        type: 'FORWARD_TO_SIDEBAR',
        payload: {
          type: 'SELECTION_CHANGE',
          images: detail.images,
        },
      }).catch(() => {});
    });

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      manager && manager.destroy();
    });

    // 开发模式下挂载 DevTools 调试工具
    if (import.meta.env.DEV) {
      initDevTools();
    }

    // 统计：页面是否是已知 AI 平台
    track('site_adapter_match', { platform: hostname });
  },
});

// ── EXIF Panel ─────────────────────────────────────────────────

let exifPanelEl: HTMLElement | null = null;

async function triggerExifCheck(imageUrl: string) {

  let exif = null;

  if (isSignedCdnUrl(imageUrl)) {
    const img = [...document.querySelectorAll('img')].find(
      (el) => {
        const i = el as HTMLImageElement;
        return i.src.includes('byteimg.com') && i.complete && i.naturalWidth > 0;
      }
    ) as HTMLImageElement | undefined;

    if (img) {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise<Blob | null>(resolve =>
          canvas.toBlob(resolve, 'image/jpeg', 1.0)
        );
        if (blob) exif = await checkExifFromBlob(blob);
      }
    } else {
      logger.warn('[BulkPic] 签名 CDN 图片未在页面找到已加载的 img 元素');
    }
  } else {
    exif = await checkExifFromUrl(imageUrl);
  }

  const report = generateRiskReport(exif);
  trackExifRisk(report.riskLevel, location.hostname);
  showExifPanel(report, imageUrl, null);
}

function showExifPanel(
  report: {
    riskLevel: string;
    risks: string[];
    summary: string;
    data: { hasGPS: boolean; gpsLatitude?: number; gpsLongitude?: number };
  },
  imageUrl: string | null,
  _targetRect: DOMRect | null
) {
  exifPanelEl?.remove();
  track('exif_panel_open', { riskLevel: report.riskLevel });

  const panel = document.createElement('div');
  panel.setAttribute('data-bulkpic-exif-panel', 'true');
  const shadow = panel.attachShadow({ mode: 'open' });

  const riskColorMap: Record<string, string> = {
    high: '#ef4444', medium: '#f97316', low: '#eab308', none: '#22c55e',
  };
  const riskColor = riskColorMap[report.riskLevel] || '#6b7280';
  const riskLabelMap: Record<string, string> = {
    high: '高风险', medium: '中风险', low: '低风险', none: '安全',
  };

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .panel {
        position: fixed; bottom: 24px; right: 24px; width: 320px;
        background: #1c1917; border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px; padding: 14px; z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
        font-size: 12px; color: #f5f5f4;
        box-shadow: 0 12px 32px rgba(0,0,0,0.50); animation: slideIn 0.2s ease;
      }
      @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
      .title { font-weight:600; font-size:14px; display:flex; align-items:center; gap:6px; }
      .badge {
        display:inline-flex; align-items:center; padding:2px 8px; border-radius:4px;
        font-size:10px; font-weight:600;
        background:${riskColor}22; color:${riskColor}; border:1px solid ${riskColor}44;
      }
      .close-btn {
        background:transparent; border:none; color:#94a3b8; cursor:pointer;
        font-size:20px; line-height:1; border-radius:4px; padding:0 2px; transition:color 0.15s;
      }
      .close-btn:hover { color:#e2e8f0; }
      .summary {
        font-size:12px; line-height:1.5; color:#a8a29e; margin-bottom:10px;
        padding:8px 10px; background:rgba(255,255,255,0.03);
        border-radius:0 6px 6px 0; border-left:3px solid ${riskColor};
      }
      .risk-list { list-style:none; margin:0 0 12px; padding:0; display:flex; flex-direction:column; gap:4px; }
      .risk-item { font-size:12px; color:#94a3b8; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
      .gps-coords {
        font-size:11px; color:#ef4444; margin-bottom:10px;
        font-family:ui-monospace, 'SF Mono', 'Courier New', monospace; background:rgba(239,68,68,0.06);
        padding:6px 8px; border-radius:4px;
      }
      .action-btn {
        width:100%; padding:10px; background:#4f46e5; color:white; border:none;
        border-radius:6px; font-size:13px; font-weight:600; cursor:pointer;
        transition:background 0.15s; font-family:inherit;
      }
      .action-btn:hover:not(:disabled) { background:#6366f1; }
      .action-btn:disabled { background:#292524; color:#78716c; cursor:default; }
      .brand { margin-top:10px; text-align:center; font-size:11px; color:#78716c; }
      .brand a { color:#818cf8; text-decoration:none; }
    </style>
    <div class="panel">
      <div class="header">
        <div class="title">
          🔍 隐私体检
          <span class="badge">${riskLabelMap[report.riskLevel] ?? '未知'}</span>
        </div>
        <button class="close-btn" id="closeBtn">×</button>
      </div>
      <div class="summary">${report.summary}</div>
      ${report.risks.length > 0 ? `
        <ul class="risk-list">
          ${report.risks.map(r => `<li class="risk-item">${r}</li>`).join('')}
        </ul>` : ''}
      ${report.data.hasGPS && report.data.gpsLatitude != null ? `
        <div class="gps-coords">
          📍 ${report.data.gpsLatitude.toFixed(6)}, ${report.data.gpsLongitude?.toFixed(6)}
        </div>` : ''}
      <button class="action-btn" id="cleanBtn" ${!imageUrl ? 'disabled' : ''}>
        ${imageUrl ? '🛡️ 一键前往 BulkPicTools 脱敏'
          : report.riskLevel === 'none' ? '✅ 此图无需脱敏' : '⚠️ 图片已本地处理'}
      </button>
      <div class="brand">
        由 <a href="https://bulkpictools.com" target="_blank">BulkPicTools</a> 提供隐私保护
      </div>
    </div>
  `;

  shadow.getElementById('closeBtn')?.addEventListener('click', () => {
    panel.remove(); exifPanelEl = null;
  });

  const cleanBtn = shadow.getElementById('cleanBtn');
  if (cleanBtn && imageUrl) {
    cleanBtn.addEventListener('click', () => {
      track('exif_clean_click', { riskLevel: report.riskLevel });
      window.open(buildExifCleanUrl(imageUrl), '_blank');
    });
  }

  document.body.appendChild(panel);
  exifPanelEl = panel;

  if (report.riskLevel !== 'high') {
    setTimeout(() => {
      if (exifPanelEl === panel) { panel.remove(); exifPanelEl = null; }
    }, 8000);
  }
}

function initExifPanel() {
  // 占位：未来可在此预加载 exifReader 模块
}

// ── Import Bridge ──────────────────────────────────────────────

async function handleImportBridge() {
  const params = new URLSearchParams(location.search);
  const sid = params.get('sid');
  const url = params.get('url');

  if (!sid && !url) return;

  logger.log('[BulkPic Bridge] Import bridge 启动, sid:', sid);

  await waitForPageReady();

  logger.log('[BulkPic Bridge] 页面就绪，开始读取数据');

  if (sid) {
    try {
      const resp = await browser.runtime.sendMessage({
        type: 'GET_BLOB_SESSION',
        sid,
      });

      if (!resp?.success || !resp?.base64Array) {
        logger.error('[BulkPic Bridge] background 未返回数据:', resp?.error);
        window.postMessage({
          source: 'bulkpic-bridge',
          type: 'SESSION_ERROR',
          sid,
          error: resp?.error ?? 'session_not_found',
        }, location.origin);
        return;
      }

      const mimeType = resp.mimeType || 'image/png';
      const blobs = resp.base64Array.map((base64: string) => {
        const arrayBuffer = base64ToArrayBuffer(base64);
        return new Blob([arrayBuffer], { type: mimeType });
      });

      logger.log('[BulkPic Bridge] 推送 blobs 给主站:', blobs.length, '张,', mimeType);

      window.postMessage({
        source: 'bulkpic-bridge',
        type: 'SESSION_READY',
        sid,
        blobs,
        mimeType,
      }, location.origin);

      browser.runtime.sendMessage({ type: 'DELETE_SESSION', sid });

    } catch (err) {
      logger.error('[BulkPic Bridge] 出错:', err);
      window.postMessage({
        source: 'bulkpic-bridge',
        type: 'SESSION_ERROR',
        sid,
        error: String(err),
      }, location.origin);
    }
  }
}

function waitForPageReady(timeout = 10000): Promise<void> {
  return new Promise(resolve => {
    if ((window as any).__bulkpicPageReady) { resolve(); return; }

    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      logger.warn('[BulkPic Bridge] 等待 PAGE_READY 超时，直接继续');
      resolve();
    }, timeout);

    function handler(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.data?.source !== 'bulkpic-bridge-page') return;
      if (event.data?.type !== 'PAGE_READY') return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      resolve();
    }

    window.addEventListener('message', handler);
  });
}