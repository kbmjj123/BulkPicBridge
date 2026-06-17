<template>
  <div 
    class="w-[380px] min-h-[200px] 
           bg-[#0f0e0c] text-[#f5f5f4]
           transition-colors"
  >
    <!-- 头部品牌区 -->
    <header class="flex items-center justify-between px-4 py-3.5 border-b border-[rgba(255,255,255,0.06)]">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 bg-[#4f46e5] rounded-[6px] flex items-center justify-center text-white flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5">
            <path d="M4 16L8.586 11.414a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div class="text-sm font-bold leading-tight">{{ t('popup.brandName') }}</div>
          <div class="text-xs text-[#78716c] leading-tight">{{ t('popup.brandTagline') }}</div>
        </div>
      </div>
      <a href="https://bulkpictools.com" target="_blank" 
        class="text-xs text-[#818cf8] px-2 py-1 rounded-[6px] border border-[rgba(79,70,229,0.25)] hover:bg-[rgba(79,70,229,0.10)] transition-all">
        {{ t('popup.openSite') }} ↗
      </a>
    </header>

    <!-- 状态指示器 -->
    <div class="flex items-center gap-1.5 px-4 py-2 bg-[#1c1917] border-b border-[rgba(255,255,255,0.06)]">
      <div class="w-1.5 h-1.5 rounded-full flex-shrink-0"
        :class="isActive ? 'bg-green-500 shadow-green-500/50 shadow-sm' : 'bg-[#78716c]'"></div>
      <span class="text-xs text-[#a8a29e]">
        {{ isActive ? t('popup.statusActive', [currentPlatform]) : t('popup.statusInactive') }}
      </span>
    </div>

    <!-- 核心操作区 -->
    <div class="p-2.5 flex flex-col gap-1.5">
      <!-- 操作 1：提取本页所有图片 -->
      <button class="flex items-center gap-3 p-3 bg-[#1c1917] border border-[rgba(255,255,255,0.06)] rounded-[8px] hover:bg-[#292524] hover:border-[rgba(255,255,255,0.10)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
        :class="isExtracting ? '' : 'group'"
        @click="extractAllImages" :disabled="isExtracting">
        <div class="w-8 h-8 bg-[rgba(79,70,229,0.12)] rounded-[6px] flex items-center justify-center text-[#6366f1] flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path d="M4 6h16M4 12h16M4 18h7"/>
            <rect x="14" y="14" width="8" height="8" rx="1"/>
          </svg>
        </div>
        <div class="flex-1">
          <div class="text-sm font-semibold leading-tight">{{ t('popup.extractImages') }}</div>
          <div class="text-xs text-[#a8a29e] mt-0.5 leading-tight">{{ t('popup.extractDesc') }}</div>
        </div>
        <div class="text-[#78716c] flex-shrink-0">
          <svg v-if="!isExtracting" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          <div v-else class="w-4 h-4 border-2 border-[rgba(79,70,229,0.30)] border-t-[#6366f1] rounded-full animate-spin"></div>
        </div>
      </button>

      <!-- 快捷工具（动态） -->
      <button
        v-for="tool in quickToolList"
        :key="tool.slug"
        class="flex items-center gap-3 p-3 bg-[#1c1917] border border-[rgba(255,255,255,0.06)] rounded-[8px] hover:bg-[#292524] hover:border-[rgba(255,255,255,0.10)] hover:-translate-y-0.5 transition-all w-full text-left"
        @click="openTool(tool.slug)">
        <div class="w-8 h-8 bg-[rgba(79,70,229,0.12)] rounded-[6px] flex items-center justify-center text-[#6366f1] flex-shrink-0" v-html="getToolIcon(tool.slug)"></div>
        <div class="flex-1">
          <div class="text-sm font-semibold leading-tight">{{ getToolLabel(tool, LANG) }}</div>
          <div class="text-xs text-[#a8a29e] mt-0.5 leading-tight">Open tool</div>
        </div>
        <div class="text-[#78716c] flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </button>
    </div>

    <!-- 图片预览区 -->
    <transition name="slide">
      <div v-if="extractedImages.length > 0" class="px-3 pb-2">
        <div class="flex items-center justify-between text-xs text-[#a8a29e] pt-1 mb-2">
          <span>{{ t('popup.foundImages', [extractedImages.length]) }}</span>
          <button class="text-xs text-[#818cf8] bg-none border-none cursor-pointer p-0" @click="sendAllImages">
            {{ t('popup.sendAll') }} ↗
          </button>
        </div>
        <div class="grid grid-cols-5 gap-1">
          <div
            v-for="(img, i) in extractedImages.slice(0, 9)"
            :key="i"
            class="aspect-square rounded-[4px] overflow-hidden cursor-pointer relative border-2 border-transparent transition-colors"
            :class="selectedImages.has(i) ? 'border-[#4f46e5]' : ''"
            @click="toggleSelect(i)"
          >
            <img :src="img.thumbnail" :alt="`Image ${i + 1}`" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-[#4f46e5]/60 flex items-center justify-center text-white text-lg opacity-0 transition-opacity"
              :class="selectedImages.has(i) ? 'opacity-100' : ''">✓</div>
          </div>
          <div v-if="extractedImages.length > 9" class="aspect-square rounded-[4px] bg-[#1c1917] flex items-center justify-center text-xs text-[#78716c]">
            +{{ extractedImages.length - 9 }}
          </div>
        </div>
        <button
          v-if="selectedImages.size > 0"
          class="w-full mt-2 py-2 bg-[#4f46e5] hover:bg-[#6366f1] text-white font-semibold rounded-[6px] text-sm transition-colors cursor-pointer"
          @click="sendSelectedImages"
        >
          {{ t('popup.sendSelected', [selectedImages.size]) }} ↗
        </button>
      </div>
    </transition>

    <!-- 隐私说明 -->
    <div class="flex items-center gap-1.5 px-4 py-2 text-[10px] text-[#78716c] border-t border-[rgba(255,255,255,0.06)]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3 flex-shrink-0 text-[#78716c]">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
			<a 
				href="https://bulkpictools.com/privacy" 
				target="_blank" 
				class="hover:text-[#818cf8] transition-colors"
			>
				<span>{{ t('popup.privacyNote') }}</span>
			</a>
    </div>
  </div>

    <!-- 测试：刷新远程配置 -->
    <div class="flex items-center gap-1.5 px-4 py-1.5 bg-[#1c1917] border-t border-[rgba(255,255,255,0.06)]" v-if="showDevTools">
      <button
        class="text-[10px] text-[#78716c] hover:text-[#818cf8] transition-colors bg-none border-none cursor-pointer px-0 py-0"
        :disabled="refreshLoading"
        @click="refreshRemoteConfig"
      >
        {{ refreshLoading ? '刷新中...' : '🔄 刷新配置' }}
      </button>
      <span v-if="refreshDone" class="text-[10px] text-green-500">✔</span>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { i18n } from '#i18n';
import { getConfig, getSiteConfig, getMenuTools, getToolLabel, refreshConfig } from '@/utils/remoteConfigService';
const logger = createLogger('App')
const { t } = i18n;

// ── 多语言 ──
const LANG = (() => {
  const l = (navigator.language || 'en').split('-')[0];
  return ['zh', 'en', 'ja', 'ko'].includes(l) ? l : 'en';
})();

// ── 状态 ──────────────────────────────────────────────────
const isActive = ref(false);
const currentPlatform = ref('');
const isExtracting = ref(false);

const config = ref<RemoteConfig | null>(null);
const siteConfig = ref<SiteConfig & { minWidth: number; minHeight: number } | null>(null);
const quickToolList = ref<ToolConfig[]>([]);

interface ExtractedImage {
  url: string;
  thumbnail: string;
  width: number;
  height: number;
}

const extractedImages = ref<ExtractedImage[]>([]);
const selectedImages = ref(new Set<number>());

const showDevTools = ref(true);  // 测试阶段保持可见
const refreshLoading = ref(false);
const refreshDone = ref(false);

// ── 初始化 ────────────────────────────────────────────────
onMounted(async () => {
  // 获取当前 Tab 信息
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      const hostname = new URL(tab.url).hostname;
      const adapter = getAdapter(hostname);
      if (adapter.name !== 'Generic') {
        isActive.value = true;
        currentPlatform.value = adapter.name;
      }

      // 加载远程配置 & 站点快捷工具
      const cfg = await getConfig();
      config.value = cfg;
      const sc = getSiteConfig(cfg, hostname);
      siteConfig.value = sc;
      quickToolList.value = getMenuTools(cfg, sc.menuTools);
    } catch {
      // 忽略解析错误
    }
  }
});

// ── 操作函数 ──────────────────────────────────────────────

/**
 * 提取当前页面所有图片
 */
async function extractAllImages() {
  isExtracting.value = true;
  extractedImages.value = [];
  selectedImages.value = new Set();

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    // 向 content script 发送提取命令
    const response = await browser.tabs.sendMessage(tab.id, {
      type: 'EXTRACT_ALL_IMAGES',
    });
		console.info(response)

    if (response?.images) {
      extractedImages.value = response.images;
			logger.info('[Popup] Extracted images:', response.images);
    }
  } catch (err) {
    logger.error('[Popup] Extract error:', err);
  } finally {
    isExtracting.value = false;
  }
}

