<template>
  <div class="sidebar">

    <!-- 顶部品牌栏 -->
    <header class="header">
      <div class="brand">
        <svg class="brand-icon" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
          <rect width="128" height="128" rx="26" fill="#6366f1"/>
          <rect x="12" y="40" width="44" height="36" rx="8" fill="white" opacity="0.18"/>
          <circle cx="23" cy="52" r="6" fill="white" opacity="0.55"/>
          <polyline points="14,72 24,56 34,64 44,50 56,72" fill="none" stroke="white"
            stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>
          <line x1="64" y1="58" x2="78" y2="58" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.65"/>
          <polyline points="73,52 79,58 73,64" fill="none" stroke="white" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round" opacity="0.65"/>
          <circle cx="102" cy="40" r="14" fill="white" opacity="0.92"/>
          <circle cx="102" cy="72" r="10" fill="white" opacity="0.55"/>
          <circle cx="102" cy="98" r="6.5" fill="white" opacity="0.28"/>
        </svg>
        <div>
          <div class="brand-name">BulkPic Bridge</div>
          <div class="brand-count" v-if="selectedImages.length > 0">
            {{ t('sidebar.selected', [selectedImages.length]) }}
          </div>
        </div>
      </div>
      <button v-if="selectedImages.length > 0" class="btn-clear" @click="clearAll">
        {{ t('sidebar.clearAll') }}
      </button>
    </header>

    <!-- 空状态 -->
    <div v-if="selectedImages.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
      </div>
      <p class="empty-title">{{ t('sidebar.emptyTitle') }}</p>
      <p class="empty-desc">{{ t('sidebar.emptyDesc') }}</p>
    </div>

    <!-- 图片列表 -->
    <div v-else class="image-list">
      <transition-group name="grid" tag="div" class="image-grid">
        <div
          v-for="img in selectedImages"
          :key="img.url"
          class="grid-item"
        >
          <img :src="img.thumbnail" :alt="img.filename" class="grid-img" />
          <button class="btn-remove" @click="removeImage(img.url)" title="移除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </transition-group>
    </div>

    <!-- 操作区 -->
    <div v-if="selectedImages.length > 0" class="action-area">

      <!-- 常用工具快捷按钮 -->
      <div class="quick-tools">
        <button
          v-for="tool in quickToolList"
          :key="tool.slug"
          class="tool-btn"
          :class="{ active: selectedTool === tool.slug }"
          @click="selectedTool = tool.slug"
        >
          {{ getLabel(tool) }}
        </button>
      </div>

      <!-- 主 CTA -->
      <button
        class="btn-send"
        :disabled="isSending"
        @click="sendToMainSite"
      >
        <span v-if="!isSending">
          {{ t('sidebar.send') }} →
        </span>
        <span v-else class="sending-state">
          <span class="spinner"></span>
          {{ t('sidebar.sending', [sendProgress, selectedImages.length]) }}
        </span>
      </button>

      <!-- 查看全部工具 -->
      <a href="https://bulkpictools.com/tools" target="_blank" class="btn-all-tools">
        {{ t('sidebar.allTools') }}
      </a>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { i18n } from '#i18n';
const { t } = i18n;
// ── 多语言 ────────────────────────────────────────────────────
const LANG = (() => {
  const l = (navigator.language || 'en').split('-')[0];
  return ['zh', 'en', 'ja', 'ko'].includes(l) ? l : 'en';
})();


// ── 状态 ──────────────────────────────────────────────────────
interface SelectedImage {
  url: string;
  thumbnail: string;
  filename: string;
  width: number;
  height: number;
  size?: number;
}

const selectedImages = ref<SelectedImage[]>([]);
const config = ref<RemoteConfig | null>(null);
const siteConfig = ref<SiteConfig & { minWidth: number; minHeight: number } | null>(null);
const selectedTool = ref('image-compressor');
const quickToolList = ref<ToolConfig[]>([]);
const isSending = ref(false);
const sendProgress = ref(0);

function getLabel(tool: ToolConfig): string {
  return getToolLabel(tool, LANG);
}

// ── 监听来自 content script 的选中变化事件 ───────────────────
function handleSelectionChange(e: Event) {
  const detail = (e as CustomEvent).detail as {
    count: number;
    images: Array<{ url: string; thumbnail: string }>;
  };

  // 更新选中列表（保留已有的尺寸信息）
  selectedImages.value = detail.images.map((img, i) => ({
    url: img.url,
    thumbnail: img.thumbnail,
    filename: `image_${i + 1}.jpg`,
    width: 0,
    height: 0,
  }));
}

// ── 移除单张图片 ──────────────────────────────────────────────
function removeImage(url: string) {
  selectedImages.value = selectedImages.value.filter(img => img.url !== url);
  // 通知 content script 更新选中状态
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'DESELECT_IMAGE',
        url,
      });
    }
  });
}

// ── 清空全部 ──────────────────────────────────────────────────
function clearAll() {
  selectedImages.value = [];
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CLEAR_SELECTION' });
    }
  });
}

