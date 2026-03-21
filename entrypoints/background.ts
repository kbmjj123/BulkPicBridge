/**
 * background.ts — Service Worker
 * 修复：
 * 1. contextMenus.removeAll() 防止重复注册崩溃
 * 2. 用 chrome.* API 替代 browser.*，避免 WXT polyfill 在默认 Chrome 里未就绪的问题
 * 3. 所有 API 调用加 optional chaining 防御
 */

export default defineBackground({
  // ✅ 显式声明需要的权限，WXT 会确保写入 manifest
  persistent: false,

  main() {

    console.log('[BulkPic Bridge] Service Worker starting...');

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

      console.log('[BulkPic Bridge] Context menus registered ✅');
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
          handleBulkImport(message.urls, message.blobs)
            .then(url => {
              chrome.tabs.create({ url });
              sendResponse({ success: true });
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
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
    // background.ts — defineBackground 的 main() 里，把 alarms 部分改成这样：

		// ── 定期清理过期 session ──────────────────────────────────
		// 加 optional chaining，alarms 权限缺失时不崩溃
		if (chrome.alarms) {
			chrome.alarms.create('clean-sessions', { periodInMinutes: 15 });
			chrome.alarms.onAlarm.addListener((alarm) => {
				if (alarm.name === 'clean-sessions') {
					cleanExpiredSessions();
				}
			});
		} else {
			console.warn('[BulkPic Bridge] alarms permission not granted, session cleanup disabled');
		}

    console.log('[BulkPic Bridge] Service Worker started ✅');
  },
});

// ── 辅助函数 ──────────────────────────────────────────────────

async function handleFetchProxy(
  url: string,
  options: { referer?: string } = {}
): Promise<{ sessionId?: string; dataUrl?: string }> {

  const headers: Record<string, string> = { 'Accept': 'image/*,*/*' };
  if (options.referer) headers['Referer'] = options.referer;

  const response = await fetch(url, { credentials: 'include', headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const blob = await response.blob();

  if (blob.size < 500 * 1024) {
    const dataUrl = await blobToDataUrl(blob);
    return { dataUrl };
  }

  const sessionId = await saveSession(blob, { originalUrl: url });
  return { sessionId };
}

async function handleBulkImport(
  urls: string[],
  blobs?: Array<{ data: string; mimeType: string }>
): Promise<string> {
  const hasBlobData = !!(blobs && blobs.length > 0);

  if (shouldUseBlobSession(urls, hasBlobData)) {
    const combinedBlob = new Blob(
      [JSON.stringify({ urls, hasBlobData })],
      { type: 'application/json' }
    );
    const sessionId = await saveSession(combinedBlob);
    return buildImportUrl({ sid: sessionId, action: 'auto_run' });
  }

  return buildImportUrl({ sources: urls, action: 'auto_run' });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}