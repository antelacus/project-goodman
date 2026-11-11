# TRACK — public-readiness v4.8.0

## 一、范围与裁定

- 模式：standard · 目标：仓库可以安全公开——旧的 anon 密钥不再有效、数据库不再对它开放，历史与 Actions 里没有可用的密钥——然后公开；同时修正回答里被误删的"第X条"与被切开的表格
- 范围：
  1. TD-032：服务端访问数据库改用新的 secret 密钥，停用旧的 anon / service_role 密钥；收回 anon / authenticated 对 `public` 表、函数与默认权限的授权；`users`、`guest_activity` 开启 RLS；`.claude/rules/code-conventions.md` 的 RLS 一节随之改正
  2. TD-023：三个路由补 Zod 验证
  3. TD-029：删除无调用方的 PDF 预览路由及 `canvas` / `pdfjs-dist`
  4. 删除许可证（`LICENSE`、`package.json` 改 `UNLICENSED`）；README 改写给外部读者（招聘方），写明"保留所有权利"
  5. 泄密审计：全部提交历史
  10. 去掉服务器内部细节（VPS 上的文件系统路径与目录结构；端口、nginx 配置、容器名保留）：工作流的路径放 GitHub Secrets，部署说明留在仓库但路径换成变量名、真实值放仓库外的私有文件；安全联系改用 GitHub 私密漏洞报告；产品网址 `goodman.antelacus.com` 保留
  11. 改写全部历史（原仓库内）：作者邮箱换成 GitHub noreply，服务器内部细节替换为占位符；改写前做镜像备份到仓库外；改写后 VPS 上的两份检出重新克隆；删除全部 Actions 运行记录与产物
  6. 公开：TD-032 在生产核实、审计通过、Jason 明确同意后，把仓库改为公开，随即设置 fork PR 的工作流须经批准
  7. TD-034：用户选中的文档也发证据编号，其条款引用由程序生成；未核实的条款号只删该处、原处留标记，不再删整句；管理员上传按"第X条"编号的非法规文档时给出提示（出处契约的变更，改 `docs/features/ai-provider/` 的 REQ / DESIGN；细则见下方裁定）
  8. TD-033：两套切块代码合并为一套，切块之间不再重叠、按行切开，表格整块不切；已入库文档按新规则重新切块（同时修正选中文档拼接后每隔 800–1000 字重复一段的问题）
  9. TD-038：删除 `toOpenAIFunctionDefs` 无生产调用方的选项
