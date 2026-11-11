# DESIGN — public-readiness

## 1 引言

### 1.1 参考

- 需求：`REQ.md`（公开、数据库访问）；`docs/features/ai-provider/REQ.md` §5.4、§5.5、§5.7（出处、资料库外标注、切块）
- 出处模块的既有设计：`docs/features/ai-provider/DESIGN.md`

### 1.2 术语

N/A —— 证据编号沿用 ai-provider 的叫法；`R` 是法规检索结果，`D` 是用户选中文档的条款。

## 2 总体设计

### 2.1 模块关系

| 模块 / 文件 | 单一职责 | 测试层级 |
|-------------|---------|---------|
| `src/lib/database/supabase.ts` | 服务端唯一的数据库与 Storage 客户端，读 secret 密钥；缺密钥即抛错。`storage.ts`、`docx-upload.ts`、`pdf-upload.ts` 不再各建客户端；无调用方的 `createBrowserSupabaseClient` 删除 | IO |
| `supabase/migrations/`（新迁移） | 收回 anon / authenticated 的授权与 `postgres` 的默认权限；`public` 全部表开 RLS | infra（由验收 SQL 守住） |
| `src/lib/documents/chunker.ts` | 唯一的切块器：按行、不重叠，表格整块不切；管理员上传路由里的 `chunkDocument` 删除 | core |
| `src/lib/documents/text.ts` | 由切块读回文档全文（`loadDocumentText`） | IO |
| `src/lib/documents/extract-text.ts` | 按文件类型提取文本（从管理员上传路由移出，重切脚本以它重新解析原文件） | IO |
| `src/lib/extraction/article-lines.ts`（新） | "什么算条款的开头"：一行是否以条款号开头、条款号是什么。法规拆分与用户文档拆条款共用；遇到重复怎么办不在这里 | core |
| `src/lib/extraction/regulation-splitter.ts` | 法规拆分：用 `article-lines` 判定，重复条款号仍让上传失败 | core |
| `src/lib/citations/` | 证据的显示与核对：给用户文档按条发 `D` 编号；`finalizeAnswer` 把有效编号换成出处、把未核实的那一处换成删除标记、计数 | core |
| `src/lib/workflows/core/nodes/load-memory.ts` | 只接受当前用户自己的文档；读切块与文档的名称、`file_url`，直接连接成全文，一次交给 `citations` 编号，把编号后的文本与 `D` 证据放进本问题的状态 | IO |
| `src/app/api/health/route.ts`、`next.config.ts`、`Dockerfile` | 健康接口报出构建时注入的提交 SHA | infra |
| `src/lib/workflows/core/nodes/finalize-answer.ts`、流式路由 | 把删除次数作为过程事件发出 | IO |
| `src/app/api/admin/upload-database-document/route.ts` | 非法规知识文档含条款开头的行时，上传结果带提示 | IO |
| `scripts/rechunk-documents.ts`（一次性） | 还原已入库文档的原文、按新规则重切；本版关版前删除 | IO |
| `.github/workflows/deploy*.yml`、`docs/` 运维文档 | 路径改读 Secrets / 写成变量名 | infra |

依赖方向：`citations` 与 `chunker` 不依赖数据库，也不依赖工作流；`regulation-splitter` 与 `citations` 都依赖 `article-lines`，`article-lines` 不依赖任何一方。

### 2.2 数据流

```
选中文档：document_chunks（按 chunk_index）──拼接──▶ 全文（与原文一致，§7 不变量 2）
        ──citations.numberDocuments──▶ 带 [Dn] 的文本 + D 证据 ──▶ 模型
法规检索：tool-executor 给结果编 Rn ──▶ R 证据 ──▶ 模型
模型回答 ──finalizeAnswer(R + D 证据)──▶ { 文本, 被引用的证据, 删除次数 }
        ├─▶ 保存的消息与界面显示（文本）
        └─▶ 过程日志（删除次数）

写入切块：原文 ──chunker──▶ [content] ──▶ document_chunks（search_text 仍由 content 生成）
```

## 3 入口

- 财务人员：工作台对话（流式路由），可选中文档。
- 管理员：上传知识文档或法规（`/api/admin/upload-database-document`）。
- 用户：上传文档（`/api/documents/upload-temp`）。
- Jason / Claude：一次性重切脚本；§9 的发布顺序。

## 4 模块间契约

