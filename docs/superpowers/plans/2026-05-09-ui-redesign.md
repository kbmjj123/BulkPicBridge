# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the new design system (靛蓝+暖灰, 4/6/8 radius, system fonts) to all four UI surfaces: OverlayButton, Popup, Sidebar, EXIF Panel.

**Architecture:** Pure CSS/token replacement across 4 files. No logic changes. Each file is independent — can be worked on in any order. Color tokens are inlined per spec, no CSS custom properties needed since components use Shadow DOM or scoped styles.

**Tech Stack:** CSS-in-TS (template literal in Shadow DOM), Tailwind utility classes (Popup/Vue), raw CSS (Sidebar/Vue, Popup style block)

---

### Task 1: OverlayButton — CSS tokens & dimensions

**Files:**
- Modify: `components/Overlaybuttonv2.ts:26-224`

- [ ] **Step 1: Update `.btn-group` gap**

```
gap: 4px → gap: 3px
transition: opacity 0.18s ease → transition: opacity 0.15s ease, transform 0.15s ease
```

- [ ] **Step 2: Update `.btn` base dimensions and radius**

```diff
 .btn {
-    width: 30px;
-    height: 30px;
-    border-radius: 7px;
+    width: 28px;
+    height: 28px;
+    border-radius: 6px;
```

- [ ] **Step 3: Update `.btn` hover/active transforms**

```diff
-.btn:hover { transform: scale(1.1); }
+.btn:hover { transform: scale(1.08); }
 .btn:active { transform: scale(0.95); }
```

- [ ] **Step 4: Update `.btn-quick` (primary button)**

```diff
 .btn-quick {
-    background: rgba(99, 102, 241, 0.92);
-    box-shadow: 0 2px 8px rgba(99,102,241,0.45);
+    background: linear-gradient(135deg, #4f46e5, #6366f1);
+    box-shadow: 0 2px 8px rgba(79,70,229,0.30);
  }
  .btn-quick:hover {
-    background: rgba(79, 82, 221, 1);
+    box-shadow: 0 3px 12px rgba(79,70,229,0.40);
  }
```

- [ ] **Step 5: Update `.btn-check` (secondary/checkbox button)**

```diff
 .btn-check {
-    background: rgba(30, 30, 40, 0.75);
-    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
+    background: rgba(28, 25, 23, 0.85);
+    border: 1px solid rgba(255,255,255,0.08);
  }
  .btn-check:hover {
-    background: rgba(50, 50, 65, 0.92);
+    background: rgba(28, 25, 23, 0.95);
  }
  .btn-check.checked {
-    background: rgba(34, 197, 94, 0.88);
-    box-shadow: 0 2px 8px rgba(34,197,94,0.4);
+    background: rgba(79, 70, 229, 0.12);
+    border-color: rgba(79, 70, 229, 0.30);
  }
```

- [ ] **Step 6: Update `.btn-menu` to match secondary style**

```diff
 .btn-menu {
-    background: rgba(30, 30, 40, 0.75);
-    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
+    background: rgba(28, 25, 23, 0.85);
+    border: 1px solid rgba(255,255,255,0.08);
  }
  .btn-menu:hover {
-    background: rgba(50, 50, 65, 0.92);
+    background: rgba(28, 25, 23, 0.95);
  }
  .btn-menu.active {
-    background: rgba(99, 102, 241, 0.92);
+    background: rgba(79, 70, 229, 0.12);
+    border-color: rgba(79, 70, 229, 0.30);
  }
```

- [ ] **Step 7: Update `.tooltip` offset**

```diff
 .tooltip {
-    bottom: calc(100% + 6px);
+    bottom: calc(100% + 4px);
```

- [ ] **Step 8: Update `.dropdown` panel**

```diff
 .dropdown {
-    background: #1a1a2e;
-    border: 1px solid rgba(255,255,255,0.12);
-    border-radius: 10px;
+    background: #1c1917;
+    border: 1px solid rgba(255,255,255,0.06);
+    border-radius: 8px;
-    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
+    box-shadow: 0 8px 24px rgba(0,0,0,0.40);
```

- [ ] **Step 9: Update `.menu-item`**

