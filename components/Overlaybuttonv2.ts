/**
 * OverlayButton v2 — 三按钮交互
 *
 * 按钮布局：[⚡ 快捷工具] [☐ 选中] [⋮ 菜单]
 * 配置来自远程 RemoteConfig，按域名动态调整
 */


// ── 语言检测 ─────────────────────────────────────────────────
const LANG = (() => {
  const l = (navigator.language || 'en').split('-')[0];
  return ['zh', 'en', 'ja', 'ko'].includes(l) ? l : 'en';
})();

// ── i18n 快捷方式 ──────────────────────────────────────────────
const t = (key: string): string => (browser.i18n as any).getMessage(key) || key;

// ── 全局状态 ──────────────────────────────────────────────────
let globalHost: HTMLElement | null = null;
let globalShadow: ShadowRoot | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let currentTarget: HTMLElement | null = null;
let menuVisible = false;
let currentPosition: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left' | 'top-center' = 'top-left';

// 已选中的图片队列（checkbox 选中的）
const selectedImages = new Map<HTMLElement, { url: string; thumbnail: string }>();

// ── 样式 ──────────────────────────────────────────────────────
const STYLES = `
  :host { all: initial; }

  .container {
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    overflow: visible;
    pointer-events: none;
    z-index: 2147483647;
  }

  /* ── 按钮组 ── */
  .btn-group {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 3px;
    pointer-events: none;
    opacity: 0;
    transform: scale(0.85) translateY(-4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  .btn-group.visible {
    pointer-events: auto;
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  /* ── 通用按钮 ── */
  .btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    outline: none;
    transition: transform 0.15s, opacity 0.15s, background 0.15s;
    position: relative;
  }

  .btn:hover { transform: scale(1.08); }
  .btn:active { transform: scale(0.95); }

  /* 快捷工具按钮 */
  .btn-quick {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    box-shadow: 0 2px 8px rgba(79,70,229,0.30);
  }
  .btn-quick:hover { box-shadow: 0 3px 12px rgba(79,70,229,0.40); }

  /* Checkbox 按钮 */
  .btn-check {
    background: rgba(28, 25, 23, 0.85);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .btn-check:hover { background: rgba(28, 25, 23, 0.95); }
  .btn-check.checked {
    background: rgba(79, 70, 229, 0.12);
    border-color: rgba(79, 70, 229, 0.30);
  }

  /* 菜单按钮 */
  .btn-menu {
    background: rgba(28, 25, 23, 0.85);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .btn-menu:hover { background: rgba(28, 25, 23, 0.95); }
  .btn-menu.active {
    background: rgba(79, 70, 229, 0.12);
    border-color: rgba(79, 70, 229, 0.30);
  }

  .btn svg {
    width: 14px;
    height: 14px;
    fill: white;
    pointer-events: none;
    flex-shrink: 0;
  }

  /* loading 状态 */
  .btn-quick.loading { opacity: 0.7; pointer-events: none; }
  .btn-quick.loading .icon-default { display: none; }
  .btn-quick.loading .icon-spin {
    display: block !important;
    animation: spin 0.7s linear infinite;
  }
  .btn-quick.success { background: rgba(34,197,94,0.9); }
  .btn-quick.success .icon-default { display: none; }
  .btn-quick.success .icon-check { display: block !important; }
  .btn-quick.error { background: rgba(239,68,68,0.88); }

  .icon-spin, .icon-check { display: none; }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ── Tooltip ── */
  .tooltip {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.85);
    color: white;
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 3px 8px;
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .btn:hover .tooltip { opacity: 1; }

  /* ── 下拉菜单 ── */
  .dropdown {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    width: 168px;
    background: #1c1917;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    padding: 4px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.40);
    pointer-events: auto;
    opacity: 0;
    transform: scale(0.92) translateY(-4px);
    transform-origin: top right;
    transition: opacity 0.15s ease, transform 0.15s ease;
    z-index: 1;
  }

  .dropdown.visible {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  .dropdown.flip-up {
    top: auto;
    bottom: calc(100% + 6px);
    transform-origin: bottom right;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #f5f5f4;
    transition: background 0.12s;
    border: none;
    background: transparent;
    width: 100%;
    text-align: left;
  }

  .menu-item:hover { background: rgba(255,255,255,0.06); }
  .menu-item:active { background: rgba(255,255,255,0.08); }

  .menu-item svg {
    width: 14px;
    height: 14px;
    fill: #94a3b8;
    flex-shrink: 0;
  }

  .menu-divider {
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin: 3px 6px;
  }

  .menu-item-all {
    color: #6366f1;
    font-weight: 500;
  }
  .menu-item-all svg { fill: #6366f1; }

  /* 图片选中高亮边框（注入到 body 同层） */
  .img-selected-overlay {
    position: fixed;
    pointer-events: none;
    border: 2px solid rgba(34, 197, 94, 0.9);
    border-radius: 4px;
    box-shadow: 0 0 0 1px rgba(34,197,94,0.3);
    z-index: 2147483646;
    transition: all 0.15s;
  }
`;

