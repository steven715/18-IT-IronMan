---
name: ithome-draft
description: 把 dayN.md 同步到 iThome 鐵人賽草稿頁（標題、內文、圖片上傳），只存草稿、不發表。用法 /ithome-draft <天數> [草稿網址]
version: 1.0.0
---

# ithome-draft

把 `day<N>.md` 推到 iThome 的草稿頁。機械的部分由 `draft.mjs` 做，判斷的部分由你做。

參數：`$ARGUMENTS`。第一個是天數，第二個是草稿網址（該天第一次同步才需要，之後從 `.ithome/articles.json` 讀）。

## 分工

- **作者**：在 iThome 按「鐵人發文」開好草稿、把網址給你、最後自己按「發表文章」。
- **你**：跑驗收、跑腳本、看結果、回報。
- **腳本**：開 Chrome、等登入、上傳圖片、填標題內文、按「儲存草稿」、重新載入驗證、寫紀錄。

**永遠不按「發表文章」。** 腳本裡沒有那顆按鈕的 selector，你也不要用 MCP 或其他方式去按。發佈是作者的動作，跟 CLAUDE.md 第 4 條（作者未消化前不算完稿）是同一個精神。

## 流程

1. **驗收**。讀 `day<N>.md`，逐條對 CLAUDE.md 的「文章驗收規則」和「人機邊界規則」檢查：標題不能只有序號、開頭要是作者自己寫的、實作類要有 2×2 量表和條件限定的結論、結尾要有作者消化段落。有任何一條不過就停下來講原因，不推上去。
2. **先跑 check-only** 看解析結果對不對（標題、字數、有幾張圖要傳）：
   ```
   node .claude/skills/ithome-draft/draft.mjs --day <N> --check-only
   ```
3. **正式跑**（第一次帶 `--url`，之後不用）：
   ```
   node .claude/skills/ithome-draft/draft.mjs --day <N> --url <草稿網址>
   ```
   腳本印出「被導到登入頁」時，請作者到那個 Chrome 視窗登入，腳本會自己等（最多 5 分鐘）。
4. **看結果**。腳本結束時會印驗證結果和預覽截圖路徑。用 Read 開那張截圖看一眼排版：標題層級、圖片、程式碼區塊有沒有正常。
5. **回報**。說清楚：同步了哪一天、幾張圖新上傳、驗證是否通過、截圖看起來如何。最後提醒作者到 iThome 預覽後自己發表。
6. `.ithome/articles.json` 有變動的話，跟文章一起 commit。

## 腳本做了什麼、沒做什麼

- 標題取第一行 `# ` 之後的文字，內文是其餘部分。
- 內文裡的 HTML 註解（例如 `<!-- 本人撰寫，AI 勿動 -->`）會被拿掉，不會出現在 iThome 上。
- 只上傳 `.ithome/articles.json` 裡還沒有紀錄的圖片；每傳一張就寫一次紀錄，中途失敗不會重傳。
- 整篇覆蓋草稿頁上原有的標題和內文。重跑是安全的，結果一樣。
- 不動標籤欄（鐵人發文開的草稿本來就帶「18th鐵人賽」）。
- 已發表的文章這支腳本不支援。實測發表後再開 `/articles/<id>/draft`，iThome 會把你導到文章圖片的網址，腳本偵測到沒停在草稿頁就會停下來報錯。要改已發表的文章，第一次要重新摸 iThome 編輯頁的 DOM，摸完再加分支。

## 出錯時

- **「編輯器結構跟預期不同」**：iThome 改版了。用 Chrome DevTools MCP 或 `curl http://127.0.0.1:9222/json` 加 CDP 現場看 DOM，對照下面的 selector 修腳本。
- **上傳失敗**：看 HTTP 狀態碼。401/419 多半是登入過期或 CSRF token 問題，重新登入再跑。413 是檔案太大（上限 5MB）。
- **CDP 連不上**：port 9222 被別的 Chrome 佔住。`lsof -i :9222` 看是誰，或用 `--port` 換一個。
- 腳本用的 Chrome profile 在 `~/.cache/claude-chrome-profile`，登入狀態會留著。跟作者日常用的 Chrome 是分開的。
- 腳本會優先重用已經開在 ithelp.ithome.com.tw 的分頁，沒有就開新分頁。成功時分頁留著讓作者檢查，失敗時自己開的分頁會關掉。

## iThome 草稿頁的 DOM（2026-09-15 摸的）

- 表單：`#ironmanEditForm`，POST 到 `/articles/<id>/draft`，隱藏欄位 `_token`、`_method=PUT`、`article_type=ironman`。
- 標題：`input[name=subject]`。
- 內文：SimpleMDE，底層 textarea `#SimpleMDE_0`，實際內容在 `.CodeMirror` 元素的 `.CodeMirror` 屬性（CodeMirror 實例）。用 `setValue()` 填，送出前要 `save()` 同步回 textarea。
- 儲存草稿：`button.btn-draft.save-group__btn`（type=submit）。
- 發表文章：`#createSubmitBtn`。**不碰。**
- 刪除草稿：`#deleteForm`。**不碰。**
- 圖片上傳：POST `https://ithelp.ithome.com.tw/api/upload`，multipart 欄位 `images[]`，加 `_token` 和 `X-CSRF-TOKEN` header，回 `{"status":"success","url":"..."}`。
- 預覽：SimpleMDE 工具列的 `a.fa-eye`。

## 版本紀錄

- **1.0.0**（2026-09-16）：第一版。從 Day 1 手動用 CDP 填草稿的過程整理而來。