```diff
 .menu-item {
-    border-radius: 6px;
+    border-radius: 5px;
-    color: #e2e8f0;
+    color: #f5f5f4;
 }
 .menu-item:hover {
-    background: rgba(255,255,255,0.08);
+    background: rgba(255,255,255,0.06);
 }
 .menu-item:active {
-    background: rgba(255,255,255,0.12);
+    background: rgba(255,255,255,0.08);
 }
```

- [ ] **Step 10: Remove unused `.img-selected-overlay` class** (optional — this CSS block has no matching usage in the template)

- [ ] **Step 11: Update position calculation in `positionButtons()`**

```diff
   const rect = target.getBoundingClientRect();
-  // 三个按钮 30px × 3 + gap 4px × 2 = 98px，右对齐留 8px
-  const x = rect.right - 98 - 8;
+  // 三个按钮 28px × 3 + gap 3px × 2 = 90px，右对齐留 8px
+  const x = rect.right - 90 - 8;
```

---

### Task 2: Popup — Template Tailwind classes

**Files:**
- Modify: `entrypoints/popup/App.vue:1-147`

Replace all sky-* accent colors with indigo, slate with warm gray, remove dark: variants (dark-mode only).

- [ ] **Step 1: Update root wrapper**

```diff
   <div 
     class="w-[380px] min-h-[200px] 
-           bg-slate-50 text-slate-900 
-           dark:bg-slate-900 dark:text-slate-100 
+           bg-[#0f0e0c] text-[#f5f5f4] 
            transition-colors"
   >
```

- [ ] **Step 2: Update header brand area**

```diff
- <header class="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800/60">
+ <header class="flex items-center justify-between px-4 py-3.5 border-b border-[rgba(255,255,255,0.06)]">
```

```diff
- <div class="w-9 h-9 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
+ <div class="w-8 h-8 bg-[#4f46e5] rounded-[6px] flex items-center justify-center text-white flex-shrink-0">
```

- [ ] **Step 3: Update tagline text color**

```diff
- <div class="text-xs text-slate-500 dark:text-slate-400 leading-tight">
+ <div class="text-xs text-[#78716c] leading-tight">
```

- [ ] **Step 4: Update "Open Website" link**

```diff
- <a ... class="text-xs text-sky-500 dark:text-sky-400 px-2 py-1 rounded-md border border-sky-500/30 dark:border-sky-400/30 hover:bg-sky-500/10 transition-all">
+ <a ... class="text-xs text-[#818cf8] px-2 py-1 rounded-[6px] border border-[rgba(79,70,229,0.25)] hover:bg-[rgba(79,70,229,0.10)] transition-all">
```

- [ ] **Step 5: Update status bar**

```diff
- <div class="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800/40">
+ <div class="flex items-center gap-1.5 px-4 py-2 bg-[#1c1917] border-b border-[rgba(255,255,255,0.06)]">
```

```diff
- <span class="text-xs text-slate-600 dark:text-slate-400">
+ <span class="text-xs text-[#a8a29e]">
```

- [ ] **Step 6: Update action buttons**

```diff
- <button class="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/30 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-800/50 ...">
+ <button class="flex items-center gap-3 p-3 bg-[#1c1917] border border-[rgba(255,255,255,0.06)] rounded-[8px] hover:bg-[#292524] hover:border-[rgba(255,255,255,0.10)] ...">
```

- [ ] **Step 7: Update action button icon containers**

Button 1 (extract — sky theme):
```diff
- <div class="w-9 h-9 bg-sky-400/20 rounded-lg flex items-center justify-center text-sky-500 dark:text-sky-400">
+ <div class="w-8 h-8 bg-[rgba(79,70,229,0.12)] rounded-[6px] flex items-center justify-center text-[#6366f1]">
```

Button 2 (crop — teal theme):
```diff
- <div class="w-9 h-9 bg-teal-400/20 rounded-lg flex items-center justify-center text-teal-500 dark:text-teal-400">
+ <div class="w-8 h-8 bg-[rgba(79,70,229,0.12)] rounded-[6px] flex items-center justify-center text-[#6366f1]">
```

Button 3 (watermark — purple theme):
```diff
- <div class="w-9 h-9 bg-purple-400/20 rounded-lg flex items-center justify-center text-purple-500 dark:text-purple-400">
+ <div class="w-8 h-8 bg-[rgba(79,70,229,0.12)] rounded-[6px] flex items-center justify-center text-[#6366f1]">
```