- **证据**：`{ id, kind: 'regulation' | 'user_document', name, articleNumber, documentId, fileUrl }`。显示：`regulation` →《名》第X条；`user_document` →《文件名去扩展名》（您上传的文档）第X条。两种都带链接；`load-memory` 读切块时一并读文档的名称、`file_url` 与归属。
- **`citations.numberDocuments(documents)`**：一次处理本问题选中的全部文档（共用一个计数器，`D1`、`D2`……在本问题内唯一，与 `R` 互不重叠；下一个问题重新编号）。输入每份文档的 id、文件名、`file_url` 与全文；输出带编号的文本和 `D` 证据。编号写在每条条款开头那一行之前。重复只在同一份文档内判断：出现两次以上的条款号，这几条都不编号；没有条款开头的文档原样返回、没有证据。
- **`finalizeAnswer`**：入参增加 `D` 证据；返回 `{ text, cited, removed }`，不再在文末追加汇总。"页面上显示的是什么"由页面同款解析器回答（`remark-parse` 加 `src/lib/markdown/answer-syntax.ts` 里的语法插件——页面与 `citations` 共用这一份清单，任何一方都不单独加语法插件；版本由 `package-lock.json` 与 react-markdown 共用）：识别在解析出的文字、代码与 HTML 节点上进行，引用定义与图片不算显示；替换按节点的原文位置落回 Markdown，部分覆盖的加粗、链接、代码段整体换掉，不留不配对的标记。块与块之间有分隔，任何规则都不跨列表项。`remark-breaks` 不参与：它只把换行显示为换行，对识别而言两者都是空白，且它新建的节点没有原文位置。
  - 不手写解析器（被否决）：手写版本与页面的解析器每有一处理解不同，就是一条绕过路径——Codex 一轮找出 8 处；同款解析器让"检查的"与"显示的"由同一份代码决定。
  - 判定在**显示出来的文字**上做：先把 Markdown 强调、代码标记、链接（`[文字](地址)` 只留文字）、数字实体、全角字符还原，再找条款号与编号；替换落回原始 Markdown 中对应的那一段。
  - "一处"= 原文中连续的一段未核实内容（自写的条款号、不存在的编号、编号后补写的款项，及包住它们的链接或强调标记），相邻的合并为一处；每处替换为 `〔未经核实的引用，已删去〕`，句子其余部分保留。`removed` 是处数。
  - 只有 `[Rn]` / `[Dn]` 形式的有效编号会被展开；裸写的"第五条"即使与某条 `D` 证据同号，也是未核实。
  - 资料库外标注的判定沿用现有条件，只改一处：本问题做过或请求过法规检索、且回答中**没有有效的 `R` 引用**时加标注；本问题实际执行的法规检索全部出错时用检索失败的标注。`D` 引用不影响这两项判断。
- **条款开头**：`article-lines` 判定"这一行（结合前一行）是不是条款的开头、条款号是什么"，返回候选；序号是否递增、重复怎么处理由调用方决定（法规拆分：重复则上传失败；用户文档：重复的不编号）。
- **切块**：`createSectionAwareChunks(text, sections)` 返回带章节信息的切块，`content` 按顺序直接连接（不加分隔符）等于 `text`；读回全文只经 `loadDocumentText`（选中文档、文档提取工具、报告取数三处共用）。切点只落在行尾，也不跨章节；比切块长度长的单行在句末切开，没有句末则按长度切。一张 GFM 表格（含 `|` 的表头行、分隔行、其后连续的含 `|` 的行，外侧竖线可省略）整块放进一个切块，比切块长度长也不切。不切而不是续块带表头：现有 50 张表最长 568 字，都不超过切块长度 1000 字；续块带表头要加列、改生成列、重建索引，读切块的地方还都得补表头。
- **`createServerSupabaseClient()`**：签名不变，36 处调用不动；读 `SUPABASE_SECRET_KEY`，缺失即抛错，不回退。
- **过程事件**：回答核对后发一条"出处核对"事件，带被删去的处数与被引用的用户文档条款（各附文档链接）；两者都为 0 时不发。选中的文档没有读取时，完成事件带 `DOCUMENT_UNAVAILABLE` 提示（`documentLoadErrors` 经图状态传到流式路由）。
- **健康接口**：返回版本号与构建时注入的提交 SHA（构建参数 `GIT_SHA`，不是密钥）。部署后核对线上 SHA 等于目标提交。

## 5 持久化数据

- `document_chunks`：一行 = 一份文档的一个切块；结构不变，只是内容按新规则重切。
- 权限（新迁移）：
  - 收回 anon、authenticated 与 `PUBLIC` 对 `public` 下全部表、序列的授权与全部函数的执行权。只撤两个角色不够：函数的执行权默认经 `PUBLIC` 授出，现有 11 个函数正是这样被 anon 执行的。
  - 收回 `postgres` 的默认权限：`public` 下表、序列对 anon / authenticated 的默认授权，以及全局的函数默认执行权（`PUBLIC`）。按 schema 收回抵消不了全局默认。
  - 显式授予 service_role 所需的权限（secret 密钥以 service_role 身份访问）。
  - `users`、`guest_activity` 开启 RLS，不加策略（service_role 不受 RLS 限制）。
  - 例外（REQ §5.1 已写明）：`supabase_admin` 新建的对象仍默认授予 anon，`postgres` 改不了它的默认权限。每次迁移后跑 `supabase/tests/access.sql` 与 Supabase 安全检查，发现即收回。这个例外不构成暴露面的前提是项目里没有任何能以 anon 身份请求的密钥（旧 anon 密钥已停用，不发 publishable 密钥）；一旦新建 publishable 密钥，须先重新评估它。
