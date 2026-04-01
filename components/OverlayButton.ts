/**
 * OverlayButton — 非侵入式悬浮按钮
 *
 * 核心改动：
 * - 不再修改任何页面 DOM 结构和父容器样式
 * - 按钮挂载到 document.body 最顶层，用 fixed 定位跟随图片位置
 * - 通过 mouseenter/mouseleave 事件控制显示/隐藏
 * - 完全不干扰豆包等平台的虚拟滚动和懒加载
 */
import { i18n } from '#imports';
// ── 全局唯一的悬浮按钮容器（挂载到 body，fixed 定位） ──────────
let globalHost: HTMLElement | null = null;
let globalShadow: ShadowRoot | null = null;
let mainBtn: HTMLButtonElement | null = null;
let exifBtn: HTMLButtonElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let currentTarget: HTMLElement | null = null;

const logger = createLogger('OverlayButton')

const STYLES = `
  :host { all: initial; }

  .container {
    position: fixed;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 2147483647;
  }

  .btn-wrap {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 4px;
    pointer-events: auto;
    opacity: 0;
    transform: scale(0.85);
    transition: opacity 0.18s ease, transform 0.18s ease;
  }

  .btn-wrap.visible {
    opacity: 1;
    transform: scale(1);
  }

  .btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1.5px solid rgba(255,255,255,0.35);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    outline: none;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }

  .btn-main {
    background: rgba(99, 102, 241, 0.92);
    box-shadow: 0 2px 8px rgba(99,102,241,0.4);
  }

  .btn-main:hover { background: rgba(79, 82, 221, 1); transform: scale(1.08); }
  .btn-main:active { transform: scale(0.95); }

  .btn-exif {
    background: rgba(30, 30, 40, 0.82);
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }

  .btn-exif:hover { background: rgba(50,50,65,0.95); transform: scale(1.08); }

  .btn svg { width: 16px; height: 16px; fill: white; pointer-events: none; }

  /* 加载中 */
  .btn-main.loading { opacity: 0.7; }
  .btn-main.loading .icon-send { display: none; }
  .btn-main.loading .icon-spin { display: block !important; animation: spin 0.7s linear infinite; }
  .icon-spin { display: none; }

  /* 成功 */
  .btn-main.success { background: rgba(34,197,94,0.92); }
  .btn-main.success .icon-send { display: none; }
  .btn-main.success .icon-check { display: block !important; }
  .icon-check { display: none; }

  /* 错误 */
  .btn-main.error { background: rgba(239,68,68,0.88); }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

const SVG_SEND = `<svg viewBox="0 0 24 24" class="icon-send"><path d="M2 21L23 12L2 3V10L17 12L2 14V21Z"/></svg>`;
const SVG_SPIN = `<svg viewBox="0 0 24 24" class="icon-spin"><path d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z" opacity="1"/><path d="M12 22a10 10 0 0 1-10-10h2a8 8 0 0 0 8 8v2z" opacity="0.3"/></svg>`;
const SVG_CHECK = `<svg viewBox="0 0 24 24" class="icon-check"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
const SVG_SHIELD = `<svg viewBox="0 0 24 24"><path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3zm-1 13l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z"/></svg>`;

/**
 * 初始化全局按钮容器（只创建一次）
 */
function ensureGlobalHost() {
  if (globalHost) return;

  globalHost = document.createElement('div');
  globalHost.setAttribute('data-bulkpic-host', 'true');
  globalHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';

  globalShadow = globalHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLES;
  globalShadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'container';

  const btnWrap = document.createElement('div');
  btnWrap.className = 'btn-wrap';

  mainBtn = document.createElement('button');
  mainBtn.className = 'btn btn-main';
  mainBtn.title = i18n.t('send_to_bulkpictools');
  mainBtn.innerHTML = SVG_SEND + SVG_SPIN + SVG_CHECK;

  exifBtn = document.createElement('button');
  exifBtn.className = 'btn btn-exif';
  exifBtn.title = i18n.t('view_privacy_risk');
  exifBtn.innerHTML = SVG_SHIELD;

  btnWrap.appendChild(mainBtn);
  // btnWrap.appendChild(exifBtn);
  container.appendChild(btnWrap);
  globalShadow.appendChild(container);

  // 鼠标在按钮上时，取消隐藏计时器
  btnWrap.addEventListener('mouseenter', () => {
    if (hideTimer) clearTimeout(hideTimer);
  });

  btnWrap.addEventListener('mouseleave', () => {
    scheduleHide();
  });

  document.body.appendChild(globalHost);
}

