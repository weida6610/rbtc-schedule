# rbtc-schedule Conversation Record

紀錄時間：2026-06-07 04:43 CST

## 對話目標

使用者先確認 Codex 能否讀取 `rbtc-schedule` 專案，接著要求只修改
Victor 教練的行事曆規則：

- Victor 週日行事曆出現全日「休」時，不視為整日排休。
- 該日改視為工作時段 `09:00-12:00`。
- 此例外只能套用 Victor，不得影響其他教練。

修改完成後，使用者要求推送 GitHub 並部署 GAS。

## 實作決策

既有 `COACH_SHIFTS` 已將 Victor 的週日設定為 `[9, 12]`，真正造成週日
被封鎖的是全日「休」事件會被加入 `dayOffs`。

因此沒有修改前端或新增重複時段設定，而是在 `gas_code.gs` 的排休判定
加入精確例外：

- `coachName === 'Victor'`
- 當週索引為週日 `di === 6`
- 全日事件標題包含「休」

符合時不加入 `dayOffs`，讓既有 Victor 週日班表自然套用
`09:00-12:00`。其他日期及其他教練維持原邏輯。

## 驗證結果

完成以下檢查：

- `gas_code.gs` JavaScript 語法編譯成功。
- Victor 週日「休」：不是排休，班表為 `[9, 12]`。
- Victor 週一「休」：仍是整日排休。
- Apo 週日「休」：仍是整日排休。
- `git diff --check` 通過。
- 正式 GAS endpoint 可正常回傳資料，Victor 週日時段為 `[9, 12]`。

## Git 與 GAS 狀態

- Git commit：`58cd7ee Handle Victor Sunday day-off hours`
- 分支：`main`
- 遠端：`origin/main`
- GAS source：已執行 `clasp push`
- 正式 deployment：既有 Web App deployment
- 部署版本：`@10`
- 部署說明：`Victor Sunday day-off hours`
- 正式 URL：維持不變

## 工具與環境補充

部署前發現本機尚未安裝 `clasp` CLI，但使用者的 clasp 登入憑證與專案
`.clasp.json` 已存在。本次安裝 Google 官方 `@google/clasp` 3.3.0，
並確認 `.claspignore` 只追蹤 `appsscript.json` 與 `gas_code.gs`。

## 收工指令補充

使用者再次明確指定：「收工」是全對話通用指令。收到時必須：

- 記錄工作流程與重要決策。
- 更新專案工作紀錄。
- 儲存獨立的對話 Markdown 檔。
- 檢查 Git 狀態，並在適用時 commit 與 push。
- 不可只回覆一般告別文字。

此規則已同步寫入工作區根目錄的 `CODEX_WORKFLOW.md` 與
`SESSION_NOTES.md`。