- 环境变量：新增 `SUPABASE_SECRET_KEY`（运行时经 `env_file` 进容器，不作构建参数）。停用旧密钥后，`NEXT_PUBLIC_SUPABASE_ANON_KEY` 与 `SUPABASE_SERVICE_ROLE_KEY` 从代码、`.env` 与 GitHub Secrets 中删去；构建参数里的旧值失效后留给发布流水线清理。新增 `GOODMAN_DATA_DIR`：仓库外私有目录，存放部署路径文件、路径检查清单、扫描报告与镜像备份。

## 6 异常流

- 缺 `SUPABASE_SECRET_KEY` → 首次访问数据库时抛错（fail-closed）。不回退到旧密钥：回退会让"已经切过去"在核实时看起来成立。
- 选中文档读取失败、或不属于当前用户：沿用现有的文档加载错误事件，不读内容、不编号。
- 重切脚本：基准是从 Storage 原文件重新解析出的全文；它须与按已知重叠长度（管理员上传 200 字、用户上传 100 字）从旧切块还原出的全文逐字相同。不同则这份文档停下、报给 Jason，不写入。每份文档的删旧与插新在同一个事务里，事务内先锁住文档、再比对切块与 `check` 时的哈希，不符即停。`check` 不覆盖已有的备份；`apply` 先校验备份。
- 历史改写后强推 `main`：生产部署做的是只允许快进的合并，staging 做 `git pull`，改写后的历史与旧检出不相关，两边都会响亮失败、不部署；重新克隆之后再部署（§9）。
- 各步失败的回退（§9 的步骤号）：
  - 第 2 步冒烟失败：回到上一版本的代码（仍读旧密钥，此时有效）。
  - 第 3 步迁移失败：迁移在一个事务里，失败即整体回滚。迁移后冒烟失败：先在 staging 定位；要恢复访问，就为 secret 密钥（service_role）补授所缺的权限，不恢复 anon 的权限——恢复 anon 等于重新打开公开前要关上的门。回退代码只能回到同样读 secret 密钥的版本：读旧密钥的版本在迁移后已无法访问数据库。
  - 第 4 步停用后冒烟失败：重新启用旧密钥只让旧密钥重新有效，不恢复已收回的权限；先查是哪条路径还在用旧密钥。
  - 第 9 步部分分支或 tag 推送失败：以第 8 步记下的远端引用清单逐个核对，补推；任何旧克隆不得再推送（只有 Jason 的本机与 VPS 两份检出，改写后全部重新克隆）。

## 7 不变量

1. anon、authenticated 与 `PUBLIC` 对 `public` 下由 `postgres` 建的任何对象都没有实际生效的权限，迁移新建的对象也没有 —— `supabase/tests/access.sql` 用 `has_table_privilege` / `has_function_privilege` / `has_sequence_privilege` 检查实际权限（§anon-denied、§default-privileges），对线上库在事务内执行。
2. 一份文档的切块按顺序直接连接等于它的全文，相邻切块不重叠，没有一张表格被切开 —— `chunker` 单测（含有无外侧竖线的表格、超长表格、空行、CRLF、无末尾换行、无换行的长段落、短序言），从两个上传入口到 `load-memory` 编号前全文的端到端测试，加上重切后在生产库上的核对（§chunk-partition、§table-chunk）。
3. 显示给用户的每一个条款号都来自本问题的 `R` 或 `D` 证据 —— `citations` 单测与 §citation-text，含链接包住的条款号、`[R1][第二款](…)`、同一句两处非法引用计为 2、裸写的同号"第五条"。
4. "什么算条款的开头"只有一处定义 —— `article-lines` 的单测带一组法规样例行（正文中的交叉引用、换行后的交叉引用、无空格的条款开头、页码行、附件重新编号），并用整份文档核对法规拆分与用户文档拆条款的判定一致，在 CI 中运行；法规拆分的既有单测照常运行。
5. 构建不需要 secret 密钥 —— CI 构建时不提供它。

## 8 外部系统约束