- [ ] **Step 8: Update action button text colors**

```diff
- <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
+ <div class="text-xs text-[#a8a29e] mt-0.5 leading-tight">
```

```diff
- <div class="text-slate-500 dark:text-slate-600 flex-shrink-0">
+ <div class="text-[#78716c] flex-shrink-0">
```

- [ ] **Step 9: Update image preview list header**

```diff
- <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 mb-2">
+ <div class="flex items-center justify-between text-xs text-[#a8a29e] pt-1 mb-2">
```

```diff
- <button class="text-xs text-sky-500 dark:text-sky-400 bg-none border-none cursor-pointer p-0">
+ <button class="text-xs text-[#818cf8] bg-none border-none cursor-pointer p-0">
```

- [ ] **Step 10: Update image grid item selected state**

```diff
- class="aspect-square rounded-md overflow-hidden cursor-pointer relative border-2 border-transparent transition-colors"
- :class="selectedImages.has(i) ? 'border-sky-500 dark:border-sky-400' : ''"
+ class="aspect-square rounded-[4px] overflow-hidden cursor-pointer relative border-2 border-transparent transition-colors"
+ :class="selectedImages.has(i) ? 'border-[#4f46e5]' : ''"
```

```diff
- <div class="absolute inset-0 bg-sky-500/50 dark:bg-sky-400/50 flex items-center justify-center text-white text-lg opacity-0 transition-opacity"
+ <div class="absolute inset-0 bg-[#4f46e5]/60 flex items-center justify-center text-white text-lg opacity-0 transition-opacity"
```

```diff
- <div v-if="extractedImages.length > 9" class="aspect-square rounded-md bg-slate-200 dark:bg-slate-800/30 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
+ <div v-if="extractedImages.length > 9" class="aspect-square rounded-[4px] bg-[#1c1917] flex items-center justify-center text-xs text-[#78716c]">
```

- [ ] **Step 11: Update "send selected" button**

```diff
- <button class="w-full mt-2 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer"
+ <button class="w-full mt-2 py-2 bg-[#4f46e5] hover:bg-[#6366f1] text-white font-semibold rounded-[6px] text-sm transition-colors cursor-pointer"
```

- [ ] **Step 12: Update privacy footer**

```diff
- <div class="flex items-center gap-1.5 px-4 py-2 text-[10px] text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800/40">
+ <div class="flex items-center gap-1.5 px-4 py-2 text-[10px] text-[#78716c] border-t border-[rgba(255,255,255,0.06)]">
```

```diff
- <svg viewBox="..." class="w-3 h-3 flex-shrink-0 text-slate-400 dark:text-slate-500">
+ <svg viewBox="..." class="w-3 h-3 flex-shrink-0 text-[#78716c]">
```

```diff
- <a href="..." target="_blank" class="hover:text-sky-500 dark:hover:text-sky-400 transition-colors">
+ <a href="..." target="_blank" class="hover:text-[#818cf8] transition-colors">
```

---

### Task 3: Popup — `<style>` block color tokens

**Files:**
- Modify: `entrypoints/popup/App.vue:276-610`

- [ ] **Step 1: Update body styles**

```diff
 body {
-  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
+  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
   width: 380px;
-  background: #0f172a;
-  color: #e2e8f0;
+  background: #0f0e0c;
+  color: #f5f5f4;
```

- [ ] **Step 2: Update `.popup` class**

```diff
 .popup {
   width: 380px;
   min-height: 200px;
-  background: #0f172a;
+  background: #0f0e0c;
```

- [ ] **Step 3: Update `.header` border**

```diff
 .header {
-  padding: 14px 16px 10px;
+  padding: 14px 16px;
-  border-bottom: 1px solid rgba(255,255,255,0.06);
+  border-bottom: 1px solid rgba(255,255,255,0.06);
 }
```

(No change needed for border — matches. Update padding.)

- [ ] **Step 4: Update `.logo-icon`**

```diff
 .logo-icon {
-  width: 36px;
-  height: 36px;
-  background: linear-gradient(135deg, #0ea5e9, #6366f1);
-  border-radius: 8px;
+  width: 32px;
+  height: 32px;
+  background: #4f46e5;
+  border-radius: 6px;
```