- 明确不做：发布流水线的全部内容（`docs/features/release-pipeline/TRACK.md`），包括 staging 数据隔离、`Dockerfile` 构建参数中的密钥（镜像不出 VPS，不随公开暴露）、TD-031、TD-027；TD-024、TD-026、TD-037
- 全局约束：
  - 版本地板：Node → `.nvmrc`；依赖 → `package.json`
  - 外部约束（DESIGN 开写后迁入其外部约束一节）：
    - GitHub：私有仓库读不了也设不了 fork PR 审批（API 422）、用不了分支保护（403），所以 fork PR 审批只能在公开之后立即设置；公开后，Actions 的运行日志与未过期产物对所有人可见
    - Supabase：新的 secret / publishable 密钥与旧的 anon / service_role JWT 密钥可以同时有效；停用旧密钥是项目级开关（可重新启用），staging 与生产共用一个项目，会同时受影响。项目目前没有任何新式密钥（只有旧 anon；secret 密钥 MCP 列不出，需在 Dashboard 新建）。`public` 的默认权限把今后新建的表、函数、序列全部授予 anon / authenticated（属主 `postgres` 与 `supabase_admin` 各一组），只收回现有对象的授权，下一条迁移会重新开放
  - 现状（2026-11-04 核实）：
    - 数据库：`public` 12 张表 anon 都可读写；`users`、`guest_activity` 未开 RLS，其余 10 张各一条策略；12 个函数中 11 个 anon 可执行（`replace_regulation_articles` 除外），`SECURITY DEFINER` 只有 `cleanup_temp_documents`；安全检查报 1 个 ERROR（两表未开 RLS）、2 个 WARN（该函数 anon / authenticated 可执行）。Storage：`document-files` 私有，`storage` 下无策略
    - 密钥：生产 `.env` 与 staging `.env.staging` 指向同一项目（`pwqvou…`），anon 与 service_role 两把密钥的哈希两边相同（`357a9724` / `cca17066`）
    - 代码：`createServerSupabaseClient` 36 处调用、25 个文件；用 service_role 的只有 `src/lib/documents/storage.ts`、`src/lib/reports/docx-upload.ts`、`pdf-upload.ts`；`scripts/` 下 4 个脚本读这两把密钥；`Dockerfile` 把两把密钥作为构建参数写进镜像（范围外，见"明确不做"）
    - GitHub：128 次运行，24 个未过期产物，全部是 `coverage-report`；仓库 Secrets 为部署所需 4 个、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`（停用旧密钥后随之更换或删除）。本地 `.env` 的 Supabase 密钥是占位值
  - The Floor：审计只数命中、看前缀，不读出密钥的值；不用历史里的凭据去验证它是否有效；数据库核对只读结构与授权，不读行内容
- 裁定：
  - 2026-10-19 · goodman 改为公开仓库，作为分支保护的前提；公开在审计通过之后执行 · Jason · 级联：本 TRACK 范围 6
  - 2026-10-19 · 历史中 2025-07 的 service_role 密钥（`setup-storage.js`，项目 `moivfobm…`）属于已删除的 Supabase 项目、已失效，保留在历史中，不改写历史 · Jason · 级联：本 TRACK 范围 5
  - 2026-10-19 · 不放许可证：删除 AGPL-3.0；公开仅供查看 · Jason · 级联：本 TRACK 范围 4
  - 2026-10-20 · TD-032 在仓库公开之前修复 · Jason · 级联：`docs/TECHNICAL_DEBT.md`、本 TRACK 范围 1
  - 2026-11-04 · 从发布流水线拆出本版，先于流水线；上面四条 10-19 / 10-20 裁定随之迁入 · Jason · 级联：`docs/features/release-pipeline/TRACK.md`、`v4_DEVELOPMENT_PLAN.md` §3.13
  - 2026-11-04 · 技术债：TD-038、TD-033、TD-034 放进本版；TD-037 不放，交下一个版本 Phase 0 · Jason · 级联：本 TRACK 范围 7–9、`docs/TECHNICAL_DEBT.md`
  - 2026-11-04 · TD-032 改为：服务端用新的 secret 密钥，整体停用旧的 anon / service_role 密钥（替代原"服务端改用 service_role"） · Jason · 级联：本 TRACK 范围 1、`docs/TECHNICAL_DEBT.md` TD-032
  - 2026-11-10 · TD-034 两种错误取舍：分不清是否法规引用时，宁可删去条款号，不放过可能编造的条款号 · Jason（初判 a，终裁 a） · 级联：`docs/features/ai-provider/REQ.md` §5.4
  - 2026-11-10 · TD-034 用户文档的条款号：与法规相同，由程序按证据编号生成，模型自写的不认 · Jason（初判 b，终裁 b；反驳要点：只查"文档里有这一条"会放过"会计准则第五条"这类编造） · 级联：`docs/features/ai-provider/REQ.md` §5.4
  - 2026-11-10 · TD-034 未核实的条款号：只删条款号、保留句子，原处显示删除标记（替代删整句） · Jason（初判 c 不删只标，终裁 d；反驳要点：标记后编造的数字仍然显示） · 级联：`docs/features/ai-provider/REQ.md` §5.4、§5.5
  - 2026-11-11 · TD-034 列举序号：不做程序改写，保留提示词约束；生产中首次出现由列举触发的删除标记时再做（登记为技术债） · Jason（初判 b 程序改写，终裁 a；反驳要点：v4.7.0 以来 37 条回答 0 次删除；改写会让编造的引用不留标记） · 级联：`docs/TECHNICAL_DEBT.md`
  - 2026-11-11 · TD-034 回答末尾不再有汇总提示，删除次数记入过程日志 · Jason（初判 b，终裁 b） · 级联：`docs/features/ai-provider/REQ.md` §5.4
  - 2026-11-11 · TD-034 资料库非法规文档的检索结果本版不发编号（检索返回切块，条款可能跨块）；管理员上传按"第X条"编号的非法规文档时，上传结果提示其条款号会被删去，作为触发信号（登记为技术债） · Jason（初判 b，终裁 b 加触发信号） · 级联：`docs/TECHNICAL_DEBT.md`
  - 2026-11-11 · TD-034 删除标记适用于所有未核实情形（自写条款号、不存在的编号、编号后补写的款项、原样引用的交叉引用），只删有问题的那一处 · Jason（初判 a，终裁 a） · 级联：`docs/features/ai-provider/REQ.md` §5.4
  - 2026-11-11 · TD-034 用户文档的条款引用显示为「《文件名去扩展名》（您上传的文档）第X条」，附打开该文档的链接 · Jason（初判 a 与法规同格式，终裁加标记与链接；反驳要点：用户上传的法规副本会被显示成资料库核实过的引用） · 级联：`docs/features/ai-provider/REQ.md` §5.4
  - 2026-11-11 · TD-034 一份用户文档内条款号重复：不重复的照常发编号，重复的不发，引用按删除标记处理；生产中首次因重复出现删除标记时再做位置识别（登记为技术债） · Jason（初判 a 识别附件位置，终裁 b；反驳要点：附件结构写法无穷尽，且生产中尚无用户文档） · 级联：`docs/TECHNICAL_DEBT.md`
  - 2026-11-11 · TD-034 资料库外标注只看法规引用，引用用户文档不算来自资料库 · Jason（初判 a，终裁 a） · 级联：`docs/features/ai-provider/REQ.md` §5.5
  - 2026-11-11 · TD-033 只处理 Markdown 表格；PDF 表格解析丢失结构（TD-040）、未做法规检索的会计处理回答无标注（TD-039）登记为技术债；列举、资料库文档编号、重复条款号三项（加上超长表格，共四项）随本版上线在 Phase 6 登记为已接受 · Jason（初判 a，终裁 a） · 级联：`docs/TECHNICAL_DEBT.md`
  - 2026-11-11 · 提交作者邮箱：在原仓库改写全部历史；接受 12 个 PR 仍保留旧提交（GitHub 将 `refs/pull/*` 设为只读，客服只清除无法靠更换密钥化解的敏感数据）；推翻 10-19"不改写历史"（那条针对已失效的密钥，本次改写不以它为目的） · Jason（初判改写，终裁原仓库改写；反驳要点：PR 残留，另提"新建公开仓库、旧仓库存档"未被采纳） · 级联：本 TRACK 范围 11
  - 2026-11-11 · 部署信息：去掉服务器内部细节，保留产品网址 · Jason（初判全部去掉，终裁保留网址；反驳要点：网址是给招聘方看的入口） · 级联：本 TRACK 范围 10
  - 2026-11-11 · Actions 历史运行记录与产物在公开前全部删除，不逐一审计 · Jason（初判 b，终裁 b） · 级联：本 TRACK 范围 5、11
  - 2026-11-11 · 新的 secret 密钥 staging 与生产各用一把（名为 staging / production） · Jason（初判 a 共用，终裁 b；反驳要点：成本为零，流水线版本本就要分开，staging 泄露可单独撤销） · 级联：本 TRACK 范围 1
  - 2026-11-11 · README 改写给外部读者，守"只做地图、不重复事实"，功能细节交落地页 · Jason（初判 b，终裁 b） · 级联：本 TRACK 范围 4
  - 2026-11-11 · 服务器内部细节只指 VPS 上的文件系统路径与目录结构；端口分配、nginx 配置、容器名保留 · Jason（初判保留，终裁保留） · 级联：`REQ.md` §5.3、§5.4，本 TRACK 范围 10
  - 2026-11-11 · 删除标记文案为 `〔未经核实的引用，已删去〕` · Jason（初判同 Claude 草稿，终裁同） · 级联：`docs/features/ai-provider/REQ.md` §5.4
  - 2026-11-11 · Phase 1 结束：Jason 审阅两份 REQ 完毕 · Jason · 级联：`REQ.md`、`docs/features/ai-provider/REQ.md`
  - 2026-11-11 · 选中文档的完整文本：新切块代码不重叠，切块拼起来即原文；两套切块代码合并；已入库文档一次性还原原文后重新切块 · Jason（初判 a 拼接时去重叠，终裁 c；反驳要点：重叠长度会成为切块与拼接两处的隐含约定，章节边界会误剪；重新切块只影响 6 份非法规知识文档的检索） · 级联：`docs/features/ai-provider/REQ.md` §5.7、DESIGN
  - 2026-11-11 · 部署说明留在仓库，路径换成变量名，真实值放仓库外的私有文件；工作流的路径放 GitHub Secrets（公开仓库的运行日志人人可见，Secrets 被遮蔽、仓库变量不会） · Jason（初判 b，终裁 b） · 级联：`REQ.md` §5.3、本 TRACK 范围 10
  - 2026-11-11 · DQ-1 长表格：表格永远不切，超长表格的切块偏大；首次出现超过切块长度的表格时再做续块带表头（随本版上线在 Phase 6 登记为已接受） · Jason（初判 a 表头独立成列，终裁 c；反驳要点：现有 50 张表最长 568 字，都不超过 1000 字，独立成列要加列、改生成列、重建索引） · 级联：`docs/features/ai-provider/REQ.md` §5.7、DESIGN §4
  - 2026-11-11 · 选中文档只接受当前用户自己上传的文档；别人的文档与资料库文档按文档加载失败处理（修正读取不核对归属的缺口） · Jason（初判 a 自己的文档加资料库文档，终裁 a'；反驳要点：资料库里的准则会被标成「您上传的文档」） · 级联：`docs/features/ai-provider/REQ.md` §5.7、本 TRACK Batch 4
  - 2026-11-11 · Codex 设计门任务一 MUST-2：REQ §5.1 写明例外——`supabase_admin` 新建的对象仍默认授予 anon，每次迁移后检查并收回；前提是项目里没有能以 anon 身份请求的密钥 · Jason（初判 a，终裁 a） · 级联：`REQ.md` §5.1、DESIGN §5
  - 2026-11-11 · Codex 设计门其余 15 项按 Claude 所提处置写入 DESIGN（含：重切挪到新代码上线之前、健康接口报提交 SHA、Actions 最后清理、强推前在副本上验收） · Jason（无异议） · 级联：DESIGN §4–§9、本 TRACK Batch 1 / 4 / 5 / 8
  - 2026-11-11 · Phase 2 结束：设计评审发现全部有处置，验收测试已写为待办，批次已切 · Jason · 级联：本 TRACK
  - 2026-11-11 · 用户文档拆条款与法规拆分共用"什么算条款的开头"，重复的处理各自定义；共用规则配法规样例测试，进 CI · Jason（初判 a，终裁 a 加样例测试） · 级联：DESIGN

## 二、批次

验收测试：`tests/acceptance/public-readiness/`、`tests/acceptance/ai-provider/b9-user-doc-citations.test.ts`；数据库权限的验收在 `supabase/tests/access.sql`。

### Batch 1 — 数据库唯一入口
- 状态：open
- 范围：`src/lib/database/supabase.ts`（读 `SUPABASE_SECRET_KEY`，删 `createBrowserSupabaseClient`）；健康接口报提交 SHA（`GIT_SHA` 构建参数）；`src/lib/documents/storage.ts`、`src/lib/reports/docx-upload.ts`、`pdf-upload.ts` 改用它；`scripts/` 下 4 个脚本、`.env*.example`、CI 构建不提供密钥 · REQ §5.1
- 验收判据：§server-secret-key；CI 构建不提供 secret 密钥仍通过（DESIGN 不变量 5）
- 依赖：none

### Batch 2 — 权限迁移
- 状态：open
- 范围：新迁移（收回 anon / authenticated / `PUBLIC` 的授权与 `postgres` 的默认权限含全局函数默认，显式授予 service_role，`public` 全部表开 RLS）；`supabase/tests/access.sql`；`npx supabase gen types`；`.claude/rules/code-conventions.md` 的 RLS 一节 · REQ §5.1
- 验收判据：§anon-denied、§default-privileges、§rls-all（在事务内试跑并回滚；正式执行在 DESIGN §9 第 3 步）
- 依赖：Batch 1

### Batch 3 — 条款开头的共用规则
- 状态：open
- 范围：新建 `src/lib/extraction/article-lines.ts`；`regulation-splitter.ts` 改用它；法规样例行单测进 CI · DESIGN 不变量 4
- 验收判据：法规拆分既有单测全过；样例行覆盖正文交叉引用、无空格的条款开头、页码行
- 依赖：none

### Batch 4 — 用户文档出处与删除标记
- 状态：open
- 范围：`src/lib/citations/`（D 编号、删除标记、计数）；`load-memory.ts`（只接受当前用户自己的文档）、`finalize-answer.ts`、流式路由的过程事件；管理员上传的提示；`chat-system.md` 写明 D 编号；`b4-search-citations.test.ts` 中按旧规则断言的用例随规则改 · ai-provider REQ §5.4、§5.5
- 验收判据：§citation-text、§user-doc-citation、§user-doc-duplicate、§removal-count、§doc-article-hint、§out-of-library、§selected-doc-owner
- 依赖：Batch 3、Batch 5（拼接出的全文须无重复）

### Batch 5 — 不重叠的切块
- 状态：open
- 范围：`src/lib/documents/chunker.ts` 重写；管理员上传路由删 `chunkDocument` 改用它；一次性 `scripts/rechunk-documents.ts`（关版前删除） · ai-provider REQ §5.7
- 验收判据：§chunk-partition、§table-chunk；重切后在生产库上核对两条
- 依赖：none

### Batch 6 — 输入验证与清理
- 状态：open
- 范围：TD-023 三个路由的 Zod schema；TD-029 删 PDF 预览路由与 `canvas` / `pdfjs-dist` / `src/types/pdfjs-dist.d.ts`；TD-038 删 `ToOpenAIOptions` 与 detailed 分支 · REQ §5.2
- 验收判据：§input-validation；`npm ls canvas pdfjs-dist` 无结果；`registry.test.ts` 通过
- 依赖：none

### Batch 7 — 公开内容
- 状态：open
- 范围：删 `LICENSE`、`package.json` 改 `UNLICENSED`；README 改写；部署工作流的路径改读 Secrets；运维文档的路径改为变量名，真实值放 `GOODMAN_DATA_DIR` 下的私有文件；`docs/SECURITY.md` 改为私密漏洞报告；`CLAUDE.md` 的部署一节 · REQ §5.3
- 验收判据：§no-license、§no-internals、§no-personal-email；staging 用改过的工作流部署一次
- 依赖：none

### Batch 8 — 上线、改写历史与公开
- 状态：open
- 范围：DESIGN §9 第 1–10 步（第 6 步起每步执行前 Jason 确认） · REQ §5.1、§5.4–§5.6
- 验收判据：§env-smoke、§legacy-keys-disabled、§history-emails、§history-internals、§history-backup、§deploy-after-rewrite、§actions-cleared、§audit-findings、§public-settings
- 依赖：Batch 1–7 合并；DESIGN §9 第 1 步（重切）在新代码上线之前

## 三、门与发布

**评审发现登记**：
- Codex 设计门 · 任务一（DESIGN + 本 feature REQ，xhigh，只读，`de5e45c`）。原文照录，严重性为 Codex 所给；核实结论为 Claude 所得：
  - MUST-1 函数撤权漏了 `PUBLIC` 伪角色与全局默认权限：只撤 anon / authenticated 的直接授权，经 `PUBLIC` 的执行权仍在，新函数默认授予 `PUBLIC` —— 核实：11 个函数经 `PUBLIC` 可执行；`postgres` 没有全局的函数默认权限条目（即内置默认生效） —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - MUST-2 DESIGN 接受"`supabase_admin` 新建的对象仍授予 anon"，与 REQ §5.1"今后新建的对象也不授予"冲突 —— 核实：成立；`postgres` 改不了 `supabase_admin` 的默认权限，MCP 执行身份为 `postgres` —— status: 已关闭：REQ §5.1 写明例外（见裁定）
  - MUST-3 第 7 步清空 Actions 后，第 9 步部署与强推触发的 CI 会重新产生记录，违反 §actions-cleared —— 核实：成立（`ci.yml` 响应 `development` 推送并上传覆盖率产物） —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - MUST-4 §deploy-after-rewrite 要求核对提交，健康接口只报版本号 —— 核实：成立（`src/app/api/health/route.ts`、`next.config.ts` 只取 `package.json` 版本） —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - SHOULD-5 强推前没有核验备份可恢复、没有先在副本上验收改写结果，没有处理部分引用推送失败与旧克隆重新推入 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - SHOULD-6 "前 5 步可以回退"没有对应的回退方案：迁移后回退到旧应用会停机，重新启用旧密钥不恢复已撤的权限 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - SHOULD-7 gitleaks 的执行方式未定：引用覆盖范围、脱敏、报告存放、无法判定时停止公开 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - 待核：① 线上对象属主、有效权限 —— 已关闭：12 张表、12 个函数属 `postgres`，有效权限以 `has_*_privilege` 核对；② 首次新建密钥是否附带默认的 publishable 密钥 —— 未关闭，第 1 步时核对；③ 停用旧密钥对 Storage 签名链接的影响 —— 未关闭，第 4 步冒烟时核对；④ staging 用 `git pull` —— 已关闭：改写后历史不相关，拉取会失败，按设计重新克隆；⑤ PR 中是否有分支 / tag 不可达的提交 —— 已关闭：12 个 PR 的提交全部可达，扫描全部分支与 tag 即覆盖
- Codex 设计门 · 任务二（DESIGN + ai-provider REQ §5.4 / §5.5 / §5.7，xhigh，只读，`de5e45c`）。原文照录，严重性为 Codex 所给；核实结论为 Claude 对照源码所得：
  - MUST-1 引用识别有绕过路径：Markdown 链接拆开的条款号（`根据第[九十九](…)条`）与 `[R1][第二款](…)` 都原样保留，`removed=0` —— 核实：在现有代码上复现，属 v4.7.0 起的缺陷 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - MUST-2 "只看 cited 里有没有 regulation"会让纯计算、只读用户文档的回答也被标为资料库外，且失去检索失败标注 —— 核实：DESIGN §4 措辞遗漏了"做过或请求过法规检索"与"全部出错"两项条件，现有代码有 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - MUST-3 表格只认行首 `|`，省略外侧竖线的合法 Markdown 表格会被切开 —— 核实：成立 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - MUST-4 重切以"切块数一致"判定还原正确，没有独立的原文基准；旧切块器会丢掉 50 字以内的序言 —— 核实：成立；51 份文档在 Storage 都有原文件，可作基准 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - MUST-5 新代码上线到重切之间，D 编号会读到旧的重叠切块，唯一的条款被误判为重复 —— 核实：机制成立；生产中用户文档为 0 份、选中只接受本人文档，窗口内无受影响文档 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - SHOULD-6 局部替换缺少原文区间映射与"处"的计数单位（规范化后的位置不能截取原始 Markdown） —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - SHOULD-7 `article-lines` 需要上下文契约（前一行是否结束、序号状态）；现有拆分器对无空格的重复条款号不报重复 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - SHOULD-8 多份选中文档的 D 编号如何分配不在接口里，并行编号会互相覆盖 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - SHOULD-9 `load-memory` 用 `join("\n")` 拼接，会多插换行；需要"上传 → 存储 → 读取 → 编号前全文"的端到端验证 —— status: 处置已定，写入 DESIGN（Batch 落码时以测试关闭）
  - 待核：① D 引用的链接需要文件名与 `fileUrl`，`load-memory` 目前只查切块内容 —— 未关闭；② 流式路由是否先推送未经核对的原始输出 —— 已关闭：答案只在完成事件中整体发送；③ 原文可恢复性 —— 已关闭：51 份文档在 Storage 都有原文件，用户文档 0 份

**Phase 4 证据**：（Phase 4）

## 四、Session-end pickup
