# PM System — Claude Code 開發規範

## 專案概覽

**PM System** 是一個針對台灣中小企業 PM 設計的跨平台桌面應用程式。
- 框架：Tauri 2.0 + React 18 + TypeScript
- 目標平台：macOS 12+ (Apple Silicon + Intel) / Windows 10/11
- 資料庫：SQLite（本地）
- 整合：n8n HTTP webhook 雙向溝通

---

## 技術棧

### 前端
| 用途 | 套件 |
|------|------|
| UI 框架 | React 18 + TypeScript (strict) |
| 建構工具 | Vite |
| 樣式 | Tailwind CSS + shadcn/ui |
| 圖表 | Recharts |
| 資料同步 | TanStack Query |
| 狀態管理 | Zustand |
| 路由 | React Router v6 |
| 表單驗證 | React Hook Form + Zod |
| 圖示 | Lucide React |
| 日期 | date-fns |

### 後端（Rust / Tauri）
| 用途 | crate |
|------|-------|
| 桌面框架 | tauri 2.0 |
| 資料庫 | rusqlite + r2d2（連線池）|
| HTTP client | reqwest |
| HTTP server | axum（webhook 接收）|
| 非同步 | tokio |
| 序列化 | serde + serde_json |
| 錯誤處理 | thiserror |

---

## 資料夾結構

```
pm-system-app/
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── ui/           # shadcn/ui 原始元件（不要手動修改）
│   │   ├── layout/       # Sidebar、Topbar、StatusBar
│   │   ├── dashboard/    # KPI 卡片、圖表
│   │   ├── tasks/        # 任務相關元件
│   │   ├── emails/       # 信件元件
│   │   ├── calendar/     # 行事曆
│   │   ├── reports/      # 報表
│   │   └── shared/       # 跨模組共用元件
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Tasks.tsx
│   │   ├── Emails.tsx
│   │   ├── Calendar.tsx
│   │   ├── Reports.tsx
│   │   ├── Documents.tsx
│   │   └── Settings.tsx
│   ├── hooks/            # useXxx 命名
│   ├── lib/              # 工具函式、API wrapper
│   ├── stores/           # Zustand stores
│   ├── types/            # 全域 TypeScript 型別
│   └── styles/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── icons/
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── db/           # 資料庫模組（migration、各表 CRUD）
│       ├── commands/     # Tauri commands（#[tauri::command]）
│       ├── n8n/          # webhook server + client
│       ├── tray.rs
│       └── notifications.rs
└── tests/
```

---

## 命名規範

| 對象 | 規則 | 範例 |
|------|------|------|
| React 元件 | PascalCase | `TaskCard`, `KpiWidget` |
| React hooks | `useXxx` | `useTasks`, `useEmailSync` |
| 工具函式 | camelCase | `formatDate`, `calcProgress` |
| Zustand store | camelCase + `Store` | `taskStore`, `emailStore` |
| Rust 函式 | snake_case | `get_tasks`, `create_task` |
| Rust 結構體 | PascalCase | `TaskRow`, `ProjectRecord` |
| TypeScript 型別/介面 | PascalCase | `Task`, `Project`, `Email` |
| 資料庫欄位 | snake_case | `due_date`, `created_at` |

**程式碼識別字一律用英文**，繁中只用於註解（`// 僅在必要時寫`）。

---

## 重要規範

### TypeScript
- `tsconfig.json` 開啟 strict mode
- 禁止使用 `any`；如確實需要用 `unknown` + type guard
- 所有 Tauri command 呼叫都要有對應 Zod schema 驗證回傳值
- 元件 props 用 interface 定義，不用 type alias（除非 union）

### Rust
- `cargo clippy -- -D warnings` 必須通過
- 所有錯誤型別用 `thiserror` 定義，不要直接 `.unwrap()`（測試除外）
- 資料庫操作統一在 `db/` 模組，commands 只做參數解析與呼叫
- Tauri command 回傳 `Result<T, String>`，錯誤訊息要有意義