- [ ] **Step 5: Update `.brand-name` and `.brand-tagline`**

```diff
 .brand-name {
-  font-size: 14px;
-  color: #f1f5f9;
+  font-size: 15px;
+  color: #f5f5f4;
 }
 .brand-tagline {
   font-size: 11px;
-  color: #64748b;
+  color: #78716c;
```

- [ ] **Step 6: Update `.site-link`**

```diff
 .site-link {
   font-size: 12px;
-  color: #0ea5e9;
-  border-radius: 6px;
-  border: 1px solid rgba(14, 165, 233, 0.3);
+  color: #818cf8;
+  border-radius: 6px;
+  border: 1px solid rgba(79, 70, 229, 0.25);
 }
 .site-link:hover {
-  background: rgba(14, 165, 233, 0.1);
+  background: rgba(79, 70, 229, 0.10);
 }
```

- [ ] **Step 7: Update `.status-bar` and `.status-text`**

```diff
 .status-bar {
-  background: rgba(255,255,255,0.03);
-  border-bottom: 1px solid rgba(255,255,255,0.04);
+  background: #1c1917;
+  border-bottom: 1px solid rgba(255,255,255,0.06);
 }
 .status-text {
   font-size: 12px;
-  color: #94a3b8;
+  color: #a8a29e;
 }
```

- [ ] **Step 8: Update `.action-btn`**

```diff
 .action-btn {
-  background: rgba(255,255,255,0.04);
-  border: 1px solid rgba(255,255,255,0.08);
-  border-radius: 10px;
+  background: #1c1917;
+  border: 1px solid rgba(255,255,255,0.06);
+  border-radius: 8px;
 }
 .action-btn:hover:not(:disabled) {
-  background: rgba(255,255,255,0.08);
-  border-color: rgba(255,255,255,0.15);
+  background: #292524;
+  border-color: rgba(255,255,255,0.10);
+  transform: translateY(-1px);
 }
 .action-btn.primary {
-  background: rgba(14, 165, 233, 0.1);
-  border-color: rgba(14, 165, 233, 0.3);
+  background: rgba(79, 70, 229, 0.10);
+  border-color: rgba(79, 70, 229, 0.25);
 }
 .action-btn.primary:hover:not(:disabled) {
-  background: rgba(14, 165, 233, 0.18);
+  background: rgba(79, 70, 229, 0.18);
 }
```

- [ ] **Step 9: Update `.btn-icon` (all three variants → unified accent)**

```diff
 .btn-icon {
-  width: 36px;
-  height: 36px;
-  border-radius: 8px;
-  background: rgba(14, 165, 233, 0.2);
-  color: #0ea5e9;
+  width: 32px;
+  height: 32px;
+  border-radius: 6px;
+  background: rgba(79, 70, 229, 0.12);
+  color: #6366f1;
 }
 .btn-icon svg { width: 16px; height: 16px; }
 
-/* Delete the .teal and .purple variants — all use accent now */
-.btn-icon.teal { background: rgba(20, 184, 166, 0.2); color: #14b8a6; }
-.btn-icon.purple { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
+.btn-icon.teal,
+.btn-icon.purple {
+  background: rgba(79, 70, 229, 0.12);
+  color: #6366f1;
+}
```

- [ ] **Step 10: Update `.btn-title` and `.btn-desc`**

```diff
 .btn-title {
-  color: #f1f5f9;
+  color: #f5f5f4;
 }
 .btn-desc {
-  color: #64748b;
+  color: #a8a29e;
 }
 .btn-arrow {
-  color: #475569;
+  color: #78716c;
 }
```

- [ ] **Step 11: Update `.spinner`**

```diff
 .spinner {
-  border: 2px solid rgba(14, 165, 233, 0.3);
-  border-top-color: #0ea5e9;
+  border: 2px solid rgba(79, 70, 229, 0.30);
+  border-top-color: #6366f1;
+  border-radius: 50%;
 }
```

- [ ] **Step 12: Update image list colors**

```diff
 .list-header {
-  color: #64748b;
+  color: #a8a29e;
 }
 .send-all-btn {
-  color: #0ea5e9;
+  color: #818cf8;
 }
```

- [ ] **Step 13: Update `.image-thumb`**

