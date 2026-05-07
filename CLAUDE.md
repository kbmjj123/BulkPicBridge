# BulkPic Bridge

浏览器插件：从任意网页一键将图片送入 bulkpictools.com 的 29+ 个图片处理工具。

## Tech Stack

- **Framework:** WXT (^0.20.20) — 下一代 Web Extension 工具链
- **UI:** Vue 3 (^3.5) + TailwindCSS 3
- **Build:** Vite + WXT
- **Language:** TypeScript (strict)
- **Extensions:** chrome (MV3), sidePanel, contextMenus, storage, alarms

## Commands

```bash
# 开发（Chrome）
pnpm dev

# 开发（指定端口）
pnpm dev           # 默认 3001，见 wxt.config.ts

# 构建
pnpm build

# 打包 ZIP
pnpm zip

# Firefox
pnpm dev:firefox
pnpm build:firefox
pnpm zip:firefox

# 类型检查（Vue TS）
pnpm compile       # vue-tsc --noEmit
```

## Environment Variables (.env.local)

| Variable | Purpose | Default |
|---|---|---|
| `WXT_BRIDGE_BULKPICTOOLS_URL` | 主站地址（开发时指向 localhost） | `https://bulkpictools.com` |
| `WXT_BRIDGE_UMAMI_WEBSITE_ID` | Umami 统计网站 ID | 空 |
| `WXT_BRIDGE_UMAMI_OPEN` | 是否启用统计 | `false` |
| `WXT_CONSOLE_LOG` | 是否输出 console.log | `true` |

## Architecture

### Entrypoints（WXT 概念）

```
entrypoints/
├── background.ts      # Service Worker — 消息路由 & 定时任务
├── content.ts         # Content Script — 页面注入 & OverlayButton
├── popup/             # 浏览器工具栏弹窗（Vue 3）
│   └── App.vue
└── sidepanel/         # Chrome Side Panel（Vue 3）
    └── SidebarApp.vue
```

### Utils 分层

```
utils/
├── config.ts                    # 内置兜底配置（40+ 工具、20+ 站点）
├── remoteConfigService.ts        # 远程配置拉取（R2 → storage → 内存三级缓存）
├── indexedDBService.ts          # IndexedDB 图片 Blob 存储（30min TTL）
├── imageExtractor.ts            # 全页图片智能提取（img/background/canvas）
├── resolveImageSource.ts        # 单图源识别（签名 CDN/Blob/URL/CSS/Canvas）
├── urlBuilder.ts                # 主站跳转 URL 构建
├── siteAdapter.ts               # 平台适配器定义（Midjourney/豆包/Bing 等）
├── exifReader.ts                # 纯客户端 JPEG EXIF 解析
├── analytics.ts                 # Umami 无 Cookie 统计
├── logger.ts                    # 带前缀的日志工具
├── devtools.ts                  # 开发调试 API（dev 模式自动挂载）
├── type.d.ts                    # 类型定义
└── index.ts                     # base64 ↔ ArrayBuffer 工具函数
```

### Components

```
components/
└── Overlaybuttonv2.ts    # 悬浮三按钮（Shadow DOM 隔离样式）
```

### 消息协议（background 路由）

| type | 方向 | 用途 |
|---|---|---|
| `SAVE_BLOB_SESSION` | content → background | 单图 base64 存 IDB |
| `SAVE_BULK_SESSION` | sidebar → background | 批量存 IDB |
| `FETCH_IMAGE_PROXY` | content → background | 代理 fetch 图片 |
| `GET_BLOB_SESSION` | content → background | 读取 IDB session |
| `DELETE_SESSION` | → background | 删除 session |
| `OPEN_IMPORT_URL` / `OPEN_BULK_IMPORT` | → background | 跳转主站 |
| `FORWARD_TO_SIDEBAR` | content → background → sidebar | 选中状态广播 |
| `OPEN_SIDEBAR` | popup → background | 打开 side panel |
| `EXTRACT_ALL_IMAGES` | popup → content | 全页提取 |
| `FETCH_IMAGE_FOR_SIDEBAR` | sidebar → content | 签名 CDN 代理 fetch |
| `SELECTION_CHANGE` | background → sidebar | 选中列表更新 |
| `DESELECT_IMAGE` / `CLEAR_SELECTION` | sidebar → content | 取消选中 |
| `SHOW_EXIF_PANEL` | background → content | 右键菜单触发的 EXIF |

### 图片传输策略

```
≤5 张 + URL 总长 ≤2000 → URL Params 直传
否则 → IndexedDB sessionId 中转
```

## Key Conventions

1. **OverlayButton 不使用 Vue** — 用原生 DOM + Shadow DOM 避免污染页面样式
2. **签名 CDN 图片**（byteimg.com 等）必须在 content script 页面上下文 fetch，不能走 background proxy
3. **日志**统一使用 `createLogger('模块名')`，由 `WXT_CONSOLE_LOG` 控制开关
4. **统计埋点**使用 `track()` 函数，全部异步 fire-and-forget，失败不影响主流程
5. **EXIF 解析零依赖** — 手动解析 JPEG/TIFF 二进制，图片不离开客户端
6. **远程配置**三级缓存：内存 → chrome.storage（24h）→ CDN fetch → 内置兜底
7. **Session TTL** 30 分钟，后台每 15 分钟清理过期数据
8. **Popup 宽度** 380px，遵循设计规范

## Imports

```typescript
// WXT 提供的全局 API
import { browser } from 'wxt/browser'   // Chrome API 封装
import { storage } from 'wxt/storage'   // 简化 storage 读写
import { i18n } from '#i18n'            // 国际化
import { defineContentScript } from 'wxt'  // content script 定义
import { defineBackground } from 'wxt'     // background 定义

// 项目内部
import { createLogger } from '@/utils/logger'
import { getConfig, getSiteConfig } from '@/utils/remoteConfigService'
import { buildImportUrl } from '@/utils/urlBuilder'
import { track } from '@/utils/analytics'
import { resolveImageSource, isSignedCdnUrl, fetchWithPageContext } from '@/utils/resolveImageSource'
import { extractPageImages } from '@/utils/imageExtractor'
import { getAdapter } from '@/utils/siteAdapter'
import { arrayBufferToBase64, base64ToArrayBuffer } from '@/utils'
```

## TypeScript

- strict mode 启用
- 路径别名 `@/` 映射到项目根目录
- 类型定义集中在 `utils/type.d.ts`
- 核心类型：`RemoteConfig`, `ToolConfig`, `SiteConfig`, `ImageFilter`, `SiteAdapter`, `ExtractedImage`
