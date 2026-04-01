/**
 * content.ts — Content Script 主入口
 *
 * 职责：
 * 1. 初始化 OverlayButtonManager（根据当前平台选择适配器）
 * 2. 处理 EXIF 面板展示
 * 3. 处理 Popup 发来的 EXTRACT_ALL_IMAGES 消息
 * 4. 接收来自 background 的消息
 * 5. 统计埋点
 */
const logger = createLogger('content')
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    // 跳过 iframe（无法跨域访问）
    if (window.self !== window.top) return;

    const hostname = location.hostname;
    const adapter = getAdapter(hostname);

    // 埋点：平台适配命中
    trackAdapterMatch(adapter.name);

    // 初始化悬浮按钮管理器
    const manager = new OverlayButtonManager(adapter);
    manager.init();

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
        track('bulk_extract_trigger', { platform: adapter.name });

        extractPageImages(adapter).then(images => {
          const serialized = serializeExtractedImages(images);
          sendResponse({ images: serialized, count: serialized.length });
        }).catch(err => {
          logger.error('[BulkPic] Extract error:', err);
          sendResponse({ images: [], count: 0, error: err.message });
        });

        return true; // 异步响应
      }

      return false;
    });

    // OverlayButton 触发的 EXIF 自定义事件
    window.addEventListener('bulkpic:showExif', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      showExifPanel(detail.report, detail.imageUrl, detail.targetRect);
    });

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      manager.destroy();
    });

    // ── 主站 /import 页面：读插件 IDB → postMessage 给页面 ──
    // content script 运行在主站页面里，但属于插件 Origin，
    // 可以访问插件的 IndexedDB，是插件到主站的数据桥梁
    if (MAIN_SITE.indexOf(hostname) > -1 && IMPORT_PATH.indexOf(location.pathname) > -1) {
      handleImportBridge();
    }

    // 开发模式下挂载 DevTools 调试工具
    if (import.meta.env.DEV) {
      initDevTools();
    }

    // 统计：页面是否是已知 AI 平台
    if (isKnownAIPlatform(hostname)) {
      track('site_adapter_match', { platform: adapter.name });
    }
  },
});

// ── EXIF Panel ─────────────────────────────────────────────────

let exifPanelEl: HTMLElement | null = null;