/**
 * 工具图标映射（slug → SVG path）
 */
const TOOL_ICON_MAP: Record<string, string> = {
  'image-compressor':              'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
  'image-resizer':                 'M21 21H3M21 3v18M3 3h18M8 8l8 8M16 8H8v8',
  'image-cropper':                 'M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14',
  'image-watermark':               'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'remove-background':             'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  'to-webp':                       'M4 16L8.586 11.414a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  'to-png':                        'M4 16L8.586 11.414a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  'to-jpg':                        'M4 16L8.586 11.414a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  'to-gif':                        'M4 16L8.586 11.414a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  'image-converter':               'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M4 12l8-9 8 9',
  'image-editor':                  'M17 3a2.828 2.828 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z',
  'flip-image':                    'M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4',
  'add-text-to-image':             'M4 6h16M4 12h16M4 18h7',
  'round-corner':                  'M21 12a9 9 0 1 1-6.219-8.56',
  'blur-image':                    'M12 2.69l5.66-5.66a8 8 0 1 1-11.31 0z',
  'ig-resize':                     'M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z',
  'fb-resize':                     'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  'twitter-resize':                'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z',
  'yt-thumbnail':                  'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 8.5v7l6.75-3.5L9.75 8.5z',
  'youtube-thumbnail-resizer':     'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 8.5v7l6.75-3.5L9.75 8.5z',
  'bg-remover':                    'M15 12v-1m0 0V9m0 2h1m-1 0h-1m-5.1 5.35A7 7 0 1 1 17 15.45M5 22h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z',
  'passport-photo':                'M16 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5M8 7l-5 5 5 5M3 12h13',
  'instagram-resizer':             'M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z',
  'facebook-image-resizer':        'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
};

