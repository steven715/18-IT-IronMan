# Day 3：重新定義 Vaultflix 的目錄結構，以及放檔案前先問的六個問題

今天分享在 *Vaultflix* 中，我認為一個專案該有的目錄結構以及如何透過目錄結構就能表達出專案中一些潛在的框架約束．

<!-- 本人撰寫，AI 勿動 -->

（開場由作者親打：今天想解決什麼問題、為什麼是今天做這件事，以及我如何驅動 AI——我丟出去的第一句話是什麼、為什麼這樣問。此段 AI 不得代寫或改寫。）

## 今日目標

- 由一開始的檔案目錄結構中，去演化出自己的目錄結構邏輯，形成一個自己的規範

## 起心動念

有關由檔案目錄結構去管理整個專案，我認為是一個很直觀的行為，而我最近讀到管理書"葛洛夫：給經理人的第一課"，裡面有提到公司組織其實有分功能向以及目標向兩種．

那我回顧以往專案結構，似乎都是先功能向，像是Ａ模組是一個資料夾，然後下面才是目標向，模組提供一個具體的業務邏輯行為，這是一個專案維度出發．

但在這專案中，其實是偏向系統視角的，因為實際上這專案有前端、後端、資料庫、MinIO、Nginx等組建，我這邊就會想那這種全部混合的專案能怎樣好的管理，因為我當初其實沒在這塊特別關注．

也就是說我從第一天開始做這專案，其實就只關注功能結果，這讓我中間有關哪些檔案放哪裡其實都是沒有概念，但這段我認為應該同樣要有一份規格跟原則出來，這樣人類才能跟ＡＩ有討論的空間．

## 現況：目錄長歪在哪

我請 Claude 讀整個 repo 做了一份目錄結構診斷，下面是我驗證過的重點。結論一句話：Vaultflix 是「功能向為主、目標向正在自己長出來」的混合體。混合本身沒問題，問題是它是無意識發生的，兩套慣例並存又沒寫下來。

後端 `internal/`：

- 外層是按技術角色分的：handler、service、repository、model。目錄只能看出這是一個 Go web app，看不出這是影片平台。
- 真正的功能軸藏在檔名前綴裡。video、tag、favorite、history、keyframe 這些每個都橫跨三到四個目錄各放一個檔，做一個 feature 等於同時開四個資料夾。
- streaming、websocket、scraper 三個 package 已經自己長成目標向了。它們不是層，是能力，內聚力強到不適合再被切成薄片。
- service 變成雜物間，22 個檔案裡 path_safety、url_cache、play_mode 跟業務 service 混住，彼此沒有共同的「一起被改的理由」。import_service.go 565 行，超過 CLAUDE.md 訂的 300 行上限。
- 兩套 interface 慣例並存。舊路線在 repository package 定義 `VideoRepository` 這種大 interface，共 12 個；新路線在使用端定義窄 interface，例如 `keyframeVideoRepo`、`segmentEnsurer`。追下去發現 CLAUDE.md 那句「interface 定義在使用端（例如 repository interface 定義在 repository package）」本身就前後矛盾，AI 兩種都照做過。
- `internal/mock` 集中放了 16 個 mock，跟被 mock 的 interface 分居兩地，加一個 interface 要動兩個 package。
- tag_handler 跳過 service 直接 import repository，是唯一一處跨層。

前端 `web/src`：

- 同樣是按類型分：api、components、hooks、pages、contexts、lib、utils、types。
- lib 與 utils 界線不清，heartbeat 常數和 format 函式都是不含 React 的純邏輯，卻分住兩邊。代表放檔案時根本沒有可判斷的規則。
- `PosterThumb.tsx` 有兩份，components 與 components/admin 各一份，是「不知道該放哪就複製一份」的典型症狀。
- admin 已經在用目標向分組，跟後端的 streaming 是同一種現象。

根目錄那層倒是沒問題，cmd、internal、migrations、compose 都符合 Go 社群慣例。所以要重新定義的不是最外殼，是 internal 和 web/src 裡面怎麼分。

