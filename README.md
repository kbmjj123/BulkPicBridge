# BulkPic Bridge — 浏览器插件

> AI 图片一键搬运工具 · 从生成到处理，全程本地，零上传 · Phase 1 MVP

---

## 📁 文件结构说明

```
bulkpic-ai-porter/           ← 插件项目根目录
├── package.json
├── wxt.config.ts            ← WXT 插件配置（权限、manifest）
├── tailwind.config.js
├── tsconfig.json
│
├── entrypoints/
│   ├── background.ts        ← Service Worker（右键菜单、代理抓取、消息路由）
│   ├── content.ts           ← Content Script（注入逻辑、图片提取、EXIF 面板）
│   └── popup/
│       ├── index.html
│       ├── main.ts
│       └── App.vue          ← Popup UI（Phase 2 批量功能界面）
│
├── lib/
│   ├── resolveImageSource.ts   ← 图源智能识别（6 种格式）
│   ├── exifReader.ts           ← EXIF 隐私体检（纯客户端）
│   ├── imageExtractor.ts       ← 全页图片智能提取（含缩略图生成）  ★新增
│   ├── indexedDBService.ts     ← IndexedDB 大图传递
│   ├── siteAdapters.ts         ← 各平台适配配置（⚠️ 需调研后更新）
│   ├── urlBuilder.ts           ← 主站跳转 URL 构建
│   ├── analytics.ts            ← Umami 无 Cookie 统计埋点            ★新增
│   └── devtools.ts             ← 浏览器 Console 调试工具              ★新增
│
├── components/
│   └── OverlayButton.ts        ← 悬浮按钮注入（核心交互，含埋点）
│
├── assets/
│   ├── icon.svg                ← 品牌图标源文件                       ★新增
│   └── main.css
│
├── scripts/
│   └── generate-icons.js       ← SVG → PNG 图标生成脚本               ★新增
│
└── mainsite/                ← 主站需要新增的代码（复制到 Nuxt 项目）
    ├── composables/
    │   └── useExtensionBridge.ts
    └── pages/
        └── import.vue
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式（Chrome）

```bash
npm run dev
```

WXT 会自动打开 Chrome 并加载插件。

### 3. 生产构建

```bash
npm run build
npm run zip    # 打包为 .zip，用于 Chrome Web Store 上传
```

---

## ⚠️ 开发前必做：平台 DOM 调研

在 `lib/siteAdapters.ts` 中，各平台的 `imageSelector` 是**暂定配置**，
正式开发前**必须**用 DevTools 逐一确认：

| 平台 | 调研要点 |
|---|---|
| Midjourney | 图片是 `<img>` 还是 `<canvas>`？实际 CSS class 是什么？ |
| 豆包 | Blob URL 格式？`data-*` 原图属性名称？ |
| DALL-E / Bing | 生成结果区域的父容器选择器？ |
| Leonardo.ai | 图片流容器的 class？CDN URL 参数格式？ |

调研完成后更新 `siteAdapters.ts` 中对应平台的配置。

---

## 📋 各模块说明

### `lib/resolveImageSource.ts`
按优先级尝试 6 种图片获取方式：
1. `<img src>` / `currentSrc`
2. CSS `background-image`
3. Blob URL（直接 fetch）
4. 父容器 `data-*` 属性
5. Canvas `toBlob()`
6. 子节点 `<img>` 兜底

### `components/OverlayButton.ts`
- 使用 **Shadow DOM** 隔离样式，不被平台 CSS 污染
- 支持 **MutationObserver** 监听动态加载的图片
- 主按钮（发送）+ 副按钮（EXIF 体检）双按钮设计
- 加载中 → 成功 → 错误 完整状态机

### `entrypoints/background.ts`
- 注册右键菜单（兜底方案）
- `FETCH_IMAGE_PROXY`：绕过防盗链，代理抓取图片
- 使用 `browser.alarms` 定期清理过期 IndexedDB sessions

### `mainsite/composables/useExtensionBridge.ts`
主站接收插件数据的组合式函数，支持：
- URL 参数方案（`?url=...&action=auto_run`）
- IndexedDB session 方案（`?sid=...`）
- postMessage 方案（主站已打开时）

---

## 🔗 主站集成

将 `mainsite/` 目录下的文件复制到 Nuxt 4 项目：

```bash
# 复制到 Nuxt 项目
cp mainsite/composables/useExtensionBridge.ts  YOUR_NUXT_PROJECT/composables/
cp mainsite/pages/import.vue                   YOUR_NUXT_PROJECT/pages/
```

在 `pages/import.vue` 中，找到 TODO 注释，接入主站的 Wasm 处理队列：

```ts
// pages/import.vue
onMounted(async () => {
  const items = await bridge.init();
  if (items.length > 0) {
    // 接入主站处理队列
    await processQueue(items); // 你的 Wasm 处理函数
  }
});
```

---

## 🛡️ 隐私设计

- 图片数据**不经过任何外部服务器**
- IndexedDB session 有效期 **30 分钟**，自动清理
- EXIF 读取完全在客户端完成
- 统计方案使用 Umami（无 Cookie，Phase 3 集成）

---

## 🔧 开发调试

在 `content.ts` 的 `main()` 函数末尾启用调试工具：

```typescript
// entrypoints/content.ts
import { initDevTools } from '../lib/devtools';

main() {
  // ...现有代码...
  initDevTools(); // ← 加这一行，生产构建自动 tree-shake
}
```

然后在目标页面打开 DevTools Console：

```javascript
// 查看当前平台适配器配置
BulkPicDev.testAdapter()

// 高亮会注入 Overlay Button 的图片（蓝色边框）
BulkPicDev.highlightTargets()

// 手动提取页面所有图片并查看结果
BulkPicDev.extractImages()

// 测试对某个 img 元素的图源识别
BulkPicDev.testResolve(document.querySelector('img'))

// 测试 EXIF 读取
BulkPicDev.testExif('https://example.com/image.jpg')
```

---

## 🎨 图标生成

```bash
# 安装 sharp（一次性）
npm install --save-dev sharp

# 生成 32px 和 128px PNG
node scripts/generate-icons.js
```

图标会输出到 `public/icon-32.png` 和 `public/icon-128.png`。

如果不想安装 sharp，可以手动用 [CloudConvert](https://cloudconvert.com/svg-to-png) 转换 `assets/icon.svg`。

---

## 📊 统计配置

在 `lib/analytics.ts` 中替换这两行：

```typescript
const UMAMI_ENDPOINT = 'https://analytics.bulkpictools.com/api/send'; // 你的 Umami 实例
const WEBSITE_ID = 'YOUR_UMAMI_WEBSITE_ID'; // 替换为真实 ID
```

统计数据完全匿名，不包含任何图片内容或用户身份信息。

| 周 | 任务 | 对应文件 |
|---|---|---|
| Week 0 | ✅ DevTools 调研 | `lib/siteAdapters.ts`（待更新） |
| Week 1 | Overlay Button + resolveImageSource | `components/OverlayButton.ts`, `lib/resolveImageSource.ts` |
| Week 2 | Background 代理 + EXIF MVP | `entrypoints/background.ts`, `lib/exifReader.ts` |
| Week 3 | 主站 /import 路由联调 | `mainsite/` 目录 |
| Week 4 | 单图闭环测试 + Bug 修复 | 全部 |