// SVG 图标
const ICONS = {
  send: `<svg class="icon-default" viewBox="0 0 24 24"><path d="M2 21L23 12L2 3V10L17 12L2 14V21Z"/></svg>`,
  spin: `<svg class="icon-spin" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z"/><path d="M12 22a10 10 0 0 1-10-10h2a8 8 0 0 0 8 8v2z" opacity="0.3"/></svg>`,
  check: `<svg class="icon-check" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
  checkbox: `<svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14v14z"/></svg>`,
  checkboxChecked: `<svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  dots: `<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`,
  externalLink: `<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>`,
};

// 工具图标映射（slug → SVG path）
const TOOL_ICON_MAP: Record<string, string> = {
  'image-compressor':        'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
  'image-resizer':          'M21 21H3M21 3v18M3 3h18M8 8l8 8M16 8H8v8',
  'image-cropper':            'M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14',
  'watermark-add':   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  'watermark-remove':'M9 9l6 6m0-6l-6 6M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
};

function getToolIcon(slug: string): string {
  const path = TOOL_ICON_MAP[slug] ?? TOOL_ICON_MAP['image-compressor'];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;stroke:#94a3b8;fill:none;flex-shrink:0"><path d="${path}"/></svg>`;
}

// ── 全局按钮管理器 ────────────────────────────────────────────

export class OverlayButtonManager {
  private config: RemoteConfig;
  private siteConfig: SiteConfig & { minWidth: number; minHeight: number };
  private hostname: string;
  private observer: MutationObserver | null = null;
  private boundElements = new WeakSet<HTMLElement>();
  private scrollHandler: (() => void) | null = null;
  private quickToolConfig: ToolConfig | null = null;
  private menuToolConfigs: ToolConfig[] = [];

  constructor(config: RemoteConfig, hostname: string) {
    this.config = config;
    this.hostname = hostname;
    this.siteConfig = getSiteConfig(config, hostname);
    this.quickToolConfig = getQuickTool(config, this.siteConfig.quickTool);
    this.menuToolConfigs = getMenuTools(config, this.siteConfig.menuTools);
  }

  init() {
    ensureGlobalHost(this.quickToolConfig, this.menuToolConfigs, this.siteConfig);
    this.scanAndBind();

    this.observer = new MutationObserver(() => {
      clearTimeout((this as any)._scanTimer);
      (this as any)._scanTimer = setTimeout(() => this.scanAndBind(), 600);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });

    this.scrollHandler = () => {
      if (currentTarget) positionButtons(currentTarget);
    };
    window.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });
  }

  destroy() {
    this.observer?.disconnect();
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, { capture: true });
    }
    globalHost?.remove();
    globalHost = null;
    globalShadow = null;
  }

  private scanAndBind() {
    const selector = this.siteConfig.imageSelector || 'img';
    let elements: NodeListOf<Element>;
    try { elements = document.querySelectorAll(selector); }
    catch { elements = document.querySelectorAll('img'); }

    elements.forEach(el => {
      const target = el as HTMLElement;
      if (this.boundElements.has(target)) return;
      if (this.siteConfig.skipContainerSelector &&
          target.closest(this.siteConfig.skipContainerSelector)) return;
      this.bindElement(target);
    });
  }

  private bindElement(target: HTMLElement) {
    const { minWidth, minHeight } = this.siteConfig;

    const checkSize = () => {
      // 统一使用 CSS 渲染尺寸（getBoundingClientRect）判断
      // 即使图片原始分辨率很高，如果页面上显示很小（如头像图标）
      // 悬浮按钮按上去也不方便，视觉上也不协调
      const rect = target.getBoundingClientRect();
      return rect.width >= minWidth && rect.height >= minHeight;
    };

    target.addEventListener('mouseenter', () => {
      if (!checkSize()) return;
      currentTarget = target;
      showButtons(target);
      track('overlay_button_show', { platform: this.hostname });
    }, { passive: true });

    target.addEventListener('mouseleave', (e) => {
      const related = (e as MouseEvent).relatedTarget as Node | null;
      if (related && globalShadow?.contains(related)) return;
      scheduleHide();
    }, { passive: true });

    this.boundElements.add(target);
  }
}