- **Supabase**
  - 新的 secret 密钥与旧的 anon / service_role 密钥可以同时有效；停用旧密钥是项目级开关，可重新启用；staging 与生产共用一个项目。
  - secret 密钥在请求带浏览器 User-Agent 时返回 401（只能在服务端用）。supabase-js 把它当作普通的 key 传入 `createClient` 即可。
  - `postgres` 角色可以改自己的默认权限，不能改 `supabase_admin` 的（`permission denied to change default privileges`，事务内试跑）。`public` 下现有的 12 张表、12 个函数都属于 `postgres`；MCP 执行迁移的身份是 `postgres`。
  - 函数的执行权默认授予 `PUBLIC`；`postgres` 没有全局的函数默认权限条目，即内置默认生效。
  - secret 密钥只能在 Dashboard 新建（MCP 不能）；项目目前没有任何新式密钥。首次新建时平台可能同时生成一把默认的 publishable 密钥（待第 1 步核对），有则删除。
  - 停用旧密钥对 Storage 现有签名链接的影响未实测，第 4 步冒烟时打开一次文档预览核对。
- **GitHub**
  - 私有仓库读不了也设不了 fork PR 审批（API 422）、用不了分支保护（403），所以只能在公开后立即设置。
  - 公开后 Actions 的运行日志人人可见；Secrets 在日志中被遮蔽，仓库变量不会。
  - 改写历史后，旧提交仍可经 12 个 PR（`refs/pull/*` 只读）与按 SHA 的缓存视图访问；客服只清除无法靠更换密钥化解的敏感数据。12 个 PR 中的提交都能从现有分支或 tag 到达，扫描全部分支与 tag 即覆盖它们。
  - 任一工作流运行都会产生运行记录；`ci.yml` 响应 `development` 推送并上传覆盖率产物。
- **VPS**
  - 两个环境都用 `env_file` 把 `.env` / `.env.staging` 送进容器运行时；生产的 compose 文件属 root，deploy 用户改不了，构建参数仍含旧密钥。
  - 生产部署做 `git fetch` 加只允许快进的合并，staging 做 `git pull`；工作区是仓库检出，`.env` 在它的上一级目录。

## 9 发布顺序

第 1–5 步可以回退（方式见 §6）；第 6 步起不可回退，每步执行前由 Jason 确认。

1. 在 Dashboard 新建两把 secret 密钥（`staging`、`production`），分别写进两个环境的环境文件，`production` 那把同时写进本机 `.env.scripts`；有默认 publishable 密钥则删除。此时旧密钥仍有效，线上照常。然后在本机用新代码运行重切脚本（先备份 `document_chunks`；基准与停止条件见 §6；`apply` 运行期间不做管理员上传），跑 §chunk-partition、§table-chunk。旧版本应用读不重叠的切块照常工作。重切先于新代码上线：新代码的 `D` 编号若读到旧的重叠切块，会把唯一的条款误判为重复。
2. 新代码（读 `SUPABASE_SECRET_KEY`）先上 staging，冒烟通过、线上 SHA 与部署的提交一致，再上生产，同样核对。此时旧密钥仍有效，两个环境都已不再读它。
3. 执行权限迁移；两个环境各冒烟一次（§env-smoke）；跑 `access.sql`（§anon-denied、§default-privileges、§rls-all）。不在第 2 步之前执行：旧版本应用读的是 anon 密钥，迁移一执行，两个环境就同时读写不了数据库。
4. 停用旧密钥（可重新启用）；跑 §legacy-keys-disabled；两个环境各冒烟一次，含打开一次文档预览。
5. 镜像备份到 `GOODMAN_DATA_DIR`；从备份克隆一次，提交数、分支与 tag 清单与远端一致（§history-backup）。
6. 改写前扫描：gitleaks（钉版本与 sha256）以 `--log-opts=--all` 扫全部引用，开 `--redact`，报告存 `GOODMAN_DATA_DIR`；每条命中给出结论，仍有效的先更换；有无法定性的命中则停止。
7. 在另一份副本上用 `git filter-repo` 改写全部分支与 tag（邮箱 → noreply，路径清单中的路径 → 占位符）；在副本上先验收 §history-emails、§history-internals，再扫描一次（§audit-findings）。
8. 停用全部 3 个工作流；记下远端分支与 tag 清单；强推；逐个核对远端引用与副本一致。
9. VPS 上两份检出重新克隆；手动触发一次 staging 与生产部署，核对线上 SHA（§deploy-after-rewrite）；再次停用工作流，等全部运行结束；删除全部运行记录与产物，分页计数为 0（§actions-cleared）。
10. Jason 同意后公开；立即设置 fork PR 审批、私密漏洞报告、密钥扫描与推送保护，读回设置（§public-settings）；最后恢复工作流。

## 10 开放设计问题

无。
