# AI 時代的軟體開發——透過個人專案 vaultflix 探討人與 AI 的協作

第 18 屆 iThome 鐵人賽參賽文章。

## 題目簡介

<!-- 簡介 -->

## 30 天規劃總表

> 下表標題為**規劃用佔位標題**，實際發文時依 [CLAUDE.md](CLAUDE.md) 的驗收規則改寫為「含問題或結論／數字」的正式標題。
> 天數與主題的最終對應以各篇文章內容為準。

| Day | 主題 | 協作框架 | 檔案 |
| --- | --- | --- | --- |
| 1 | 背景與動機，簡介 vaultflix | — | [day1.md](day1.md) |
| 2 | vaultflix 整體功能與架構 | — | [day2.md](day2.md) |
| 3 | 我的 AI 開發框架 | superpowers | [day3.md](day3.md) |
| 4 | vaultflix 後端 | — | [day4.md](day4.md) |
| 5 | vaultflix 資料庫（含 MinIO） | — | [day5.md](day5.md) |
| 6 | vaultflix 前端 | — | [day6.md](day6.md) |
| 7 | vaultflix 測試框架 | — | [day7.md](day7.md) |
| 8 | vaultflix CI/CD | — | [day8.md](day8.md) |
| 9 | 前九天彙整：AI 專案上的個人經驗與架構 | — | [day9.md](day9.md) |
| 10 | 迭代開場：ROADMAP、backlog 優先序與讀者互動機制 | — | [day10.md](day10.md) |
| 11 | 方法論：2×2 分類、量表、校準任務 spec、驗收標準預註冊 | — | [day11.md](day11.md) |
| 12 | 校準任務 #1：播放遙測 endpoint | superpowers | [day12.md](day12.md) |
| 13 | LLM Chat 助手（一）：資料面設計 | superpowers | [day13.md](day13.md) |
| 14 | LLM Chat 助手（二）：/api/chat 與語意搜尋 | superpowers | [day14.md](day14.md) |
| 15 | LLM Chat 助手（三）：前端與驗收復盤 | superpowers | [day15.md](day15.md) |
| 16 | 校準任務 #2：同 spec 重做 | agent-skills | [day16.md](day16.md) |
| 17 | 以圖搜人（一）：選型 | agent-skills | [day17.md](day17.md) |
| 18 | 以圖搜人（二）：抽幀 pipeline | agent-skills | [day18.md](day18.md) |
| 19 | 以圖搜人（三）：獨立 worker 服務化 | agent-skills | [day19.md](day19.md) |
| 20 | 以圖搜人（四）：搜尋 API 與前端 | agent-skills | [day20.md](day20.md) |
| 21 | 以圖搜人（五）：驗收與復盤 | agent-skills | [day21.md](day21.md) |
| 22 | 校準任務 #3：同 spec 重做 | Matt Pocock skills | [day22.md](day22.md) |
| 23 | API Gateway（一）：觸發條件回顧與設計 | Matt Pocock skills | [day23.md](day23.md) |
| 24 | API Gateway（二）：實作 | Matt Pocock skills | [day24.md](day24.md) |
| 25 | API Gateway（三）：驗收與復盤 | Matt Pocock skills | [day25.md](day25.md) |
| 26 | 三框架比較彙整 | — | [day26.md](day26.md) |
| 27 | 我的協作框架 v1 | — | [day27.md](day27.md) |
| 28 | 預備日：讀者回應（Plan A）／自框架重跑校準任務（Plan B） | 自框架 | [day28.md](day28.md) |
| 29 | 機動日：吸收延誤或加映 | — | [day29.md](day29.md) |
| 30 | 總結 | — | [day30.md](day30.md) |

## 框架對照說明

系列中段把三個功能標的分別交給三套不同的 AI 協作框架執行，並在每一輪開始前先做一次**校準任務**——同一份 spec、同一個題目（播放遙測 endpoint），用當輪的框架重做一次，用來對齊不同輪次之間的比較基準。

| 輪次 | 校準任務 | 功能標的 | 協作框架 |
| --- | --- | --- | --- |
| 第一輪 | Day 12 | LLM Chat 助手（Day 13–15） | superpowers |
| 第二輪 | Day 16 | 以圖搜人（Day 17–21） | agent-skills |
| 第三輪 | Day 22 | API Gateway（Day 23–25） | Matt Pocock skills |
| 加映 | Day 28（Plan B） | — | 自框架 v1 |

測量方式（2×2 分類、量表欄位、混淆變數聲明、預註冊表）定義於 [docs/methodology.md](docs/methodology.md)。

**這個系列不做框架排名宣稱。** 三個功能標的難度不同，且作者對 superpowers 較熟、熟練度又會隨系列累積，因此結論一律定位為「使用報告＋條件限定」。

## 儲存庫結構

| 路徑 | 用途 |
| --- | --- |
| `day1.md` ~ `day30.md` | 文章本體 |
| [CLAUDE.md](CLAUDE.md) | 給 AI 協作者的專案規則：人機邊界與文章驗收 |
| [docs/methodology.md](docs/methodology.md) | 系列測量方法論 |
| [templates/article-template.md](templates/article-template.md) | 文章骨架範本 |

## 授權聲明

本儲存庫的**文章內容**（`*.md` 文字、圖表與說明）採用
[創用 CC 姓名標示—非商業性—相同方式分享 4.0 國際 (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hant) 授權。
轉載請標示作者與原文連結。

文章中出現的**程式碼片段**採用 MIT 授權，可自由使用。

vaultflix 專案本身的授權以該專案儲存庫的聲明為準。