// ── 全局 UI 创建 ──────────────────────────────────────────────

function ensureGlobalHost(
  quickTool: ToolConfig | null,
  menuTools: ToolConfig[],
  siteConfig: SiteConfig & { minWidth: number; minHeight: number }
) {
  if (globalHost) return;

  currentPosition = siteConfig.buttonPosition ?? 'top-left';
  globalHost = document.createElement('div');
  globalHost.setAttribute('data-bulkpic-host', 'true');
  globalHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';

  globalShadow = globalHost.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = STYLES;
  globalShadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'container';

  const btnGroup = document.createElement('div');
  btnGroup.className = 'btn-group';

  // ── 按钮一：快捷工具 ──
  const quickBtn = document.createElement('button');
  quickBtn.className = 'btn btn-quick';
  quickBtn.innerHTML = ICONS.send + ICONS.spin + ICONS.check +
    `<span class="tooltip">${getToolLabel(quickTool ?? { slug: 'compress', label: { zh: '压缩', en: 'Compress' }, icon: '', enabled: true, order: 1 }, LANG)}</span>`;

  // ── 按钮二：Checkbox ──
  const checkBtn = document.createElement('button');
  checkBtn.className = 'btn btn-check';
  checkBtn.innerHTML = ICONS.checkbox +
    `<span class="tooltip">${t('overlay_select')}</span>`;

  // ── 按钮三：菜单 ──
  const menuBtn = document.createElement('button');
  menuBtn.className = 'btn btn-menu';
  menuBtn.innerHTML = ICONS.dots +
    `<span class="tooltip">${t('overlay_more_tools')}</span>`;

  // ── 下拉菜单 ──
  const dropdown = buildDropdown(menuTools);
  menuBtn.appendChild(dropdown);

  btnGroup.appendChild(quickBtn);
  btnGroup.appendChild(checkBtn);
  btnGroup.appendChild(menuBtn);
  container.appendChild(btnGroup);
  globalShadow.appendChild(container);

  // 按钮组 hover 时取消隐藏
  btnGroup.addEventListener('mouseenter', () => {
    if (hideTimer) clearTimeout(hideTimer);
  });
  btnGroup.addEventListener('mouseleave', () => {
    if (!menuVisible) scheduleHide();
  });

  // ── 事件绑定 ──

  // 快捷工具点击
  quickBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentTarget) return;
    await handleQuickSend(currentTarget, quickBtn, quickTool?.slug ?? 'image-compressor');
  });

  // Checkbox 点击
  checkBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentTarget) return;
    handleCheckbox(currentTarget, checkBtn);
  });

  // 菜单按钮点击
  menuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown(dropdown, menuBtn);
  });

  // 点击菜单外关闭
  document.addEventListener('click', () => {
    if (menuVisible) closeDropdown(dropdown, menuBtn);
  });

  document.body.appendChild(globalHost);
}

/**
 * 构建工具下拉菜单
 */