### 元件設計
- 頁面層（`pages/`）只負責組合元件、呼叫 hooks
- 業務邏輯放在 hooks，展示邏輯放在元件
- 不預先設計「以後可能用到」的抽象

### 樣式
- 優先用 Tailwind utility class
- 複雜的動態樣式用 `clsx` / `cn` helper
- 深色主題為預設，顏色 token 定義在 `tailwind.config.ts`

---

## 配色系統

```css
/* 定義在 tailwind.config.ts extend.colors */
background: #0A0E1A
card-bg:    rgba(255,255,255,0.04)
border:     rgba(255,255,255,0.08)
primary:    #3B82F6   /* 藍 */
success:    #10B981   /* 綠 */
warning:    #F59E0B   /* 黃 */
danger:     #EF4444   /* 紅 */
purple:     #8B5CF6
text-primary:   #FFFFFF
text-secondary: rgba(255,255,255,0.6)
text-muted:     rgba(255,255,255,0.4)
```

字型：Inter（英數）、Noto Sans TC（中文）、JetBrains Mono（等寬）

---

## 常用指令

```bash
# 開發模式（前後端熱重載）
npm run tauri dev

# 只跑前端（不啟動 Tauri）
npm run dev

# 型別檢查
npx tsc --noEmit

# Rust 靜態分析
cd src-tauri && cargo clippy -- -D warnings

# 建置 — macOS universal
npm run tauri build -- --target universal-apple-darwin

# 建置 — Windows x64
npm run tauri build -- --target x86_64-pc-windows-msvc

# 產生各尺寸圖示（準備好 1024x1024 PNG）
npm run tauri icon src-tauri/icons/icon-source.png
```

---

## 已實作功能清單

### 核心模組
| 模組 | 說明 |
|------|------|
| Dashboard | KPI 卡片 + 任務狀態圓餅圖 + 專案進度橫條圖 + 任務趨勢折線圖 |
| 任務管理 | 列表 / Kanban 兩種視圖，依專案篩選，CRUD，負責人員工下拉選單 |
| 信件 | Gmail 信件列表（含未讀計數）、標記已讀、AI 擬稿回覆（Gemini/OpenAI/Claude） |
| 行事曆 | 月曆視圖，顯示任務到期日與里程碑 |
| 文件庫 | Markdown 文件 CRUD + 預覽；客戶窗口管理；通訊錄（員工）管理 |
| 報表 | 週報自動生成、資料匯出 JSON |
| 設定 | n8n 整合、AI 金鑰、主題切換、語系 |

### 文件庫 — 通訊錄（db: `employees`）
- 欄位：姓名、Email、分機、部門
- 支援 CSV 批次匯入（欄位：`name/姓名`、`email/信箱`、`extension/分機`、`department/部門`）
- 任務指派的「負責人」下拉選單從通訊錄載入

### 文件庫 — 客戶窗口（db: `contacts`）
- 欄位：姓名、Email、電話、公司名稱、公司地址、關聯專案、備註

### 任務指派 Email 通知（n8n 串接）
- 指派任務後，app 呼叫 `notify_task_assigned` command
- 若設定頁填有「任務指派通知 Webhook URL」，則 POST payload 到 n8n
- Payload 欄位：`event`, `task_id`, `task_title`, `assignee`, `assignee_email`, `project_name`, `due_date`
- n8n 收到後以 Gmail 節點發信給 `assignee_email`
- 若 URL 為空，靜默跳過（不報錯）

---

## n8n Webhook 設定指引

### App 內建 Webhook Server（n8n → App）
- 監聽位址：`0.0.0.0:54321`（可在設定頁修改；Docker 環境使用 `host.docker.internal`）
- 驗證：HMAC-SHA256，secret 在設定頁設定

### 接收端點清單
| 端點 | 功能 |
|------|------|
| `POST /webhook/email-received` | n8n 推送新信件 |
| `POST /webhook/calendar-event` | 行事曆事件同步 |
| `POST /webhook/meeting-transcript` | 會議逐字稿 |
| `POST /webhook/weekly-report` | 週報觸發 |