```diff
 .image-thumb {
-  border-radius: 6px;
+  border-radius: 4px;
 }
 .image-thumb.selected {
-  border-color: #0ea5e9;
+  border-color: #4f46e5;
 }
 .thumb-check {
-  background: rgba(14, 165, 233, 0.5);
+  background: rgba(79, 70, 229, 0.60);
 }
 .image-more {
-  border-radius: 6px;
-  background: rgba(255,255,255,0.06);
-  color: #64748b;
+  border-radius: 4px;
+  background: #1c1917;
+  color: #78716c;
 }
 .send-selected-btn {
-  background: #0ea5e9;
-  border-radius: 8px;
+  background: #4f46e5;
+  border-radius: 6px;
 }
 .send-selected-btn:hover {
-  background: #0284c7;
+  background: #6366f1;
 }
```

- [ ] **Step 14: Update privacy note**

```diff
 .privacy-note {
-  color: #334155;
-  border-top: 1px solid rgba(255,255,255,0.04);
+  color: #78716c;
+  border-top: 1px solid rgba(255,255,255,0.06);
 }
 .privacy-note svg {
-  color: #475569;
+  color: #78716c;
 }
```

---

### Task 4: Sidebar — CSS style block

**Files:**
- Modify: `entrypoints/sidepanel/SidebarApp.vue:274-509`

- [ ] **Step 1: Update body**

```diff
 body {
-  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
+  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
-  background: #0f172a;
-  color: #e2e8f0;
+  background: #0f0e0c;
+  color: #f5f5f4;
 }
```

- [ ] **Step 2: Update `.header`**

```diff
 .header {
-  border-bottom: 1px solid rgba(255,255,255,0.06);
+  border-bottom: 1px solid rgba(255,255,255,0.06);
 }
 .brand-name {
-  color: #f1f5f9;
+  color: #f5f5f4;
 }
 .brand-count {
-  color: #6366f1;
+  color: #818cf8;
 }
 .btn-clear {
-  color: #64748b;
+  color: #78716c;
 }
 .btn-clear:hover { color: #ef4444; }
```

- [ ] **Step 3: Update empty state**

```diff
 .empty-title {
-  color: #475569;
+  color: #a8a29e;
 }
 .empty-desc {
-  color: #334155;
+  color: #78716c;
 }
```

- [ ] **Step 4: Update image grid**

```diff
 .grid-item {
-  border-radius: 6px;
-  background: rgba(255,255,255,0.06);
+  border-radius: 6px;
+  background: #1c1917;
 }
```

- [ ] **Step 5: Update action area**

```diff
 .action-area {
-  border-top: 1px solid rgba(255,255,255,0.06);
+  border-top: 1px solid rgba(255,255,255,0.06);
 }
```

- [ ] **Step 6: Update tool quick buttons**

```diff
 .tool-btn {
-  border-radius: 6px;
+  border-radius: 6px;
-  border: 1px solid rgba(255,255,255,0.1);
+  border: 1px solid rgba(255,255,255,0.06);
-  background: rgba(255,255,255,0.04);
-  color: #94a3b8;
+  background: rgba(255,255,255,0.03);
+  color: #a8a29e;
 }
 .tool-btn:hover {
-  background: rgba(255,255,255,0.08);
-  color: #e2e8f0;
+  background: rgba(255,255,255,0.06);
+  color: #f5f5f4;
 }
 .tool-btn.active {
-  background: rgba(99,102,241,0.15);
-  border-color: rgba(99,102,241,0.5);
-  color: #818cf8;
+  background: rgba(79,70,229,0.12);
+  border-color: rgba(79,70,229,0.30);
+  color: #a5b4fc;
 }
```

- [ ] **Step 7: Update send button**

```diff
 .btn-send {
-  background: #6366f1;
-  border-radius: 8px;
+  background: #4f46e5;
+  border-radius: 6px;
 }
 .btn-send:hover:not(:disabled) { background: #4f46e5; }
 .btn-send:disabled {
-  background: #334155;
-  color: #64748b;
+  background: #292524;
+  color: #78716c;
 }
```

- [ ] **Step 8: Update "all tools" link**

```diff
 .btn-all-tools {
-  color: #475569;
+  color: #78716c;
 }
 .btn-all-tools:hover { color: #818cf8; }
```