function buildDropdown(menuTools: ToolConfig[]): HTMLElement {
  const dropdown = document.createElement('div');
  dropdown.className = 'dropdown';

  menuTools.forEach(tool => {
    const item = document.createElement('button');
    item.className = 'menu-item';
    item.innerHTML = `${getToolIcon(tool.slug)}<span>${getToolLabel(tool, LANG)}</span>`;
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!currentTarget) return;
      closeDropdown(dropdown, null);
      await handleMenuSend(currentTarget, tool.slug);
    });
    dropdown.appendChild(item);
  });

  // 分隔线 + 查看全部工具
  const divider = document.createElement('div');
  divider.className = 'menu-divider';
  dropdown.appendChild(divider);

  const allItem = document.createElement('button');
  allItem.className = 'menu-item menu-item-all';
  allItem.innerHTML = `${ICONS.externalLink}<span>${t('overlay_all_tools')}</span>`;
  allItem.addEventListener('click', (e) => {
    e.stopPropagation();
    window.open('https://bulkpictools.com', '_blank');
    closeDropdown(dropdown, null);
  });
  dropdown.appendChild(allItem);

  return dropdown;
}

// ── 位置控制 ──────────────────────────────────────────────────

function positionButtons(target: HTMLElement) {
  if (!globalShadow) return;
  const btnGroup = globalShadow.querySelector('.btn-group') as HTMLElement;
  if (!btnGroup) return;

  const rect = target.getBoundingClientRect();
  const G = 8;      // gap / padding
  const GW = 90;    // 按钮组总宽
  const BH = 28;    // 单按钮高

  let x: number, y: number;
  switch (currentPosition) {
    case 'top-left':
      x = rect.left + G;
      y = rect.top + G;
      break;
    case 'top-right':
      x = rect.right - GW - G;
      y = rect.top + G;
      break;
    case 'bottom-right':
      x = rect.right - GW - G;
      y = rect.bottom - BH - G;
      break;
    case 'bottom-left':
      x = rect.left + G;
      y = rect.bottom - BH - G;
      break;
    case 'top-center':
      x = rect.left + rect.width / 2 - GW / 2;
      y = rect.top + G;
      break;
    default:
      x = rect.left + G;
      y = rect.top + G;
  }

  btnGroup.style.left = `${x}px`;
  btnGroup.style.top = `${y}px`;

  // 检查下拉菜单是否需要翻转到上方
  const dropdown = globalShadow.querySelector('.dropdown') as HTMLElement;
  if (dropdown) {
    const spaceBelow = window.innerHeight - (y + 40);
    const dropdownH = dropdown.offsetHeight || 200;
    if (spaceBelow < dropdownH) {
      dropdown.classList.add('flip-up');
    } else {
      dropdown.classList.remove('flip-up');
    }
  }
}


function showButtons(target: HTMLElement) {
  if (!globalShadow) return;
  if (hideTimer) clearTimeout(hideTimer);
  positionButtons(target);
  const btnGroup = globalShadow.querySelector('.btn-group') as HTMLElement;
  if (btnGroup) btnGroup.classList.add('visible');

  // 同步 checkbox 状态
  const checkBtn = globalShadow.querySelector('.btn-check') as HTMLButtonElement;
  if (checkBtn) {
    const isChecked = selectedImages.has(target);
    checkBtn.className = `btn btn-check${isChecked ? ' checked' : ''}`;
    const overlayTip = isChecked
      ? t('overlay_deselect')
      : t('overlay_select');
    checkBtn.innerHTML = (isChecked ? ICONS.checkboxChecked : ICONS.checkbox) +
      `<span class="tooltip">${overlayTip}</span>`;
  }
}

function scheduleHide() {
  hideTimer = setTimeout(() => {
    if (menuVisible) return;
    const btnGroup = globalShadow?.querySelector('.btn-group') as HTMLElement;
    if (btnGroup) btnGroup.classList.remove('visible');
    currentTarget = null;
  }, 220);
}

function toggleDropdown(dropdown: HTMLElement, menuBtn: HTMLElement) {
  menuVisible = !menuVisible;
  dropdown.classList.toggle('visible', menuVisible);
  menuBtn.classList.toggle('active', menuVisible);
  if (menuVisible && hideTimer) clearTimeout(hideTimer);
}

function closeDropdown(dropdown: HTMLElement, menuBtn: HTMLElement | null) {
  menuVisible = false;
  dropdown.classList.remove('visible');
  menuBtn?.classList.remove('active');
}

// ── 操作处理 ──────────────────────────────────────────────────

/**
 * 快捷工具：抓图 → 跳转指定工具落地页
 */
