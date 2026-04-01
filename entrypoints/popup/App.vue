<template>
  <div class="w-[380px] min-h-[200px] bg-slate-900 pb-2">
    <!-- 头部品牌区 -->
    <header class="flex items-center justify-between px-4 py-3.5 border-b border-slate-800/60">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-4.5 h-4.5">
            <path d="M4 16L8.586 11.414a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div class="text-sm font-bold text-slate-100 leading-tight">{{ t('popup.brandName') }}</div>
          <div class="text-xs text-slate-400 leading-tight">{{ t('popup.brandTagline') }}</div>
        </div>
      </div>
      <a href="https://bulkpictools.com" target="_blank" 
        class="text-xs text-sky-400 px-2 py-1 rounded-md border border-sky-400/30 hover:bg-sky-400/10 transition-all">
        {{ t('popup.openSite') }} ↗
      </a>
    </header>

    <!-- 状态指示器 -->
    <div class="flex items-center gap-1.5 px-4 py-2 bg-slate-800/20 border-b border-slate-800/40">
      <div class="w-1.5 h-1.5 rounded-full flex-shrink-0"
        :class="isActive ? 'bg-green-500 shadow-green-500/50 shadow-sm' : 'bg-slate-600'"></div>
      <span class="text-xs text-slate-400">
        {{ isActive ? t('popup.statusActive', {platform: currentPlatform}) : t('popup.statusInactive') }}
      </span>
    </div>

    <!-- 核心操作区 -->
    <div class="p-2.5 flex flex-col gap-1.5">
      <!-- 操作 1：提取本页所有图片 -->
      <button class="flex items-center gap-3 p-3 bg-slate-800/20 border border-slate-800/30 rounded-xl hover:bg-slate-800/40 hover:border-slate-800/50 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
        :class="isExtracting ? '' : 'group'"
        @click="extractAllImages" :disabled="isExtracting">
        <div class="w-9 h-9 bg-sky-400/20 rounded-lg flex items-center justify-center text-sky-400 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path d="M4 6h16M4 12h16M4 18h7"/>
            <rect x="14" y="14" width="8" height="8" rx="1"/>
          </svg>
        </div>
        <div class="flex-1">
          <div class="text-sm font-semibold text-slate-100 leading-tight">{{ t('popup.extractImages') }}</div>
          <div class="text-xs text-slate-400 mt-0.5 leading-tight">{{ t('popup.extractDesc') }}</div>
        </div>
        <div class="text-slate-600 flex-shrink-0">
          <svg v-if="!isExtracting" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          <div v-else class="w-4 h-4 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin"></div>
        </div>
      </button>

      <!-- 操作 2：一键裁切/压缩 -->
      <button class="flex items-center gap-3 p-3 bg-slate-800/20 border border-slate-800/30 rounded-xl hover:bg-slate-800/40 hover:border-slate-800/50 hover:-translate-y-0.5 transition-all w-full text-left"
        @click="openTool('crop')">
        <div class="w-9 h-9 bg-teal-400/20 rounded-lg flex items-center justify-center text-teal-400 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>
          </svg>
        </div>
        <div class="flex-1">
          <div class="text-sm font-semibold text-slate-100 leading-tight">{{ t('popup.cropCompress') }}</div>
          <div class="text-xs text-slate-400 mt-0.5 leading-tight">{{ t('popup.cropDesc') }}</div>
        </div>
        <div class="text-slate-600 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </button>

      <!-- 操作 3：批量加水印 -->
      <button class="flex items-center gap-3 p-3 bg-slate-800/20 border border-slate-800/30 rounded-xl hover:bg-slate-800/40 hover:border-slate-800/50 hover:-translate-y-0.5 transition-all w-full text-left"
        @click="openTool('watermark')">
        <div class="w-9 h-9 bg-purple-400/20 rounded-lg flex items-center justify-center text-purple-400 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="flex-1">
          <div class="text-sm font-semibold text-slate-100 leading-tight">{{ t('popup.watermark') }}</div>
          <div class="text-xs text-slate-400 mt-0.5 leading-tight">{{ t('popup.watermarkDesc') }}</div>
        </div>
        <div class="text-slate-600 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </button>
    </div>

    <!-- 图片预览区（提取后显示） -->
    <transition name="slide">
      <div v-if="extractedImages.length > 0" class="px-3 pb-2">
        <div class="flex items-center justify-between text-xs text-slate-400 pt-1 mb-2">
          <span>{{ t('popup.foundImages', {count: extractedImages.length}) }}</span>
          <button class="text-xs text-sky-400 bg-none border-none cursor-pointer p-0" @click="sendAllImages">
            {{ t('popup.sendAll') }} ↗
          </button>
        </div>
        <div class="grid grid-cols-5 gap-1">
          <div
            v-for="(img, i) in extractedImages.slice(0, 9)"
            :key="i"
            class="aspect-square rounded-md overflow-hidden cursor-pointer relative border-2 border-transparent transition-colors"
            :class="selectedImages.has(i) ? 'border-sky-400' : ''"
            @click="toggleSelect(i)"
          >
            <img :src="img.thumbnail" :alt="`Image ${i + 1}`" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-sky-400/50 flex items-center justify-center text-white text-lg opacity-0 transition-opacity"
              :class="selectedImages.has(i) ? 'opacity-100' : ''">✓</div>
          </div>
          <div v-if="extractedImages.length > 9" class="aspect-square rounded-md bg-slate-800/30 flex items-center justify-center text-xs text-slate-400">
            +{{ extractedImages.length - 9 }}
          </div>
        </div>
        <button
          v-if="selectedImages.size > 0"
          class="w-full mt-2 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer"
          @click="sendSelectedImages"
        >
          {{ t('popup.sendSelected', {count: selectedImages.size}) }} ↗
        </button>
      </div>
    </transition>

    <!-- 隐私说明 -->
    <div class="flex items-center gap-1.5 px-4 py-2 text-[10px] text-slate-600 border-t border-slate-800/40">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3 flex-shrink-0 text-slate-500">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <span>{{ t('popup.privacyNote') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { i18n } from '#imports';