/**
 * 定位按钮到目标图片的右上角
 */
function positionButtons(target: HTMLElement) {
  if (!globalShadow) return;
  const btnWrap = globalShadow.querySelector('.btn-wrap') as HTMLElement;
  if (!btnWrap) return;

  const rect = target.getBoundingClientRect();
  const OFFSET = 8;
  const btnRight = rect.right - 34 - OFFSET;
  const btnTop = rect.top + OFFSET;

  btnWrap.style.left = `${btnRight}px`;
  btnWrap.style.top = `${btnTop}px`;
}

function showButtons(target: HTMLElement) {
  if (!globalShadow) return;
  if (hideTimer) clearTimeout(hideTimer);

  positionButtons(target);

  const btnWrap = globalShadow.querySelector('.btn-wrap') as HTMLElement;
  if (btnWrap) btnWrap.classList.add('visible');
}

function scheduleHide() {
  hideTimer = setTimeout(() => {
    if (!globalShadow) return;
    const btnWrap = globalShadow.querySelector('.btn-wrap') as HTMLElement;
    if (btnWrap) btnWrap.classList.remove('visible');
    currentTarget = null;
  }, 200);
}

export class OverlayButtonManager {
  private adapter: SiteAdapter;
  private observer: MutationObserver | null = null;
  private boundElements = new WeakSet<HTMLElement>();
  private scrollHandler: (() => void) | null = null;

  constructor(adapter: SiteAdapter) {
    this.adapter = adapter;
  }

  init() {
    ensureGlobalHost();
    this.bindButtons();
    this.scanAndBind();

    // MutationObserver 只监听新节点，不做任何 DOM 修改
    this.observer = new MutationObserver(() => {
      clearTimeout((this as any)._scanTimer);
      (this as any)._scanTimer = setTimeout(() => this.scanAndBind(), 600);
    });

    this.observer.observe(document.body, { childList: true, subtree: true });

    // 滚动时实时更新按钮位置
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
    mainBtn = null;
    exifBtn = null;
  }