---

### Task 5: EXIF Panel — Shadow DOM styles in content.ts

**Files:**
- Modify: `entrypoints/content.ts:234-278`

- [ ] **Step 1: Update `.panel` base**

```diff
 .panel {
   position: fixed; bottom: 24px; right: 24px; width: 320px;
-  background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);
-  border-radius: 12px; padding: 16px; z-index: 2147483647;
-  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
-  font-size: 13px; color: #e2e8f0;
-  box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: slideIn 0.2s ease;
+  background: #1c1917; border: 1px solid rgba(255,255,255,0.06);
+  border-radius: 8px; padding: 14px; z-index: 2147483647;
+  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
+  font-size: 12px; color: #f5f5f4;
+  box-shadow: 0 12px 32px rgba(0,0,0,0.50); animation: slideIn 0.2s ease;
 }
```

- [ ] **Step 2: Update slideIn keyframe**

```diff
- @keyframes slideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
+ @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
```

- [ ] **Step 3: Update `.badge`**

```diff
 .badge {
-  border-radius: 99px;
+  border-radius: 4px;
-  font-size: 11px;
+  font-size: 10px;
 }
+/* background:${riskColor}22 and border:1px solid ${riskColor}44 stay the same — these use the dynamic risk color */
```

- [ ] **Step 4: Update `.summary`**

```diff
 .summary {
-  font-size: 13px; line-height: 1.5; color: #cbd5e1;
-  padding: 8px 10px; background: rgba(255,255,255,0.05);
-  border-radius: 6px; border-left: 3px solid ${riskColor};
+  font-size: 12px; line-height: 1.5; color: #a8a29e;
+  padding: 8px 10px; background: rgba(255,255,255,0.03);
+  border-radius: 0 6px 6px 0; border-left: 3px solid ${riskColor};
 }
```

- [ ] **Step 5: Update `.risk-item`**

```diff
 .risk-item {
-  font-size: 12px; color: #94a3b8;
-  border-bottom: 1px solid rgba(255,255,255,0.05);
+  font-size: 12px; color: #a8a29e;
+  border-bottom: 1px solid rgba(255,255,255,0.04);
 }
```

- [ ] **Step 6: Update `.gps-coords`**

```diff
 .gps-coords {
-  font-size: 11px; color: #ef4444;
+  font-size: 11px; color: #ef4444;
-  font-family: 'Courier New', monospace;
-  padding: 6px 8px; border-radius: 4px;
+  font-family: ui-monospace, 'SF Mono', 'Courier New', monospace;
+  padding: 6px 8px; border-radius: 4px;
-  background: rgba(239,68,68,0.08);
+  background: rgba(239,68,68,0.06);
 }
```

- [ ] **Step 7: Update `.action-btn`**

```diff
 .action-btn {
-  background: #0ea5e9; color: white;
-  border-radius: 8px; font-size: 13px; font-weight: 600;
+  background: #4f46e5; color: white;
+  border-radius: 6px; font-size: 13px; font-weight: 600;
+  box-shadow: none;
 }
 .action-btn:hover:not(:disabled) {
-  background: #0284c7;
+  background: #6366f1;
 }
 .action-btn:disabled {
-  background: #334155; color: #64748b;
+  background: #292524; color: #78716c;
 }
 .brand {
-  color: #475569;
+  color: #78716c;
 }
 .brand a {
-  color: #0ea5e9;
+  color: #818cf8;
 }
```

---

### Task 6: Build verification & commit

- [ ] **Step 1: Run type check**

```bash
pnpm compile
```
Expected: No errors (all changes are CSS/style tokens only).

- [ ] **Step 2: Run dev build**

```bash
pnpm build
```
Expected: Build succeeds.

- [ ] **Step 3: Commit all changes**

```bash
git add components/Overlaybuttonv2.ts \
        entrypoints/popup/App.vue \
        entrypoints/sidepanel/SidebarApp.vue \
        entrypoints/content.ts
git commit -m "style: apply brand design system

- 靛蓝+暖灰 color palette, system font stack, 4/6/8 radius system
- OverlayButton: 28px unified buttons, gradient primary, minimal secondary
- Popup & Sidebar: warm gray backgrounds, indigo accent
- EXIF Panel: radius/padding/font alignment with design spec

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
