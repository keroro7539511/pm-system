# PM System

台灣 PM 專用跨平台桌面工具。Tauri 2.0 + React + TypeScript + SQLite。

## 需求

| 工具 | 版本 |
|------|------|
| Node.js | 20+ |
| Rust | 1.77+ |
| Tauri CLI | 隨 `npm install` 一起安裝 |

**macOS**：無額外相依。  
**Windows**：需安裝 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + WebView2（Win10/11 已內建）。

## 安裝

```bash
npm install
```

## 開發

```bash
npm run tauri dev
```

熱重載開啟，前端改動即時更新，Rust 改動需重新編譯（約 10–30 秒）。

## 產生圖示

準備好 1024×1024 PNG 後執行：

```bash
npm run tauri icon src-tauri/icons/icon.png
```

這會自動產生所有尺寸（.icns / .ico / PNG）。

## 建置

```bash
# macOS (Intel + Apple Silicon Universal)
npm run tauri build -- --target universal-apple-darwin

# macOS (僅目前架構)
npm run tauri build

# Windows x64（需在 Windows 上執行）
npm run tauri build -- --target x86_64-pc-windows-msvc
```

產出位置：
- macOS：`src-tauri/target/release/bundle/dmg/PM System_x.x.x_aarch64.dmg`
- Windows：`src-tauri/target/release/bundle/msi/PM System_x.x.x_x64_en-US.msi`

## 型別檢查

```bash
npx tsc --noEmit
```

## Rust 靜態分析

```bash
cargo clippy -- -D warnings
```

## 架構

```
src/              React 前端
  components/     UI 元件（ui/ shadcn-style, layout/, dashboard/, tasks/）
  pages/          路由頁面
  hooks/          React Query hooks
  stores/         Zustand 狀態
  i18n/           中英雙語翻譯
  lib/            Tauri invoke wrapper, 工具函式
  types/          TypeScript 型別

src-tauri/        Rust 後端
  src/db/         SQLite (rusqlite + r2d2) CRUD
  src/commands/   Tauri commands（前端可呼叫）
  src/n8n/        Webhook client
  src/tray.rs     系統托盤

sql/              SQLite migration 腳本
```

## 資料儲存路徑

| 平台 | 路徑 |
|------|------|
| macOS | `~/Library/Application Support/com.pmsystem.app/data.db` |
| Windows | `%APPDATA%\com.pmsystem.app\data.db` |

## n8n 整合

1. 在設定頁輸入 n8n Webhook URL
2. 點「測試連線」確認 n8n 可以連到
3. Phase 2 會加入本機 Webhook Server（接收 n8n 推送）

## Phase 狀態

| Phase | 狀態 | 內容 |
|-------|------|------|
| 1 – MVP | ✅ 完成 | Scaffold, DB, Dashboard, 任務管理, 設定, 系統托盤 |
| 2 – 整合 | 規劃中 | 客戶/信件, n8n webhook server, 行事曆 |
| 3 – 強化 | 規劃中 | 週報, 文件庫, 自動更新 |
| 4 – Polish | 規劃中 | 測試, 效能, 簽署 |

## 簽署注意事項

- **macOS**：正式發佈需 Apple Developer 帳號（$99/年）notarize。開發測試無需簽署。
- **Windows**：可用 EV code signing 憑證，開發期間跳過即可。

## 技術棧

- **前端**：React 18 + TypeScript (strict) + Vite + Tailwind CSS + shadcn/ui
- **後端**：Tauri 2.0 (Rust) + rusqlite (bundled SQLite) + r2d2 連線池
- **狀態**：Zustand + TanStack Query v5
- **i18n**：i18next (繁中 / English)
- **拖拉**：@dnd-kit/core
