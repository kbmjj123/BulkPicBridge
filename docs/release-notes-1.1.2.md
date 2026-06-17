# Release Notes — v1.1.2

## What's New

### 🌐 Multi-language Support
- Browser language auto-detection: when browser is set to Chinese, import links now automatically use `/zh/import` path
- All inline strings migrated to Chrome i18n locale system (`locales/`)
- Tooltips on overlay buttons now properly localized via `browser.i18n.getMessage()`

### 🎨 Dynamic Popup Tools
- Popup tool buttons now dynamically loaded from remote config (site-specific tools)
- Each tool button displays its correct icon (24 tool icons mapped)
- Popup simplified: tool navigation handled by Sidebar, popup focuses on "Extract All Images" + send

### 🖱️ Smarter Overlay Button
- Default position changed to **top-left** to avoid overlap with site controls
- Per-domain position configuration via `buttonPosition` field in remote config
  - Default: `top-left` | Options: `top-right`, `bottom-right`, `bottom-left`, `top-center`
- Fixed: hidden overlay buttons no longer block image clicks (`pointer-events` fix)

### 🛡️ CORS & Compatibility
- Fixed: `credentials: 'include'` removed from CDN fetches — resolves CORS errors on Pixabay, Unsplash, etc.
- Fixed: `content.ts` path matching now supports locale prefixes (`/zh/import`, `/ja/import`)
- Content script now falls back to background proxy for CORS-blocked images

### ⚡ UX Improvements
- Sidebar auto-closes after sending images (`window.close()`)
- Popup "Send" buttons now have loading states to prevent double-clicks
- Popup footer: dev-only "Refresh Config" button for testing config changes
- Sidebar "View All Tools" behavior improved

### 🔧 Developer Tools
- Added `public/menu-config.local.json` — local config for development testing
- Popup "Refresh Config" button clears cache and reloads remote config instantly

## Files Changed

```
components/Overlaybuttonv2.ts     — pointer-events, i18n, per-domain position, CORS fallback
entrypoints/content.ts            — locale-aware import path matching
entrypoints/popup/App.vue         — dynamic tools, i18n, loading states, dev config refresh
entrypoints/sidepanel/SidebarApp.vue — auto-close, i18n, CORS fallback
utils/urlBuilder.ts               — language prefix in import URLs
utils/remoteConfigService.ts      — minor fixes
utils/type.d.ts                   — ButtonPosition type, SiteConfig.buttonPosition
utils/config.ts                   — default buttonPosition: top-left
locales/en.json / zh-CN.json     — overlay messages, popup.sending
public/menu-config.local.json     — local test config
```

---

# Notes for Store Reviewers

**Chrome Web Store / Edge Add-ons Reviewer Notes — v1.1.2**

This update focuses on better multi-language support, configurable overlay button positioning, and CORS compatibility fixes.

**Key changes verified:**

1. **No new permissions required.** All APIs used (`storage`, `tabs`, `sidePanel`, `alarms`, `contextMenus`) were already declared in v1.1.0.

2. **`host_permissions: <all_urls>`** — unchanged from previous version. Required for content script injection and image fetching across arbitrary websites.

3. **Remote configuration** is fetched from `cdn.bulkpictools.com/bridge/menu-config.json` — only contains tool definitions and per-site UI preferences (no user data).

4. **User data**: Images are processed locally in IndexedDB with 30-minute TTL. No images are uploaded to external servers — they are transferred to `bulkpictools.com` only when the user explicitly clicks "Send."

5. **`sidePanel` permission** — only used to open the side panel on user action (clicking checkbox on images). Panel content is fully local Vue app.

**Test scenarios:**
- Popup: click icon → "Extract All Images" → select thumbnails → "Send Selected"
- Sidebar: hover image on supported site → click checkbox → open sidebar → select tool → send
- Verify language: change browser language to 中文 → links should go to `/zh/import`
- Verify button position: hover image → overlay buttons appear at top-left

**Contact:** bulkpictools.com support form for any questions.