### 發送端端點（App → n8n）
| 設定欄位 | 用途 |
|----------|------|
| `n8n_webhook_url` | 通用 outbound trigger（測試連線用）|
| `task_assign_webhook_url` | 任務指派時通知對方的 Gmail 流程 |

### Gmail 信件接收 — n8n 設定步驟
1. 在 PM System 設定頁確認本機 webhook port（預設 54321）
2. n8n 建立流程：Gmail Trigger → Code（欄位正規化）→ HTTP Request
3. HTTP Request URL：`http://host.docker.internal:54321/webhook/email-received`
4. Header 加 `X-Webhook-Secret: <你的 secret>`
5. Gmail Trigger 輸出欄位為大寫（`Subject`/`From`），Code 節點需做正規化

### Gmail 信件接收 — n8n Code 節點（欄位正規化）
```javascript
const item = $input.item.json;
return {
  gmail_id:    item.id ?? item.threadId ?? "",
  subject:     item.Subject ?? item.subject ?? "(無主旨)",
  sender:      item.From    ?? item.from    ?? "未知寄件者",
  body:        item.Text    ?? item.text    ?? item.Body ?? item.body ?? "",
  received_at: item.Date    ?? item.date    ?? new Date().toISOString(),
};
```

---

## 已知陷阱與避坑指南

### Tauri 2.0 相關
- `invoke` 呼叫的 command 名稱是 snake_case 轉 camelCase（Rust `get_tasks` → JS `getTasks`）
- Tauri 2.0 的 capability 系統必須在 `tauri.conf.json` 宣告前端可用的 API
- `@tauri-apps/api` v2 的 import 路徑與 v1 不同（`@tauri-apps/api/core` 等）
- 系統托盤需要 `tauri-plugin-shell` 或 `tray-icon` feature flag

### Rust 相關
- `rusqlite` 在多執行緒環境需要用 `r2d2-sqlite` 做連線池
- `Mutex<Connection>` 會造成死鎖，改用 `Pool`
- Tauri state 必須實作 `Send + Sync`

### Windows 特定
- 路徑分隔符號用 `std::path::PathBuf`，絕對不要硬寫 `\\`
- WebView2 版本過舊可能造成 CSS 渲染差異

### macOS 特定
- `Info.plist` 需要加 `NSUserNotificationsUsageDescription`
- Notarization 需要 Apple Developer 帳號，內部測試可先跳過

### 套件版本衝突
- shadcn/ui 元件用 `npx shadcn@latest add <component>` 安裝，不要手動複製
- Tailwind CSS 4.x 與部分 shadcn 元件不相容，使用 3.x

---

## SQLite 資料庫位置

| 平台 | 路徑 |
|------|------|
| macOS | `~/Library/Application Support/com.pmsystem.app/data.db` |
| Windows | `%APPDATA%\com.pmsystem.app\data.db` |

Migration 統一用遞增編號命名：`001_init.sql`、`002_add_index.sql`...

---

## Git 規範

Commit 訊息用 Conventional Commits：
```
feat: 新增任務 Kanban 視圖
fix: 修正信件同步時 client_id 為 null
refactor: 重構 db/tasks.rs 錯誤處理
docs: 更新 n8n 設定說明
```

`.gitignore` 必須包含：`node_modules/`, `src-tauri/target/`, `.env`, `*.db`

---

## 開發優先順序

- **Phase 1（MVP）**：scaffold + DB schema + Dashboard + 任務管理 + Settings + 系統托盤 + 建置出安裝檔
- **Phase 2（整合）**：客戶/信件模組 + n8n webhook + 通知 + 行事曆
- **Phase 3（強化）**：週報生成 + 文件知識庫 + 自動更新 + 主題切換
- **Phase 4（Polish）**：測試 + 效能 + i18n + 簽署

**每完成一個 Phase 的子任務即 commit 一次。**
