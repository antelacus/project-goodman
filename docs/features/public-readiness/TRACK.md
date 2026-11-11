# TRACK — public-readiness v4.8.0

## 一、范围与裁定

- 模式：standard · 目标：仓库可以安全公开——旧的 anon 密钥不再有效、数据库不再对它开放，历史与 Actions 里没有可用的密钥——然后公开；同时修正回答里被误删的"第X条"与被切开的表格
- 范围：
  1. TD-032：服务端访问数据库改用新的 secret 密钥，停用旧的 anon / service_role 密钥；收回 anon / authenticated 对 `public` 表、函数与默认权限的授权；`users`、`guest_activity` 开启 RLS；`.claude/rules/code-conventions.md` 的 RLS 一节随之改正
  2. TD-023：三个路由补 Zod 验证
  3. TD-029：删除无调用方的 PDF 预览路由及 `canvas` / `pdfjs-dist`
  4. 删除许可证（`LICENSE`、`package.json` 改 `UNLICENSED`）；README 改写给外部读者（招聘方），写明"保留所有权利"
  5. 泄密审计：全部提交历史
  10. 去掉服务器内部细节（VPS 上的文件系统路径与目录结构，如 `$DEPLOY_HOME/...`；端口、nginx 配置、容器名保留）：工作流改读仓库变量，部署说明移到仓库外的私有目录，`CLAUDE.md` 只留指针；安全联系改用 GitHub 私密漏洞报告；产品网址 `goodman.antelacus.com` 保留
  11. 改写全部历史（原仓库内）：作者邮箱换成 GitHub noreply，服务器内部细节替换为占位符；改写前做镜像备份到仓库外；改写后 VPS 上的两份检出重新克隆；删除全部 Actions 运行记录与产物
  6. 公开：TD-032 在生产核实、审计通过、Jason 明确同意后，把仓库改为公开，随即设置 fork PR 的工作流须经批准
  7. TD-034：用户选中的文档也发证据编号，其条款引用由程序生成；未核实的条款号只删该处、原处留标记，不再删整句；管理员上传按"第X条"编号的非法规文档时给出提示（出处契约的变更，改 `docs/features/ai-provider/` 的 REQ / DESIGN；细则见下方裁定）
  8. TD-033：切块不再把表格的表头和数据行切开；已入库文档按新规则重新切块
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
  - 2026-11-11 · TD-033 只处理 Markdown 表格；PDF 表格解析丢失结构（TD-040）、未做法规检索的会计处理回答无标注（TD-039）登记为技术债；列举、资料库文档编号、重复条款号三项随本版上线在 Phase 6 登记为已接受 · Jason（初判 a，终裁 a） · 级联：`docs/TECHNICAL_DEBT.md`
  - 2026-11-11 · 提交作者邮箱：在原仓库改写全部历史；接受 12 个 PR 仍保留旧提交（GitHub 将 `refs/pull/*` 设为只读，客服只清除无法靠更换密钥化解的敏感数据）；推翻 10-19"不改写历史"（那条针对已失效的密钥，本次改写不以它为目的） · Jason（初判改写，终裁原仓库改写；反驳要点：PR 残留，另提"新建公开仓库、旧仓库存档"未被采纳） · 级联：本 TRACK 范围 11
  - 2026-11-11 · 部署信息：去掉服务器内部细节，保留产品网址 · Jason（初判全部去掉，终裁保留网址；反驳要点：网址是给招聘方看的入口） · 级联：本 TRACK 范围 10
  - 2026-11-11 · Actions 历史运行记录与产物在公开前全部删除，不逐一审计 · Jason（初判 b，终裁 b） · 级联：本 TRACK 范围 5、11
  - 2026-11-11 · 新的 secret 密钥 staging 与生产各用一把（名为 staging / production） · Jason（初判 a 共用，终裁 b；反驳要点：成本为零，流水线版本本就要分开，staging 泄露可单独撤销） · 级联：本 TRACK 范围 1
  - 2026-11-11 · README 改写给外部读者，守"只做地图、不重复事实"，功能细节交落地页 · Jason（初判 b，终裁 b） · 级联：本 TRACK 范围 4
  - 2026-11-11 · 服务器内部细节只指 VPS 上的文件系统路径与目录结构；端口分配、nginx 配置、容器名保留 · Jason（初判保留，终裁保留） · 级联：`REQ.md` §5.3、§5.4，本 TRACK 范围 10
  - 2026-11-11 · 删除标记文案为 `〔未经核实的引用，已删去〕` · Jason（初判同 Claude 草稿，终裁同） · 级联：`docs/features/ai-provider/REQ.md` §5.4
  - 2026-11-11 · Phase 1 结束：Jason 审阅两份 REQ 完毕 · Jason · 级联：`REQ.md`、`docs/features/ai-provider/REQ.md`

## 二、批次

（Phase 2 切分）

## 三、门与发布

**评审发现登记**：（Phase 2 起）

**Phase 4 证据**：（Phase 4）

## 四、Session-end pickup