## 重新定義：目錄結構

先講原則，再講樹。葛洛夫講的核心不是「選功能向還是目標向」，而是讓最常需要協調的人坐得最近。翻成目錄就是：**外層放最常一起被改的軸**。Vaultflix 的 CLAUDE.md 規定一個對話只做一個場景，場景幾乎都是 feature 級的，所以「一起被改」的單位就是 feature。這是目前結構跟工作方式對不齊的根本原因。

兩種分法的取捨：

| | 功能向，按層分 | 目標向，按 feature 分 |
| --- | --- | --- |
| 優點 | 橫向規範好統一，新人知道「HTTP 的東西在哪」 | 改一個 feature 只碰一個目錄，目錄自我描述 |
| 缺點 | 目錄不說明系統做什麼，package 內聚低變雜物間 | 橫切關注點沒地方放，feature 間共用會產生 import cycle |
| 適合 | 小型 CRUD，feature 數少 | feature 多、平行開發、AI agent 分工 |

收斂成的形狀只有一種：外層按 context 或 feature，內層按層或依賴，另留一個嚴禁放業務邏輯的 shared，import 方向單向。

後端目標樹，把現有檔案按 context 歸位：

```text
internal/
  identity/     user、auth、rbac、active_user
  catalog/      video、media_source、import、tag、favorite、path_safety
  playback/     hls、segment、keyframe、watch_session、history、telemetry、play_mode
  enrichment/   scraper、avid、actress、suggestion、enrichment、backfill
  insight/      analytics、recommendation
  platform/     config、websocket hub、minio client、url_cache、response、errors
                ↑ 嚴禁放業務規則
```

每個 context 內部不做完整的 DDD 四層，那對這個規模的個人專案是過度設計。用 Go 的扁平寫法：context 的根 package 放 domain type 與 interface，子 package 按依賴分成 postgres、http、mock，main 負責接線。硬規則只有一條：依賴箭頭只往內指，所以 interface 必然定義在使用端，實作在外圈。

前端目標樹：

```text
web/src/
  features/
    player/     api、components、hooks 自己一包
    admin/
    auth/
    browse/
  components/   真正跨 feature 共用的才放這裡
  lib/          純邏輯，以內容命名，例如 lib/format
  types/
```

tag、favorite、user 這種薄 CRUD 留在原本的分層裡不動。混合是合理終態，重點是把「哪些走哪套」寫下來。

## 放檔案前先問的六個問題

真正能解「不知道該放哪」的是決策順序，不是目錄名。

1. **誰會跟它一起被改？** 放在那些檔案旁邊。這是 Common Closure Principle。
2. **誰會 import 它？** 只有一個使用者就放進使用者的目錄。兩個以上且跨 feature 才升到 shared，而 shared 裡不准有業務規則。
3. **它在哪一圈？** 目錄名要能回答依賴方向。外層目錄用領域名詞，例如 playback；只有葉節點才用角色名，例如 postgres、http。
4. **utils、lib、common、helpers 最多留一個**，而且以內容命名。兩個檔沒有共同的改動理由就拆。
5. **測試、mock、fixture 跟被測對象同住。** 加一個 interface 只動一個 package。
6. **規則寫在一個地方並用工具強制。** 沒有 lint 的目錄規則會漂移，Vaultflix 現在的兩套 interface 慣例就是證據。這條目前還沒做，是規則不是現況。

接下來的順序是規則先於搬遷：先把上面的內容寫成 `docs/ARCHITECTURE.md`，順手修掉 CLAUDE.md 那句矛盾的 interface 說明，然後統一成使用端定義的窄 interface，mock 跟著使用端走。搬檔案的 PR 會很大而且 git blame 會斷，不急著做。

## 結尾

今天就先以重新樹立 vaultflix 的檔案目錄定義做收尾，明天會接續看我做這項目的中間更多和ＡＩ有往來的部份．
