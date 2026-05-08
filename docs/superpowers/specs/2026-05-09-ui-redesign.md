# BulkPic Bridge UI Redesign

> 去除"AI 生成感"，用靛蓝 + 暖灰建立品牌识别
> 2026-05-09

## Design Principles

1. **个性但有克制** — B（Bold & Indie）的色彩胆量 + C（Premium & Refined）的留白与秩序
2. **工具而非玩具** — 插件是效率工具，设计要为功能性服务，不喧宾夺主
3. **紧凑但不局促** — Popup 380px / Sidebar ~320px，每个像素都有价值
4. **暗色为锚** — 仅暗色模式，不做 light/dark 切换，保证视觉纯粹性
5. **性能优先** — 零外部字体加载、零额外网络请求、CSS 变换优先于 JS 动画

## Color System

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#0f0e0c` | 最深层底色 |
| `--bg-card` | `#1c1917` | 卡片、面板、菜单 |
| `--bg-elevated` | `#292524` | 悬浮态、下拉菜单 hover |
| `--bg-overlay` | `rgba(12,10,8,0.82)` | 遮罩层 |

### Accent
| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `#4f46e5` | 主按钮、链接、激活态 |
| `--accent-light` | `#6366f1` | hover 态、次要强调 |
| `--accent-subtle` | `rgba(79,70,229,0.12)` | 标签背景、按钮悬停底纹 |
| `--accent-border` | `rgba(79,70,229,0.25)` | 选中态描边 |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border-default` | `rgba(255,255,255,0.06)` | 默认卡片/面板边框 |
| `--border-strong` | `rgba(255,255,255,0.10)` | 输入框、按钮边框 |
| `--border-accent` | `var(--accent-border)` | 选中态、焦点态 |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#f5f5f4` | 主要文字 |
| `--text-secondary` | `#a8a29e` | 次要说明 |
| `--text-muted` | `#78716c` | 辅助、标签、占位符 |
| `--text-accent` | `#818cf8` | 链接、强调文字 |

### Semantic
| Token | Value |
|-------|-------|
| `--success` | `#22c55e` |
| `--warning` | `#f59e0b` |
| `--error` | `#ef4444` |

## Typography

### Font Stack
```
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text',
             'Segoe UI', system-ui, sans-serif;
```
纯系统字体，零外部依赖。

### Size Scale
| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Brand | 15px | Bold (700) | 标题栏品牌名 |
| Action | 13px | Semibold (600) | 操作按钮、列表标题 |
| Body | 12px | Regular (400) | 正文、描述 |
| Caption | 11px | Medium (500) | 辅助文字、计数 |
| Label | 10px | Semibold (600) + 0.06em | 标签、小提示 |
| Mini | 9px | Semibold (600) + 0.08em | Badge 数字、元信息 |

### Line Height
- Body: 1.5
- Title/Action: 1.3
- Compact: 1.15

## Spacing

Base unit: 4px

| Token | Value | When to use |
|-------|-------|-------------|
| xs | 4px | 图标间距、内嵌间距 |
| sm | 8px | 按钮间距、缩略图间距 |
| md | 12px | 卡片内边距、元素间距 |
| lg | 16px | 区域间距、面板 padding |
| xl | 24px | 区块间距、头部与内容间距 |

## Corner Radius

Only three values:

| Level | Value | Usage |
|-------|-------|-------|
| sm | 4px | Tags / Badges / Mini elements |
| md | 6px | Buttons / Inputs / Icon containers |
| lg | 8px | Cards / Panels / Menus / Modals |

No pill shapes. No rounded-full on elements.

## Box Shadows

| Level | Value |
|-------|-------|
| sm | `0 1px 3px rgba(0,0,0,0.3)` |
| md | `0 4px 12px rgba(0,0,0,0.35)` |
| lg | `0 8px 24px rgba(0,0,0,0.4)` |

All use black-only shadows (no colored shadows except accent buttons).

## Component Specifications

### OverlayButton (`components/Overlaybuttonv2.ts`)

**Dimensions & Layout**
- Each button: 28×28px (previously 30×30)
- Gap between buttons: 3px (previously 4px)
- Position offset: `rect.right - 90 - 8`, `rect.top + 8`
- Tooltip offset: `bottom: calc(100% + 4px)`

**Quick-tool Button (Primary)**
- Background: `linear-gradient(135deg, #4f46e5, #6366f1)`
- Radius: 6px
- Box-shadow: `0 2px 8px rgba(79,70,229,0.30)` on idle
- Box-shadow (hover): `0 3px 12px rgba(79,70,229,0.40)`
- SVG icon: white, 14×14px
- Loading state: spinning animation, opacity 0.7
- Success state: `#22c55e` background

**Checkbox Button (Secondary)**
- Background: `rgba(28,25,23,0.85)` with `1px solid rgba(255,255,255,0.08)` border
- Radius: 6px
- Checked state: `rgba(79,70,229,0.15)` background with `rgba(79,70,229,0.35)` border
- Checked icon: `#818cf8` accent tint
- Box-shadow: none (flat, refined)

**Menu Button (Secondary)**
- Identical to checkbox button appearance
- Active (menu open): `rgba(79,70,229,0.12)` background

**Dropdown Menu**
- Background: `#1c1917` with `1px solid rgba(255,255,255,0.06)`
- Radius: 8px (previously 10px)
- Padding: 3px
- Item padding: 8px 10px
- Item border-radius: 5px (inner rounded)
- Item hover: `rgba(255,255,255,0.06)` background
- Divider: `1px solid rgba(255,255,255,0.04)` with 6px margin
- "All tools" link: `#818cf8` text color
- Font size: 12px for items
- Box-shadow: `0 8px 24px rgba(0,0,0,0.40)`

