# MarkdownView

在 IIS 內網環境中，直接於瀏覽器閱覽 Markdown 文件的輕量檢視工具。  
搭配 IIS 目錄瀏覽功能，點擊常見的 Markdown 副檔名檔案即可自動渲染為 GitHub 風格的 HTML 頁面，無需額外安裝編輯器或桌面應用程式。

---

## 功能特色

- **GitHub 風格渲染** — 使用 [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) 樣式，呈現與 GitHub 一致的閱讀體驗。
- **程式碼語法高亮** — 整合 [highlight.js](https://highlightjs.org/)，自動為程式碼區塊上色。
- **Mermaid 圖表支援** — 內建 [Mermaid](https://mermaid.js.org/) 渲染引擎，支援流程圖、序列圖、甘特圖等多種圖表語法。
- **一鍵複製程式碼** — 程式碼區塊（含行內程式碼）皆附有「複製」按鈕，hover 時顯示。
- **XSS 防護** — 透過 [DOMPurify](https://github.com/cure53/DOMPurify) 過濾所有 HTML 輸出，避免注入攻擊。
- **多副檔名支援** — 支援 `.md`、`.markdown`、`.mdown`、`.mkd`、`.mkdn`、`.mdwn`、`.mdtxt`、`.mdtext`，並以全小寫比對處理大寫副檔名。
- **下載原始檔案** — 工具列提供「下載檔案」按鈕，可直接下載原始 Markdown 檔。
- **RWD 響應式設計** — 桌面與行動裝置皆有良好閱讀版面。
- **完全離線運作** — 所有前端函式庫皆收納於 `libs/` 目錄，無需連外網。

---

## 運作原理

1. IIS 開啟**目錄瀏覽**功能後，使用者可看到資料夾中的所有檔案列表。
2. 透過 **URL Rewrite** 規則，當使用者點擊任何支援的 Markdown 副檔名檔案時，自動重導至 `MarkdownView/index.html?file=<原始路徑>`。
3. 前端 JavaScript 以 `fetch` 取得原始 Markdown 內容（透過 `?raw=1` 查詢參數繞過重寫規則），再經由 [marked](https://github.com/markedjs/marked) 解析為 HTML。
4. HTML 經 DOMPurify 消毒後顯示，並依序執行 Mermaid 圖表渲染、程式碼高亮及複製按鈕掛載。

目前預設支援的副檔名如下：`.md`、`.markdown`、`.mdown`、`.mkd`、`.mkdn`、`.mdwn`、`.mdtxt`、`.mdtext`。

---

## 前置需求

| 項目 | 說明 |
|------|------|
| **IIS** | Windows Server 或 Windows 桌面版本內建的 IIS |
| **URL Rewrite Module** | 必須安裝 — [下載 URL Rewrite Module](https://learn.microsoft.com/zh-tw/iis/extensions/url-rewrite-module/using-the-url-rewrite-module) |
| **目錄瀏覽功能** | IIS 需啟用目錄瀏覽 (Directory Browsing) |

---

## 安裝步驟

### 1. 安裝 URL Rewrite Module

至 Microsoft 官方網站下載並安裝 [URL Rewrite Module](https://learn.microsoft.com/zh-tw/iis/extensions/url-rewrite-module/using-the-url-rewrite-module)，安裝完成後重新啟動 IIS。

### 2. 部署 MarkdownView

將本專案整個資料夾複製到 IIS 網站根目錄下，例如：

```
C:\inetpub\wwwroot\MarkdownView\
├── index.html
├── script.js
├── styles.css
├── mermaid-renderer.js
├── web.config
└── libs\
    ├── dompurify\
    ├── github-markdown-css\
    ├── highlightjs\
    ├── marked\
    └── mermaid\
```

### 3. 設定目標目錄的 web.config

在**需要啟用 Markdown 檢視的目錄**中，新增或編輯 `web.config`，加入以下內容：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <!-- 啟用目錄瀏覽 -->
    <directoryBrowse enabled="true" showFlags="Date, Time, Size, Extension, LongDate" />

    <!-- 註冊常見 Markdown MIME Type -->
    <staticContent>
      <remove fileExtension=".md" />
      <remove fileExtension=".markdown" />
      <remove fileExtension=".mdown" />
      <remove fileExtension=".mkd" />
      <remove fileExtension=".mkdn" />
      <remove fileExtension=".mdwn" />
      <remove fileExtension=".mdtxt" />
      <remove fileExtension=".mdtext" />
      <mimeMap fileExtension=".md" mimeType="text/markdown; charset=utf-8; variant=GFM" />
      <mimeMap fileExtension=".markdown" mimeType="text/markdown; charset=utf-8; variant=GFM" />
      <mimeMap fileExtension=".mdown" mimeType="text/markdown; charset=utf-8; variant=GFM" />
      <mimeMap fileExtension=".mkd" mimeType="text/markdown; charset=utf-8; variant=GFM" />
      <mimeMap fileExtension=".mkdn" mimeType="text/markdown; charset=utf-8; variant=GFM" />
      <mimeMap fileExtension=".mdwn" mimeType="text/markdown; charset=utf-8; variant=GFM" />
      <mimeMap fileExtension=".mdtxt" mimeType="text/markdown; charset=utf-8; variant=GFM" />
      <mimeMap fileExtension=".mdtext" mimeType="text/markdown; charset=utf-8; variant=GFM" />
    </staticContent>

    <!-- URL Rewrite：將支援的 Markdown 請求重導至 MarkdownView -->
    <rewrite>
      <rules>
        <rule name="MarkdownReader" stopProcessing="true">
          <match url=".*" />
          <conditions>
            <!-- 帶有 raw=1 參數時不重寫，允許直接取得原始檔 -->
            <add input="{QUERY_STRING}" pattern="(^|&)raw=1(&|$)" negate="true" />
            <!-- 排除 MarkdownView 自身目錄，避免無限迴圈 -->
            <add input="{ToLower:{URL}}" pattern="markdownview/" negate="true" />
            <!-- 先轉小寫再比對副檔名，支援 .MD 之類的大寫寫法 -->
            <add input="{ToLower:{URL}}" pattern="\.(md|markdown|mdown|mkd|mkdn|mdwn|mdtxt|mdtext)$" />
          </conditions>
          <action type="Redirect" url="/MarkdownView/index.html?file={REQUEST_URI}" appendQueryString="false" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

> **注意**：若 MarkdownView 部署路徑不是 `/MarkdownView/`，請一併修改 `<action>` 中的 URL 與 `<conditions>` 中的排除模式。

### 4. 啟用 IIS 目錄瀏覽

1. 開啟 **IIS 管理員**。
2. 選擇目標網站或目錄。
3. 雙擊「**目錄瀏覽**」。
4. 在右側操作面板點擊「**啟用**」。

---

## 使用方式

部署完成後，直接在瀏覽器中瀏覽 IIS 網站目錄，點擊任何支援的 Markdown 副檔名檔案，即可自動以 MarkdownView 渲染閱覽。

也可手動輸入 URL 存取特定檔案：

```
https://<your-server>/MarkdownView/index.html?file=/path/to/document.markdown
```

---

## 使用的函式庫

| 函式庫 | 版本 | 用途 |
|--------|------|------|
| [marked](https://github.com/markedjs/marked) | 17.0.4 | Markdown 解析為 HTML |
| [DOMPurify](https://github.com/cure53/DOMPurify) | 3.3.3 | HTML 消毒，防止 XSS 攻擊 |
| [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) | 5.9.0 | GitHub 風格 Markdown 樣式 |
| [highlight.js](https://highlightjs.org/) | 11.11.1 | 程式碼語法高亮 |
| [Mermaid](https://mermaid.js.org/) | 11.12.0 | 圖表繪製（流程圖、序列圖等） |

---

## 專案結構

```
MarkdownView/
├── version.json            # 專案版號，供 GitHub Actions 發佈流程讀取
├── index.html              # 主頁面，載入樣式與腳本
├── script.js               # 核心邏輯：讀取 Markdown、驗證副檔名、渲染、高亮、複製按鈕
├── mermaid-renderer.js     # Mermaid 圖表渲染與 Markdown 解析模組
├── styles.css              # 版面樣式與響應式設計
├── web.config.example      # IIS 設定範本（MIME Type + URL Rewrite）
├── LICENSE                 # MIT 授權條款
├── README.md               # 本說明文件
└── libs/                   # 前端函式庫（離線使用）
    ├── dom-to-image/       # DOM 截圖工具
    ├── dompurify/          # XSS 防護
    ├── github-markdown-css/# GitHub 風格樣式
    ├── highlightjs/        # 語法高亮
    ├── marked/             # Markdown 解析器
    └── mermaid/            # 圖表引擎
```

---

## 版本與發佈

- 專案版號儲存在 `version.json`。
- 版號不會顯示在頁面上，只供 GitHub Actions 發佈流程使用。
- 推送到 `main` 或手動執行 workflow 時：
  - 若 `version.json` 的版號尚未有對應 Git tag，會建立正式 release，例如 `v0.0.1`。
  - 若版號未變動且 tag 已存在，會更新 `latest-test` 預發佈版本，方便驗證最新內容。
- workflow 位置：`.github/workflows/release.yml`

若要發佈新正式版，只需修改 `version.json` 內的 `version` 值後推送即可。

---

## 授權

本專案採用 [MIT License](LICENSE) 授權。  