const logger = createLogger('App')
const { t } = i18n;

// ── 状态 ──────────────────────────────────────────────────
const isActive = ref(false);
const currentPlatform = ref('');
const isExtracting = ref(false);

interface ExtractedImage {
  url: string;
  thumbnail: string;
  width: number;
  height: number;
}

const extractedImages = ref<ExtractedImage[]>([]);
const selectedImages = ref(new Set<number>());

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
 * 打开主站指定工具
 */
function openTool(tool: string) {
  const presetMap: Record<string, string> = {
    crop: 'youtube_thumbnail',
    watermark: 'watermark',
  };
  const url = buildImportUrl({ action: 'auto_run', preset: presetMap[tool] });
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
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  width: 380px;
  background: #0f172a;
  color: #e2e8f0;
  -webkit-font-smoothing: antialiased;
}

.popup {
  width: 380px;
  min-height: 200px;
  background: #0f172a;
  padding-bottom: 8px;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  border-radius: 8px;
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
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.2;
}

.brand-tagline {
  font-size: 11px;
  color: #64748b;
  line-height: 1.2;
}

.site-link {
  font-size: 12px;
  color: #0ea5e9;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(14, 165, 233, 0.3);
  transition: all 0.15s;
}

.site-link:hover {
  background: rgba(14, 165, 233, 0.1);
}

/* ── Status Bar ── */
.status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.active { background: #22c55e; box-shadow: 0 0 6px #22c55e88; }
.status-dot.inactive { background: #475569; }

.status-text {
  font-size: 12px;
  color: #94a3b8;
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
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
  text-align: left;
  color: inherit;
  font-family: inherit;
  min-height: 56px;
}

.action-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: rgba(14, 165, 233, 0.1);
  border-color: rgba(14, 165, 233, 0.3);
}

.action-btn.primary:hover:not(:disabled) {
  background: rgba(14, 165, 233, 0.18);
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(14, 165, 233, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0ea5e9;
  flex-shrink: 0;
}
.btn-icon svg { width: 16px; height: 16px; }

.btn-icon.teal {
  background: rgba(20, 184, 166, 0.2);
  color: #14b8a6;
}

.btn-icon.purple {
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}

.btn-content {
  flex: 1;
}

.btn-title {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.3;
}

.btn-desc {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
  line-height: 1.3;
}

.btn-arrow {
  color: #475569;
  flex-shrink: 0;
}
.btn-arrow svg { width: 16px; height: 16px; }

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(14, 165, 233, 0.3);
  border-top-color: #0ea5e9;
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
  color: #64748b;
  margin-bottom: 8px;
  padding-top: 4px;
}

.send-all-btn {
  font-size: 12px;
  color: #0ea5e9;
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
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  border: 2px solid transparent;
  transition: border-color 0.15s;
}

.image-thumb.selected {
  border-color: #0ea5e9;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-check {
  position: absolute;
  inset: 0;
  background: rgba(14, 165, 233, 0.5);
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
  border-radius: 6px;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #64748b;
}

.send-selected-btn {
  width: 100%;
  margin-top: 8px;
  padding: 9px;
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.send-selected-btn:hover {
  background: #0284c7;
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
  color: #334155;
  border-top: 1px solid rgba(255,255,255,0.04);
}

.privacy-note svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: #475569;
}
</style>