async function triggerExifCheck(imageUrl: string) {
  const { checkExifFromBlob, checkExifFromUrl, generateRiskReport } = await import('../utils/exifReader');
  const { trackExifRisk } = await import('../utils/analytics');
  const { isSignedCdnUrl } = await import('../utils/resolveImageSource');

  let exif = null;

  if (isSignedCdnUrl(imageUrl)) {
    // 签名 CDN：从页面已加载的 img 元素 canvas 导出，不发请求
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
    // 普通图片：正常 fetch
    exif = await checkExifFromUrl(imageUrl);
  }

  const report = generateRiskReport(exif);
  trackExifRisk(report.riskLevel, getAdapter(location.hostname).name);
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
  // 移除旧面板
  exifPanelEl?.remove();

  // 埋点
  track('exif_panel_open', { riskLevel: report.riskLevel });

  const panel = document.createElement('div');
  panel.setAttribute('data-bulkpic-exif-panel', 'true');

  const shadow = panel.attachShadow({ mode: 'open' });

  const riskColorMap: Record<string, string> = {
    high: '#ef4444',
    medium: '#f97316',
    low: '#eab308',
    none: '#22c55e',
  };
  const riskColor = riskColorMap[report.riskLevel] || '#6b7280';
  const riskLabelMap: Record<string, string> = {
    high: '高风险', medium: '中风险', low: '低风险', none: '安全',
  };

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 320px;
        background: #1a1a2e;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 16px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        color: #e2e8f0;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        animation: slideIn 0.2s ease;
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .title {
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 99px;
        font-size: 11px;
        font-weight: 600;
        background: ${riskColor}22;
        color: ${riskColor};
        border: 1px solid ${riskColor}44;
      }
      .close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        border-radius: 4px;
        padding: 0 2px;
        transition: color 0.15s;
      }
      .close-btn:hover { color: #e2e8f0; }
      .summary {
        font-size: 13px;
        line-height: 1.5;
        color: #cbd5e1;
        margin-bottom: 10px;
        padding: 8px 10px;
        background: rgba(255,255,255,0.05);
        border-radius: 6px;
        border-left: 3px solid ${riskColor};
      }
      .risk-list {
        list-style: none;
        margin: 0 0 12px;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .risk-item {
        font-size: 12px;
        color: #94a3b8;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .gps-coords {
        font-size: 11px;
        color: #ef4444;
        margin-bottom: 10px;
        font-family: 'Courier New', monospace;
        background: rgba(239,68,68,0.08);
        padding: 6px 8px;
        border-radius: 4px;
      }
      .action-btn {
        width: 100%;
        padding: 10px;
        background: #0ea5e9;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
        font-family: inherit;
      }
      .action-btn:hover:not(:disabled) { background: #0284c7; }
      .action-btn:disabled {
        background: #334155;
        color: #64748b;
        cursor: default;
      }
      .brand {
        margin-top: 10px;
        text-align: center;
        font-size: 11px;
        color: #475569;
      }
      .brand a {
        color: #0ea5e9;
        text-decoration: none;
      }
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
        </ul>
      ` : ''}

      ${report.data.hasGPS && report.data.gpsLatitude != null ? `
        <div class="gps-coords">
          📍 ${report.data.gpsLatitude.toFixed(6)}, ${report.data.gpsLongitude?.toFixed(6)}
        </div>
      ` : ''}

      <button
        class="action-btn"
        id="cleanBtn"
        ${!imageUrl ? 'disabled' : ''}
      >
        ${imageUrl ? '🛡️ 一键前往 BulkPicTools 脱敏' : report.riskLevel === 'none' ? '✅ 此图无需脱敏' : '⚠️ 图片已本地处理'}
      </button>

      <div class="brand">
        由 <a href="https://bulkpictools.com" target="_blank">BulkPicTools</a> 提供隐私保护
      </div>
    </div>
  `;

  shadow.getElementById('closeBtn')?.addEventListener('click', () => {
    panel.remove();
    exifPanelEl = null;
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

  // 非高风险 8 秒后自动关闭
  if (report.riskLevel !== 'high') {
    setTimeout(() => {
      if (exifPanelEl === panel) {
        panel.remove();
        exifPanelEl = null;
      }
    }, 8000);
  }
}

function initExifPanel() {
  // 占位：未来可在此预加载 exifReader 模块
}

// ── Import Bridge：主站 /import 页面的数据中转 ──────────────────
// 关键设计：content script 无法直接读插件 IDB（Origin 隔离）
// 必须向 background 发消息，由 background 读 IDB 后返回 Blob
// background 运行在插件 Origin，有完整的 IDB 访问权限

async function handleImportBridge() {
  const params = new URLSearchParams(location.search);
  const sid = params.get('sid');

  if (!sid) return;

  logger.log('[BulkPic Bridge] Import bridge 启动, sid:', sid);

  // 等待 import.vue 发出 PAGE_READY 信号后再推数据
  // 避免页面还没 mount 完成就发 postMessage 导致监听器错过消息
  await waitForPageReady();

  logger.log('[BulkPic Bridge] 页面就绪，开始读取数据');

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
		logger.info('获取到的内容是--->', resp)
    const mimeType = resp.mimeType || 'image/png';
		const blobs = resp.base64Array.map((base64: string) => {
			const arrayBuffer = base64ToArrayBuffer(base64)
			return new Blob([arrayBuffer], { type: mimeType });
		});

    logger.log('[BulkPic Bridge] 推送 blob 给主站:', blobs, mimeType);

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


/**
 * 等待 import.vue 发出 PAGE_READY 信号
 * import.vue 在 onMounted 里发这个消息，表示监听器已挂载完成
 * 超时 10 秒后直接继续（兜底，避免永久等待）
 */
function waitForPageReady(timeout = 10000): Promise<void> {
  return new Promise(resolve => {
    // 如果页面已经 ready（比如 content script 注入比较晚），直接返回
    if ((window as any).__bulkpicPageReady) {
      resolve();
      return;
    }
 
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