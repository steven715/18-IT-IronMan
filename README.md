# AI時代的軟體開發 - 透過個人專案探討人如何與AI更有效的協作

第 18 屆 iThome 鐵人賽參賽文章。標題與簡介同 iThome 報名時送出的版本。

## 題目簡介

作為一個後端工程師，Vaultflix 是一個以我個人需求出發的影片播放網站，受益於 AI 時代，UI、測試、Infra等部分，我全都動動嘴巴就能完成，甚至後端也用我不熟悉的語言。

而過程中，我深有體會的是 AI 是非常一板一眼的，很多人類以為應該有的潛規則跟規範，是AI開發中最容易踩雷的，我想透過這次鐵人賽的機會，把跟AI的溝通給做一個整合跟歸納，好方便自己或是他人能受益於此，透過降低溝通不良的摩擦來換取更多的注意力跟判斷力，因為這兩者我認為是往後很寶貴的資源。

這系列前半部分會先介紹這專案跟我的作法，後半部分會拿這專案的代辦事項，去實踐我自己的整合跟歸納，並提供我個人的AI協作框架。

## 30 天規劃總表

> 下表標題為規劃用的佔位標題，實際發文時依 [CLAUDE.md](CLAUDE.md) 的驗收規則改寫成正式標題——讓讀者知道這篇能拿到什麼，有數字就寫進去。
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
| 10 | 迭代開場：ROADMAP 與選題邏輯 | — | [day10.md](day10.md) |
| 11 | 方法論：2×2 分類、量表、校準任務 spec、驗收標準預註冊 | — | [day11.md](day11.md) |
| 12 | 校準任務 #1：播放遙測 endpoint | superpowers | [day12.md](day12.md) |
| 13 | 即時轉碼（一）：設計回顧——分類器現況與方案取捨 | superpowers | [day13.md](day13.md) |
| 14 | 即時轉碼（二）：ffmpeg arg builder 實作 | superpowers | [day14.md](day14.md) |
| 15 | 即時轉碼（三）：轉碼拆成獨立 worker 服務 | superpowers | [day15.md](day15.md) |
| 16 | 即時轉碼（四）：驗收——不能播的片庫救回了嗎＋復盤 | superpowers | [day16.md](day16.md) |
| 17 | 校準任務 #2：同 spec 重做 | agent-skills | [day17.md](day17.md) |
| 18 | 全文搜尋（一）：Meilisearch 選型與部署 | agent-skills | [day18.md](day18.md) |
| 19 | 全文搜尋（二）：DB 到搜尋引擎的索引同步 pipeline | agent-skills | [day19.md](day19.md) |
| 20 | 全文搜尋（三）：搜尋 API 與前端整合 | agent-skills | [day20.md](day20.md) |
| 21 | 全文搜尋（四）：CJK 搜尋品質 before/after＋復盤 | agent-skills | [day21.md](day21.md) |
| 22 | 校準任務 #3：同 spec 重做 | Matt Pocock skills | [day22.md](day22.md) |
| 23 | API Gateway（一）：觸發條件回顧與設計 | Matt Pocock skills | [day23.md](day23.md) |
| 24 | API Gateway（二）：實作 | Matt Pocock skills | [day24.md](day24.md) |
| 25 | API Gateway（三）：驗收＋復盤 | Matt Pocock skills | [day25.md](day25.md) |
| 26 | 三框架比較彙整 | — | [day26.md](day26.md) |
| 27 | 我怎麼評斷一套協作框架 | — | [day27.md](day27.md) |
| 28 | 預備日：讀者回應（Plan A）／用系列期間累積的遙測數據檢核 ABR 觸發條件（Plan B） | — | [day28.md](day28.md) |
| 29 | 機動日：吸收延誤或加映 | — | [day29.md](day29.md) |
| 30 | 總結＋協作框架彙整 | — | [day30.md](day30.md) |

## 框架對照說明

系列中段把三個功能標的分別交給三套不同的 AI 協作框架做。每一輪開始前先做一次校準任務——同一份 spec、同一個題目（播放遙測 endpoint），用當輪的框架重做一次，讓不同輪次之間有一個共同的比較基準。

| 輪次 | 校準任務 | 功能標的 | 協作框架 |
| --- | --- | --- | --- |
| 第一輪 | Day 12 | 即時轉碼（Day 13–16） | superpowers |
| 第二輪 | Day 17 | 全文搜尋（Day 18–21） | agent-skills |
| 第三輪 | Day 22 | API Gateway（Day 23–25） | Matt Pocock skills |

測量方式（2×2 分類、量表欄位、混淆變數聲明、預註冊表）定義在 [docs/methodology.md](docs/methodology.md)。

## 協作框架怎麼長出來

簡介裡說的「提供我個人的 AI 協作框架」不是最後一天才動筆的東西。[docs/collaboration-framework.md](docs/collaboration-framework.md) 從 Day 1 就開始寫，每天把踩到的雷追加進去——那些「我以為 AI 會知道、但它其實不知道」的專案潛規則。Day 30 做的是彙整，不是從零生出一份框架。

Vaultflix 在鐵人賽開始前就已經開發一段時間，那段期間踩的雷會在 Day 1–9 介紹專案時一併回填進去。

Day 12 上線的遙測 endpoint 在系列期間持續收數據，Day 28 的 Plan B 用這批數據回答 ROADMAP 上 ABR 的觸發條件——外網的 rebuffer ratio 是不是高到值得做。

這個系列不做框架排名宣稱。三個功能標的難度不同，作者對 superpowers 較熟、熟練度又會隨系列累積，所以結論一律是「使用報告＋條件限定」。

## 儲存庫結構

| 路徑 | 用途 |
| --- | --- |
| `day1.md` ~ `day30.md` | 文章本體 |
| [CLAUDE.md](CLAUDE.md) | 給 AI 協作者的專案規則：人機邊界與文章驗收 |
| [docs/methodology.md](docs/methodology.md) | 系列測量方法論 |
| [docs/collaboration-framework.md](docs/collaboration-framework.md) | 持續收斂中的協作框架與踩雷素材，Day 30 交付 |
| [templates/article-template.md](templates/article-template.md) | 文章骨架範本 |

## 授權聲明

本儲存庫的文章內容（`*.md` 的文字、圖表與說明）採用
[創用 CC 姓名標示—非商業性—相同方式分享 4.0 國際 (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hant) 授權。
轉載請標示作者與原文連結。

文章中出現的程式碼片段採用 MIT 授權，可自由使用。

vaultflix 專案本身的授權以該專案儲存庫的聲明為準。