**Transition**
- Show/hide: opacity + transform scale, 150ms ease
- Button hover: transform scale(1.08), 120ms

### Popup (`entrypoints/popup/App.vue`)

**Layout**
- Width: 380px (unchanged)
- Background: `var(--bg-base)` → `#0f0e0c`
- Cards use `var(--bg-card)` → `#1c1917` with `var(--border-default)` border

**Header**
- Border-bottom: `var(--border-default)`
- Brand icon: 32×32px, `--accent` background, 8px radius, no gradient
- Brand name: 14px Bold → 15px Bold (our new Brand scale)
- Tagline: 11px → `var(--text-muted)`

**Action Buttons (the three main CTAs)**
- Background: `var(--bg-card)` 
- Border: `var(--border-default)`
- Radius: 8px
- Hover: `var(--bg-elevated)` background, `var(--border-strong)` border
- Icon container: 32×32px, `--accent-subtle` bg, 6px radius
- Icon: `--accent-light` color
- Arrow icon: `var(--text-muted)`

**Image Grid (preview area)**
- Grid: 5 columns, 4px gap (unchanged)
- Thumbnail: 4px radius (previously rounded-md)
- Selected state: `--accent` border 2px, with check overlay
- "Send selected" button: `--accent` background, 6px radius

**Status Indicator**
- Active dot: `--success` color with subtle shadow
- Inactive dot: `var(--text-muted)`

**Privacy footer**
- Border-top: `var(--border-default)`
- Text: `var(--text-muted)`, 10px
- Link hover: `var(--text-accent)`

### Sidebar (`entrypoints/sidepanel/SidebarApp.vue`)

**Layout**
- Full viewport height
- Background: `var(--bg-base)`

**Header**
- Same pattern as Popup header
- Min-height consistent

**Empty State**
- Icon: 48×48px rounded container, `rgba(255,255,255,0.03)` bg, 8px radius
- Title: `var(--text-secondary)`
- Description: `var(--text-muted)`

**Image Grid (3-column)**
- Gap: 6px
- Item: aspect-ratio 1, 6px radius, `rgba(255,255,255,0.04)` bg
- Image hover: scale(1.04) transition, 200ms ease
- Remove button: 20×20px, black 65%, opacity 0 → 1 on hover

**Action Area (bottom)**
- Border-top: `var(--border-default)`
- Tool quick buttons: 11px, `rgba(255,255,255,0.04)` bg, 6px radius
- Tool active: `rgba(79,70,229,0.12)` bg + `rgba(79,70,229,0.30)` border
- Primary send button: `--accent` bg, 6px radius, hover `#4f46e5`

### EXIF Panel (Shadow DOM, in `content.ts`)

**Panel**
- Position: fixed, bottom 24px, right 24px
- Width: 320px
- Background: `#1c1917` (dark bg-card)
- Border: `1px solid rgba(255,255,255,0.06)`
- Radius: 8px (previously 12px)
- Padding: 14px (previously 16px)
- Box-shadow: `0 12px 32px rgba(0,0,0,0.50)`

**Header**
- Title: 13px Semibold, `var(--text-primary)`
- Close button: `var(--text-muted)`, hover `var(--text-secondary)`

**Risk Badge**
- Background: riskColor with 0.10 opacity
- Border: riskColor with 0.20 opacity
- Radius: 4px (previously 99px / pill)
- Text: riskColor
- Font: 10px Semibold

**Summary Text**
- Background: `rgba(255,255,255,0.03)`
- Border-left: 3px riskColor
- Radius: 0 6px 6px 0
- Font: 12px

**GPS Coordinates**
- Font: system font, monospace fallback
- Background: `rgba(239,68,68,0.06)`
- Radius: 4px

**CTA Button**
- Background: `#4f46e5`, hover `#6366f1`
- Radius: 6px
- Font: 13px Semibold
- Box-shadow: none (flat)
- Disabled: `#292524`, `var(--text-muted)`

**Animation**
- SlideIn: opacity + translateY(8px), 200ms ease
- Auto-dismiss: fade out after 8s (same as current)

## Animation System

### Timing
- Micro-interactions (hover, focus): 120ms
- Show/hide (panel, dropdown): 150ms
- Layout transitions (list change): 200ms
- enter/leave transitions: 200ms ease

### Easing
- Default: `cubic-bezier(0.25, 0.1, 0.25, 1)` (standard)
- Entrance: `cubic-bezier(0.16, 1, 0.3, 1)` (overshoot slightly)
- Exit: `cubic-bezier(0.4, 0, 1, 1)` (snap out)

### Transform Pattern
- Hover lift: `translateY(-1px)` (cards, buttons)
- Press: `scale(0.97)` (buttons)
- Panel in: `translateY(8px)` → `translateY(0)` + opacity 0→1
- Panel out: `opacity 0` + `translateY(4px)`

## Priority & Effort

| Priority | Component | Effort | Impact |
|----------|-----------|--------|--------|
| P0 | OverlayButton CSS tokens | ~30 min | High — most visible component |
| P0 | Popup App.vue styles | ~45 min | High — first impression |
| P1 | Sidebar SidebarApp.vue styles | ~30 min | Medium |
| P1 | EXIF Panel in content.ts | ~20 min | Medium |
| P2 | OverlayButton dropdown | ~15 min | Low — less frequently seen |
| P2 | Animation polish | ~20 min | Medium — subtle but impactful |

Total estimated effort: ~2.5 hours for full redesign.

## Implementation Strategy

1. Define CSS custom properties (design tokens) as a shared foundation
2. Update OverlayButton (highest visibility) first
3. Update Popup (entry point) second  
4. Update Sidebar and EXIF Panel in parallel
5. Add animation polish last

No changes to component logic or message flows — strictly visual refactoring.