  /**
   * 绑定主/副按钮的点击事件（只绑定一次）
   */
  private bindButtons() {
    mainBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!currentTarget) return;
      await this.handleSend(currentTarget);
    });

    exifBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!currentTarget) return;
      await this.handleExif(currentTarget);
    });
  }

  /**
   * 扫描页面中符合条件的图片，绑定 mouseenter/mouseleave
   * 完全不修改任何 DOM 结构
   */
  private scanAndBind() {
    const selector = this.adapter.imageSelector || 'img';
    let elements: NodeListOf<Element>;
    try {
      elements = document.querySelectorAll(selector);
    } catch {
      elements = document.querySelectorAll('img');
    }

    elements.forEach(el => {
      const target = el as HTMLElement;
      if (this.boundElements.has(target)) return;

      // 跳过平台自身 UI 容器内的元素
      if (this.adapter.skipContainerSelector && target.closest(this.adapter.skipContainerSelector)) return;

      this.bindElement(target);
    });
  }

  private bindElement(target: HTMLElement) {
    const checkSize = (): boolean => {
      const rect = target.getBoundingClientRect();
      const w = (target as HTMLImageElement).naturalWidth || rect.width;
      const h = (target as HTMLImageElement).naturalHeight || rect.height;
      return w >= this.adapter.minWidth && h >= this.adapter.minHeight;
    };

    const onEnter = () => {
      if (!checkSize()) return;
      currentTarget = target;
      showButtons(target);
      track('overlay_button_show', { platform: this.adapter.name });
    };

    const onLeave = () => {
      scheduleHide();
    };

    target.addEventListener('mouseenter', onEnter, { passive: true });
    target.addEventListener('mouseleave', onLeave, { passive: true });

    this.boundElements.add(target);
  }

  private async handleSend(target: HTMLElement) {
    if (!mainBtn) return;
    mainBtn.className = 'btn btn-main loading';
    mainBtn.disabled = true;

    try {
			debugger
      const source = await resolveImageSource(target, this.adapter.cleanUrl);

      if (source.type === 'unsupported') {
        logger.warn('[BulkPic] resolveImageSource unsupported:', source.reason);
        this.setError();
        return;
      }

      trackResolveSource(
        source.type === 'blob' ? 'blob' : 'img',
        this.adapter.name
      );
      track('overlay_button_click', { platform: this.adapter.name });

      let importUrl: string;

      if (source.type === 'blob') {
        const arrayBuffer = await source.value.arrayBuffer();
        const mimeType = source.value.type || 'image/jpeg';
        const resp = await browser.runtime.sendMessage({
          type: 'SAVE_BLOB_SESSION',
          arrayBuffer: arrayBufferToBase64(arrayBuffer),
          mimeType,
        });
        if (!resp?.sid) throw new Error('插件存储失败，未返回 sid');
        importUrl = buildImportUrl({ sid: resp.sid, action: 'auto_run', preset: 'image-compressor' });

      } else if (source.value.startsWith('blob:')) {
        // ── 页面内 Blob URL → background 代理抓取后存 IDB ────
        const resp = await browser.runtime.sendMessage({
          type: 'FETCH_IMAGE_PROXY',
          url: source.value,
          options: { referer: location.href },
        });

        if (!resp?.sid) {
          throw new Error('代理抓取失败');
        }

        importUrl = buildImportUrl({
          sid: resp.sid,
          action: 'auto_run',
          preset: 'image-compressor',
        });

      } else {
        // ── 普通 URL → 主站直接 fetch，无需中转 ──────────────
        importUrl = buildImportUrl({
          url: encodeURIComponent(source.value),
          action: 'auto_run',
          preset: 'image-compressor',
        });
      }

      // ── 成功状态，跳转主站 ────────────────────────────────
      mainBtn.className = 'btn btn-main success';
      track('jump_to_main_site', { platform: this.adapter.name });

      setTimeout(() => {
        window.open(importUrl, '_blank');
        setTimeout(() => {
          if (mainBtn) {
            mainBtn.className = 'btn btn-main';
            mainBtn.disabled = false;
          }
        }, 1000);
      }, 300);

    } catch (err) {
      logger.error('[BulkPic] Send error:', err);
      this.setError();
    }
  }


  private async handleExif(target: HTMLElement) {
    if (!exifBtn) return;
    exifBtn.style.opacity = '0.5';

    try {
      const source = await resolveImageSource(target, this.adapter.cleanUrl);
      let exifData = null;

      if (source.type === 'blob') {
        // Blob（含签名 CDN canvas 导出）→ 直接读 EXIF，零网络请求
        exifData = await checkExifFromBlob(source.value);
      } else if (source.type === 'url' && !source.value.startsWith('blob:')) {
        // 普通 URL（非签名 CDN）→ fetch 读取
        // 注意：isSignedCdnUrl 的 URL 在 resolveImageSource 里已经被转成 blob
        // 走到这里的 URL 一定是安全可 fetch 的
        exifData = await checkExifFromUrl(source.value);
      }

      const report = generateRiskReport(exifData);
      trackExifRisk(report.riskLevel, this.adapter.name);

      window.dispatchEvent(new CustomEvent('bulkpic:showExif', {
        detail: {
          report,
          imageUrl: source.type === 'url' ? source.value : null,
          targetRect: target.getBoundingClientRect(),
        },
      }));
    } catch (err) {
      logger.error('[BulkPic] EXIF error:', err);
    } finally {
      if (exifBtn) exifBtn.style.opacity = '';
    }
  }

  private setError() {
    if (!mainBtn) return;
    mainBtn.className = 'btn btn-main error';
    setTimeout(() => {
      if (mainBtn) {
        mainBtn.className = 'btn btn-main';
        mainBtn.disabled = false;
      }
    }, 2000);
  }
}