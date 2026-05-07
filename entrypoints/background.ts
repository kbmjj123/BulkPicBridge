/**
 * background.ts — Service Worker（v1 + v2 合并版）
 *
 * 基于用户最新代码，追加 v2 新增逻辑：
 * 1. 启动时拉取并缓存远程配置（refreshConfig）
 * 2. SAVE_BULK_SESSION：批量存储多张图片
 * 3. FORWARD_TO_SIDEBAR：转发选中变化消息给 Sidebar
 * 4. OPEN_SIDEBAR：打开 chrome.sidePanel
 * 5. 定时刷新远程配置（24 小时）
 */

const logger = createLogger('background')

export default defineBackground({
  persistent: false,

  main() {
    logger.log('[BulkPic Bridge] Service Worker starting...');

    // ── v2：启动时刷新远程配置 ──────────────────────────────
    refreshConfig().then(config => {
      logger.log('[BulkPic Bridge] 远程配置加载完成, version:', config.version);
    });

    // ── v2：注册 Sidebar ────────────────────────────────────
    if (chrome.sidePanel) {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
        .catch(() => {});
    }

    // ── 右键菜单：先清除旧的，再注册 ───────────────────────
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'send-to-bulkpic',
        title: '发送到 BulkPicTools ↗',
        contexts: ['image'],
      });

      chrome.contextMenus.create({
        id: 'exif-check',
        title: '查看此图隐私风险 🔍',
        contexts: ['image'],
      });

      logger.log('[BulkPic Bridge] Context menus registered ✅');
    });

    // ── 右键菜单点击处理 ────────────────────────────────────
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      const srcUrl = info.srcUrl;
      if (!srcUrl) return;

      if (info.menuItemId === 'send-to-bulkpic') {
        track('context_menu_click', { action: 'send' });
        const importUrl = buildImportUrl({ url: srcUrl, action: 'auto_run' });
        await chrome.tabs.create({ url: importUrl });
        track('jump_to_main_site', { method: 'context_menu' });
      }

      if (info.menuItemId === 'exif-check') {
        track('context_menu_click', { action: 'exif' });
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_EXIF_PANEL',
            imageUrl: srcUrl,
          });
        }
      }
    });

    // ── 消息路由 ────────────────────────────────────────────
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

      switch (message.type) {

        // 单张图片：base64 → Blob → 存 IDB → 返回 sid
        case 'SAVE_BLOB_SESSION': {
          logger.info('[SAVE_BLOB_SESSION]', message);
          saveBlobSession(message.arrayBuffer, message.mimeType)
            .then(sid => sendResponse({ success: true, sid }))
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        }

        // v2：批量图片：多个 ArrayBuffer → 存 IDB → 返回 sid
        case 'SAVE_BULK_SESSION': {
          handleSaveBulkSession(message.arrayBuffers, message.mimeTypes)
            .then(sid => sendResponse({ success: true, sid }))
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        }

        // 代理 fetch（Blob URL 或需要特殊请求头时）
        case 'FETCH_IMAGE_PROXY': {
          handleFetchProxy(message.url, message.options ?? {})
            .then(result => sendResponse({ success: true, ...result }))
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        }

        case 'OPEN_IMPORT_URL': {
          const url = buildImportUrl({
            url: message.imageUrl,
            sid: message.sessionId,
            action: 'auto_run',
            preset: message.preset,
          });
          chrome.tabs.create({ url });
          sendResponse({ success: true });
          return false;
        }

        // 批量 URL fetch → 存 IDB → 跳转
        case 'OPEN_BULK_IMPORT': {
          handleBulkImport(message.urls)
            .then(url => {
              chrome.tabs.create({ url });
              sendResponse({ success: true });
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        }

        // content script 请求读取插件 IDB（主站 /import 桥接）
        // Chrome 消息传递不支持 Blob，转为 base64Array 传输
        case 'GET_BLOB_SESSION': {
          getSession(message.sid)
            .then(async session => {
              if (!session?.blobs) {
                sendResponse({ success: false, error: 'session_not_found' });
                return;
              }
              const base64Array = await Promise.all(
                session.blobs.map(async (blob: Blob) => {
                  const arrayBuffer = await blob.arrayBuffer();
                  return arrayBufferToBase64(arrayBuffer);
                })
              );
              sendResponse({
                success: true,
                base64Array,
                mimeType: session.blobs[0]?.type || 'image/png',
              });
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        }

        // 清理 session
        case 'DELETE_SESSION': {
          deleteSession(message.sid).catch(() => {});
          sendResponse({ success: true });
          return false;
        }

        // v2：转发消息给 Sidebar（Sidebar 是独立页面，无法直接接收 content script 消息）
        case 'FORWARD_TO_SIDEBAR': {
					logger.log('[FORWARD_TO_SIDEBAR]', message);
          chrome.runtime.sendMessage(message.payload).catch(() => {});
          sendResponse({ success: true });
          return false;
        }

        // v2：Popup 请求打开 Sidebar
        case 'OPEN_SIDEBAR': {
          if (chrome.sidePanel) {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
              if (tabs[0]?.id) {
                chrome.sidePanel.open({ tabId: tabs[0].id }).catch(() => {});
              }
            });
          }
          sendResponse({ success: true });
          return false;
        }

        case 'CLEAN_SESSIONS': {
          cleanExpiredSessions().then(() => sendResponse({ success: true }));
          return true;
        }

        default:
          return false;
      }
    });

    // ── 定时任务 ────────────────────────────────────────────
    chrome.alarms.create('clean-sessions', { periodInMinutes: 15 });
    chrome.alarms.create('refresh-config', { periodInMinutes: 1440 }); // 24 小时

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'clean-sessions') cleanExpiredSessions();
      if (alarm.name === 'refresh-config') refreshConfig();
    });

    logger.log('[BulkPic Bridge] Service Worker started ✅');
  },
});