function getToolIcon(slug: string): string {
  const path = TOOL_ICON_MAP[slug] || TOOL_ICON_MAP['image-compressor'];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="${path}"/></svg>`;
}

/**
 * 打开主站指定工具
 */
function openTool(tool: string) {
  const url = buildImportUrl({ action: 'auto_run', preset: tool, lang: LANG });
  browser.tabs.create({ url });
}

/**
 * 切换图片选中状态
 */
function toggleSelect(index: number) {
  const newSet = new Set(selectedImages.value);
  if (newSet.has(index)) {
    newSet.delete(index);
  } else {
    newSet.add(index);
  }
  selectedImages.value = newSet;
}

/**
 * 发送所有提取的图片
 */
function sendAllImages() {
	console.info(extractedImages.value)
  const urls = extractedImages.value.map(img => img.url);
  sendImages(urls);
}

/**
 * 发送选中的图片
 */
function sendSelectedImages() {
  const urls = Array.from(selectedImages.value).map(
    i => extractedImages.value[i].url
  );
  sendImages(urls);
}

async function sendImages(urls: string[]) {
  if (urls.length === 0) return;
  // 通过 background 处理大批量
  await browser.runtime.sendMessage({
    type: 'OPEN_BULK_IMPORT',
    urls,
  });
  window.close();
}

/**
 * 测试用：手动刷新远程配置
 */
async function refreshRemoteConfig() {
  refreshLoading.value = true;
  refreshDone.value = false;
  try {
    await refreshConfig();
    // 重新加载配置到响应式状态
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const hostname = new URL(tab.url).hostname;
      const cfg = await getConfig();
      config.value = cfg;
      const sc = getSiteConfig(cfg, hostname);
      siteConfig.value = sc;
      quickToolList.value = getMenuTools(cfg, sc.menuTools);
    }
    refreshDone.value = true;
    setTimeout(() => { refreshDone.value = false; }, 2000);
  } catch (err) {
    logger.error('[Popup] 刷新配置失败:', err);
  } finally {
    refreshLoading.value = false;
  }
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  width: 380px;
  background: #0f0e0c;
  color: #f5f5f4;
  -webkit-font-smoothing: antialiased;
}

.popup {
  width: 380px;
  min-height: 200px;
  background: #0f0e0c;
  padding-bottom: 8px;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: #4f46e5;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.logo-icon svg {
  width: 18px;
  height: 18px;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: #f5f5f4;
  line-height: 1.2;
}

.brand-tagline {
  font-size: 11px;
  color: #78716c;
  line-height: 1.2;
}

.site-link {
  font-size: 12px;
  color: #818cf8;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(79, 70, 229, 0.25);
  transition: all 0.15s;
}

.site-link:hover {
  background: rgba(79, 70, 229, 0.10);
}

/* ── Status Bar ── */
.status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #1c1917;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.active { background: #22c55e; box-shadow: 0 0 6px #22c55e88; }
.status-dot.inactive { background: #78716c; }

.status-text {
  font-size: 12px;
  color: #a8a29e;
}

/* ── Actions ── */
.actions {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #1c1917;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
  text-align: left;
  color: inherit;
  font-family: inherit;
  min-height: 56px;
}

.action-btn:hover:not(:disabled) {
  background: #292524;
  border-color: rgba(255,255,255,0.10);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: rgba(79, 70, 229, 0.10);
  border-color: rgba(79, 70, 229, 0.25);
}

.action-btn.primary:hover:not(:disabled) {
  background: rgba(79, 70, 229, 0.18);
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(79, 70, 229, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
  flex-shrink: 0;
}
.btn-icon svg { width: 16px; height: 16px; }

.btn-icon.teal,
.btn-icon.purple {
  background: rgba(79, 70, 229, 0.12);
  color: #6366f1;
}

.btn-content {
  flex: 1;
}

.btn-title {
  font-size: 13px;
  font-weight: 600;
  color: #f5f5f4;
  line-height: 1.3;
}

.btn-desc {
  font-size: 11px;
  color: #a8a29e;
  margin-top: 1px;
  line-height: 1.3;
}

.btn-arrow {
  color: #78716c;
  flex-shrink: 0;
}
.btn-arrow svg { width: 16px; height: 16px; }

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(79, 70, 229, 0.30);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Image List ── */
.image-list {
  padding: 0 12px 8px;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #a8a29e;
  margin-bottom: 8px;
  padding-top: 4px;
}

.send-all-btn {
  font-size: 12px;
  color: #818cf8;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.image-thumb {
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  border: 2px solid transparent;
  transition: border-color 0.15s;
}

.image-thumb.selected {
  border-color: #4f46e5;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-check {
  position: absolute;
  inset: 0;
  background: rgba(79, 70, 229, 0.60);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
  opacity: 0;
  transition: opacity 0.15s;
}

.image-thumb.selected .thumb-check {
  opacity: 1;
}

.image-more {
  aspect-ratio: 1;
  border-radius: 4px;
  background: #1c1917;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #78716c;
}

.send-selected-btn {
  width: 100%;
  margin-top: 8px;
  padding: 9px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.send-selected-btn:hover {
  background: #6366f1;
}

/* ── Slide Transition ── */
.slide-enter-active, .slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Privacy Note ── */
.privacy-note {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 11px;
  color: #78716c;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.privacy-note svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: #78716c;
}
</style>