// ── 发送到主站 ────────────────────────────────────────────────
async function sendToMainSite() {
  if (isSending.value || selectedImages.value.length === 0) return;
  isSending.value = true;
  sendProgress.value = 0;

  try {
    const blobs: Blob[] = [];

    for (let i = 0; i < selectedImages.value.length; i++) {
      const img = selectedImages.value[i];
      sendProgress.value = i + 1;

      let blob: Blob | null = null;

      if (isSignedCdnUrl(img.url)) {
        // 需要在当前页面上下文 fetch，通过 content script 中转
        const resp = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = resp[0]?.id;
        if (tabId) {
          const result = await chrome.tabs.sendMessage(tabId, {
            type: 'FETCH_IMAGE_FOR_SIDEBAR',
            url: img.url,
          });
          if (result?.arrayBuffer) {
            blob = new Blob([base64ToArrayBuffer(result.arrayBuffer)], { type: result.mimeType || 'image/jpeg' });
          }
        }
      } else {
        const response = await fetch(img.url);
        blob = await response.blob();
      }

      if (blob && blob.size > 100) blobs.push(blob);
    }

    if (blobs.length === 0) throw new Error('未能获取到任何图片');

    // 批量存入插件 IDB
    const arrayBuffers = await Promise.all(blobs.map(async b => arrayBufferToBase64(await b.arrayBuffer())));
    const resp = await chrome.runtime.sendMessage({
      type: 'SAVE_BULK_SESSION',
      arrayBuffers,
      mimeTypes: blobs.map(b => b.type || 'image/jpeg'),
    });

    if (!resp?.sid) throw new Error('存储失败');

    const url = buildImportUrl({
      sid: resp.sid,
      action: 'auto_run',
      preset: selectedTool.value,
      lang: LANG,
    });

    await chrome.tabs.create({ url });
    clearAll();

  } catch (err) {
    console.error('[BulkPic Sidebar] 发送失败:', err);
  } finally {
    isSending.value = false;
    sendProgress.value = 0;
  }
}

// ── 生命周期 ──────────────────────────────────────────────────
onMounted(async () => {
  let hostname = '';
  let activeTabId: number | undefined;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTabId = tabs[0]?.id;
    const url = tabs[0]?.url;
    if (url) {
      hostname = new URL(url).hostname;
    }
  } catch {
    hostname = '';
  }
  config.value = await getConfig();
  siteConfig.value = getSiteConfig(config.value, hostname);
  quickToolList.value = getMenuTools(config.value, siteConfig.value.menuTools);
  if (quickToolList.value.length > 0) {
    selectedTool.value = quickToolList.value[0].slug;
  }

  // 监听 content script 广播的选中变化
  // Sidebar 是独立页面，通过 chrome.runtime.onMessage 接收
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SELECTION_CHANGE') {
      console.info('[BulkPic Sidebar] 选中图片变化')
      selectedImages.value = message.images ?? [];
      console.info('[BulkPic Sidebar] 选中的图片:', selectedImages.value)
    }
  });

  // 挂载时主动拉取当前选中数据，防止第一次打开时消息丢失
  if (activeTabId) {
    try {
      const resp = await chrome.tabs.sendMessage(activeTabId, { type: 'GET_SELECTION' });
      if (resp?.images && resp.images.length > 0) {
        selectedImages.value = resp.images;
      }
    } catch {
      // Content script 未就绪时静默跳过
    }
  }
});
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  background: #0f0e0c;
  color: #f5f5f4;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

.sidebar {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.brand { display: flex; align-items: center; gap: 10px; }

.brand-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
}

.brand-name {
  font-size: 13px;
  font-weight: 600;
  color: #f5f5f4;
  line-height: 1.3;
}

.brand-count {
  font-size: 11px;
  color: #818cf8;
  margin-top: 1px;
}

.btn-clear {
  font-size: 11px;
  color: #78716c;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-family: inherit;
  transition: color 0.15s;
}
.btn-clear:hover { color: #ef4444; }

/* ── 空状态 ── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 10px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #334155;
}
.empty-icon svg { width: 22px; height: 22px; }

.empty-title { font-size: 13px; font-weight: 500; color: #a8a29e; }
.empty-desc  { font-size: 12px; color: #78716c; text-align: center; line-height: 1.5; }

/* ── 图片列表：九宫格 ── */
.image-grid-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 6px;
}

.grid-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #1c1917;
}

.grid-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.2s ease;
}
.grid-item:hover .grid-img {
  transform: scale(1.04);
}

.btn-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.8);
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  backdrop-filter: blur(2px);
  padding: 0;
}
.grid-item:hover .btn-remove { opacity: 1; }
.btn-remove:hover {
  background: rgba(239, 68, 68, 0.85);
  color: white;
}
.btn-remove svg { width: 10px; height: 10px; }


/* ── 操作区 ── */
.action-area {
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.quick-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tool-btn {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  color: #a8a29e;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.tool-btn:hover { background: rgba(255,255,255,0.06); color: #f5f5f4; }
.tool-btn.active {
  background: rgba(79,70,229,0.12);
  border-color: rgba(79,70,229,0.30);
  color: #a5b4fc;
}

.btn-send {
  width: 100%;
  padding: 11px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn-send:hover:not(:disabled) { background: #4f46e5; }
.btn-send:disabled { background: #292524; color: #78716c; cursor: not-allowed; }

.sending-state {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.btn-all-tools {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #78716c;
  text-decoration: none;
  padding: 4px;
  transition: color 0.15s;
}
.btn-all-tools:hover { color: #818cf8; }

/* ── 列表动画 ── */
.list-enter-active, .list-leave-active { transition: all 0.2s ease; }
.list-enter-from { opacity: 0; transform: translateX(-10px); }
.list-leave-to   { opacity: 0; transform: translateX(10px); }
</style>