// ── 辅助函数 ──────────────────────────────────────────────────

/**
 * 单张 base64 → Blob → 存 IDB
 */
async function saveBlobSession(base64: string, mimeType: string): Promise<string> {
  const arrayBuffer = base64ToArrayBuffer(base64);
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return saveSession([blob]);
}

/**
 * v2：批量 string[base64] → Blob[] → 存 IDB
 * Sidebar 批量发送时使用
 */
async function handleSaveBulkSession(
  arrayBuffers: string[],
  mimeTypes: string[]
): Promise<string> {
  const blobs = arrayBuffers.map((ab, i) =>
    new Blob([base64ToArrayBuffer(ab)], { type: mimeTypes[i] || 'image/jpeg' })
  );
  return saveSession(blobs);
}

/**
 * 代理 fetch（Blob URL 或需要 Referer 的场景）
 * 注意：签名 CDN（豆包 byteimg）不走这里，由 content script 在页面上下文 fetch
 */
async function handleFetchProxy(
  url: string,
  options: { referer?: string } = {}
): Promise<{ sessionId?: string; dataUrl?: string }> {
  const headers: Record<string, string> = { 'Accept': 'image/*,*/*' };
  if (options.referer) headers['Referer'] = options.referer;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const blob = await response.blob();

  if (blob.size < 500 * 1024) {
    const dataUrl = await blobToDataUrl(blob);
    return { dataUrl };
  }

  const sid = await saveSession([blob]);
  return { sessionId: sid };
}

/**
 * 批量 URL fetch → 存 IDB → 返回跳转 URL
 */
async function handleBulkImport(urls: string[]): Promise<string> {
  const blobs: Blob[] = [];
  for (const url of urls) {
    const blob = await fetchAction(url);
    blobs.push(blob);
  }
  const sessionId = await saveSession(blobs);
  return buildImportUrl({ sid: sessionId, action: 'auto_run' });
}

/**
 * 简单 fetch 图片
 */
async function fetchAction(url: string): Promise<Blob> {
  const response = await fetch(url, {
    headers: { 'Accept': 'image/*,*/*' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * ArrayBuffer → base64 字符串（用于 Chrome 消息传递）
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * base64 → ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Blob → Data URL（小图直接传输用）
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}