async function handleQuickSend(target: HTMLElement, btn: HTMLButtonElement, toolSlug: string) {
  btn.className = 'btn btn-quick loading';
  try {
    const sid = await captureAndSave(target);
    if (!sid) { setQuickError(btn); return; }

    btn.className = 'btn btn-quick success';
    track('overlay_button_click', { action: 'quick', tool: toolSlug });

    setTimeout(() => {
      const url = buildImportUrl({ sid, action: 'auto_run', preset: toolSlug, lang: LANG });
      window.open(url, '_blank');
      setTimeout(() => { btn.className = 'btn btn-quick'; }, 1000);
    }, 300);
  } catch (err) {
    console.error('[BulkPic] quickSend error:', err);
    setQuickError(btn);
  }
}

/**
 * 菜单工具：抓图 → 跳转选定工具落地页
 */
async function handleMenuSend(target: HTMLElement, toolSlug: string) {
  try {
    const sid = await captureAndSave(target);
    if (!sid) return;
    track('overlay_button_click', { action: 'menu', tool: toolSlug });
    const url = buildImportUrl({ sid, action: 'auto_run', preset: toolSlug, lang: LANG });
    window.open(url, '_blank');
  } catch (err) {
    console.error('[BulkPic] menuSend error:', err);
  }
}

/**
 * Checkbox：选中/取消选中图片
 */
function handleCheckbox(target: HTMLElement, checkBtn: HTMLButtonElement) {
  const isChecked = selectedImages.has(target);

  if (isChecked) {
    selectedImages.delete(target);
    checkBtn.className = 'btn btn-check';
    checkBtn.innerHTML = ICONS.checkbox +
      `<span class="tooltip">${t('overlay_select')}</span>`;
  } else {
    // 生成预览 URL（仅用于 Sidebar 显示）
    const img = target as HTMLImageElement;
    const src = img.currentSrc || img.src || '';
    selectedImages.set(target, { url: src, thumbnail: src });
    checkBtn.className = 'btn btn-check checked';
    checkBtn.innerHTML = ICONS.checkboxChecked +
      `<span class="tooltip">${t('overlay_deselect')}</span>`;
  }

  // 通知 Sidebar 更新选中列表
  window.dispatchEvent(new CustomEvent('bulkpic:selectionChange', {
    detail: { count: selectedImages.size, images: Array.from(selectedImages.entries()).map(([el, data]) => data) },
  }));

  track('checkbox_click', { action: isChecked ? 'deselect' : 'select', total: selectedImages.size });
}

/**
 * 抓取图片并存入插件 IDB，返回 sid
 */
async function captureAndSave(target: HTMLElement): Promise<string | null> {
  const img = target as HTMLImageElement;
  const src = img.currentSrc || img.src;

  let blob: Blob | null = null;

  if (isSignedCdnUrl(src)) {
    // 签名 CDN：在 content script 里 fetch（带页面 cookie）
    blob = await fetchWithPageContext(src, location.href);
  } else if (src.startsWith('blob:')) {
    // Blob URL
    const resp = await fetch(src);
    blob = await resp.blob();
  } else if (src) {
    // 普通 URL：直接 fetch
    const resp = await fetch(src);
    blob = await resp.blob();
  }

  if (!blob || blob.size < 100) return null;

  // Blob → ArrayBuffer → background 存 IDB
  const arrayBuffer = await blob.arrayBuffer();

  const resp = await browser.runtime.sendMessage({
    type: 'SAVE_BLOB_SESSION',
    arrayBuffer: arrayBufferToBase64(arrayBuffer),
    mimeType: blob.type || 'image/jpeg',
  });

  return resp?.sid ?? null;
}

function setQuickError(btn: HTMLButtonElement) {
  btn.className = 'btn btn-quick error';
  setTimeout(() => { btn.className = 'btn btn-quick'; }, 2000);
}

/**
 * 获取当前选中的图片列表（供 Sidebar 使用）
 */
export function getSelectedImages() {
  return Array.from(selectedImages.entries()).map(([el, data]) => ({
    element: el,
    ...data,
  }));
}

/**
 * 清空选中列表
 */
export function clearSelection() {
  selectedImages.clear();
  window.dispatchEvent(new CustomEvent('bulkpic:selectionChange', {
    detail: { count: 0, images: [] },
  }));
}