/**
 * background.ts — Service Worker
 * 修复：
 * 1. contextMenus.removeAll() 防止重复注册崩溃
 * 2. 用 chrome.* API 替代 browser.*，避免 WXT polyfill 在默认 Chrome 里未就绪的问题
 * 3. 所有 API 调用加 optional chaining 防御
 */
const logger = createLogger('background')
export default defineBackground({
  // ✅ 显式声明需要的权限，WXT 会确保写入 manifest
  persistent: false,

  main() {

    logger.log('[BulkPic Bridge] Service Worker starting...');

    // ── 右键菜单：先清除旧的，再注册，避免 duplicate id 崩溃 ──
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

    // ── 右键菜单点击处理 ──────────────────────────────────────
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

    // ── 消息路由：来自 Content Script ────────────────────────
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

      switch (message.type) {
        // Blob 直接存入插件 IDB（content script canvas 导出后调用）
        case 'SAVE_BLOB_SESSION': {
					logger.info(message)
          saveBlobSession(message.arrayBuffer, message.mimeType)
            .then(sid => sendResponse({ success: true, sid }))
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        }
				// 获取图片代理（跨域或需要 Referer 时调用）
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

        case 'OPEN_BULK_IMPORT': {
          handleBulkImport(message.urls)
            .then(url => {
              chrome.tabs.create({ url });
              sendResponse({ success: true });
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        }

        // content script 请求读取插件 IDB 中的 Blob（中转给主站页面）
        // 注意：Chrome 消息传递不支持序列化 Blob
        // 改为传 ArrayBuffer + mimeType，content script 收到后重建 Blob
        case 'GET_BLOB_SESSION': {
          getSession(message.sid)
            .then(async session => {
              if (!session?.blob) {
                sendResponse({ success: false, error: 'session_not_found' });
                return;
              }
              // Blob → ArrayBuffer（可序列化）
              const arrayBuffer = await session.blob.arrayBuffer();
              sendResponse({
                success: true,
                arrayBuffer: arrayBufferToBase64(arrayBuffer),
                mimeType: session.blob.type || 'image/jpeg',
              });
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        }

        // content script 请求清理已传递完成的 session
        case 'DELETE_SESSION': {
          deleteSession(message.sid).catch(() => {});
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

    // ── 定期清理过期 session（每 15 分钟） ───────────────────
    chrome.alarms.create('clean-sessions', { periodInMinutes: 15 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'clean-sessions') {
        cleanExpiredSessions();
      }
    });

    logger.log('[BulkPic Bridge] Service Worker started ✅');
  },
});

// ── 辅助函数 ──────────────────────────────────────────────────
async function fetchAction(url: string){
	const headers: Record<string, string> = { 'Accept': 'image/*,*/*' };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
	return await response.blob();
}
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

// 根据传递过来的url，加载url，并存储到indeddb中
async function handleBulkImport(
  urls: string[]
): Promise<string> {
	let blobs = []
	for(const url of urls){
		const blob = await fetchAction(url)
		blobs.push(blob)
	}
	const sessionId = await saveSession(blobs);
  return buildImportUrl({ sid: sessionId, action: 'auto_run' });
}

/**
 * 直接将 Blob 存入插件 IDB，返回 sid
 * 供 SAVE_BLOB_SESSION 消息处理使用
 */
async function saveBlobSession(base64: string, mimeType: string): Promise<string> {
	const arrayBuffer = base64ToArrayBuffer(base64)
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const sid = await saveSession([blob]);
  return sid;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}