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
| `src/lib/extraction/article-lines.ts`（新） | "什么算条款的开头"：一行是否以条款号开头、条款号是什么。法规拆分与用户文档拆条款共用；遇到重复怎么办不在这里 | core |
| `src/lib/extraction/regulation-splitter.ts` | 法规拆分：用 `article-lines` 判定，重复条款号仍让上传失败 | core |
| `src/lib/citations/` | 证据的显示与核对：给用户文档按条发 `D` 编号；`finalizeAnswer` 把有效编号换成出处、把未核实的那一处换成删除标记、计数 | core |
| `src/lib/workflows/core/nodes/load-memory.ts` | 读选中文档的切块、拼成全文，交给 `citations` 编号，把编号后的文本与 `D` 证据放进本问题的状态 | IO |
| `src/lib/workflows/core/nodes/finalize-answer.ts`、流式路由 | 把删除次数作为过程事件发出 | IO |
| `src/app/api/admin/upload-database-document/route.ts` | 非法规知识文档含条款开头的行时，上传结果带提示 | IO |
| `scripts/rechunk-documents.ts`（一次性） | 还原已入库文档的原文、按新规则重切；本版关版前删除 | IO |
| `.github/workflows/deploy*.yml`、`docs/` 运维文档 | 路径改读 Secrets / 写成变量名 | infra |

依赖方向：`citations` 与 `chunker` 不依赖数据库，也不依赖工作流；`regulation-splitter` 与 `citations` 都依赖 `article-lines`，`article-lines` 不依赖任何一方。

### 2.2 数据流

```
选中文档：document_chunks（按 chunk_index）──拼接──▶ 全文（与原文一致，§7 不变量 2）
        ──citations.numberDocument──▶ 带 [Dn] 的文本 + D 证据 ──▶ 模型
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

- **证据**：`{ id, kind: 'regulation' | 'user_document', name, articleNumber, documentId, fileUrl }`。显示：`regulation` →《名》第X条；`user_document` →《文件名去扩展名》（您上传的文档）第X条。两种都带链接。
- **`citations.numberDocument(document)`**：输入文档的 id、文件名与全文；输出带编号的文本和 `D` 证据。编号写在每条条款开头那一行之前。同一份文档里出现两次以上的条款号，这几条都不编号；没有条款开头的文档原样返回、没有证据。编号在本问题内唯一，与 `R` 互不重叠。
- **`finalizeAnswer`**：入参增加 `D` 证据；返回 `{ text, cited, removed }`，不再在文末追加汇总。资料库外标注只看 `cited` 里有没有 `regulation`。每一处未核实内容替换为 `〔未经核实的引用，已删去〕`，不删句子。
- **切块**：`chunk(text) → string[]`，按顺序拼起来等于 `text`。切点只落在行尾；一张 Markdown 表格（连续的以 `|` 开头的行）整块放进一个切块，比切块长度长也不切。不切而不是续块带表头：现有 50 张表最长 568 字，都不超过切块长度 1000 字；续块带表头要加列、改生成列、重建索引，读切块的地方还都得补表头。
- **`createServerSupabaseClient()`**：签名不变，36 处调用不动；读 `SUPABASE_SECRET_KEY`，缺失即抛错，不回退。
- **过程事件**：增加一种事件，带本次回答被删去的处数（为 0 时不发）。

## 5 持久化数据

- `document_chunks`：一行 = 一份文档的一个切块；结构不变，只是内容按新规则重切。
- 权限：新迁移收回 anon / authenticated 对 `public` 下表、函数、序列的全部授权，收回 `postgres` 在 `public` 的默认权限；`users`、`guest_activity` 开启 RLS，不加策略（只有 secret 密钥访问，它不受 RLS 限制）。
- 环境变量：新增 `SUPABASE_SECRET_KEY`（运行时经 `env_file` 进容器，不作构建参数）。停用旧密钥后，`NEXT_PUBLIC_SUPABASE_ANON_KEY` 与 `SUPABASE_SERVICE_ROLE_KEY` 从代码、`.env` 与 GitHub Secrets 中删去；构建参数里的旧值失效后留给发布流水线清理。新增 `GOODMAN_DATA_DIR`：仓库外私有目录，存放部署路径文件与镜像备份。

## 6 异常流

- 缺 `SUPABASE_SECRET_KEY` → 首次访问数据库时抛错（fail-closed）。不回退到旧密钥：回退会让"已经切过去"在核实时看起来成立。
- 迁移执行后，带旧密钥的旧版本应用仍在运行：读写全部被拒。所以迁移在新版本两环境都上线之后才执行（§9）。
- 选中文档读取切块失败：沿用现有的文档加载错误事件，不编号。
- 重切脚本：每份文档的删旧与插新在同一个事务里；还原出的原文与切块数不一致时，这份文档停下、报出，不写入。
- 历史改写后强推 `main`：生产部署那一步做的是只允许快进的合并，会响亮失败，不会部署错误的代码；VPS 重新克隆之后再部署（§9）。

## 7 不变量

1. anon 与 authenticated 对 `public` 下任何对象都没有权限，迁移新建的对象也没有 —— 验收 SQL（§anon-denied、§default-privileges），对线上库执行。
2. 一份文档的切块按顺序拼起来等于它的全文，相邻切块不重叠，没有一张表格被切开 —— `chunker` 单测（含表格、超长表格、空行、无换行的长段落），加上重切后在生产库上的核对（§chunk-partition、§table-chunk）。
3. 显示给用户的每一个条款号都来自本问题的 `R` 或 `D` 证据 —— `citations` 单测与 §citation-text。
4. "什么算条款的开头"只有一处定义 —— `article-lines` 的单测带一组法规样例行（含正文中的交叉引用、无空格的条款开头、页码行），在 CI 中运行；法规拆分的既有单测照常运行。
5. 构建不需要 secret 密钥 —— CI 构建时不提供它。

## 8 外部系统约束

- **Supabase**
  - 新的 secret 密钥与旧的 anon / service_role 密钥可以同时有效；停用旧密钥是项目级开关，可重新启用；staging 与生产共用一个项目。
  - secret 密钥在请求带浏览器 User-Agent 时返回 401（只能在服务端用）。supabase-js 把它当作普通的 key 传入 `createClient` 即可。
  - `postgres` 角色可以改自己的默认权限，不能改 `supabase_admin` 的（`permission denied to change default privileges`，事务内试跑）。`public` 下现有的 12 张表、12 个函数都属于 `postgres`；由 `supabase_admin` 新建的对象仍会默认授予 anon，靠不变量 1 的验收 SQL 发现。
  - secret 密钥只能在 Dashboard 新建（MCP 不能）；项目目前没有任何新式密钥。
- **GitHub**
  - 私有仓库读不了也设不了 fork PR 审批（API 422）、用不了分支保护（403），所以只能在公开后立即设置。
  - 公开后 Actions 的运行日志人人可见；Secrets 在日志中被遮蔽，仓库变量不会。
  - 改写历史后，旧提交仍可经 12 个 PR（`refs/pull/*` 只读）与按 SHA 的缓存视图访问；客服只清除无法靠更换密钥化解的敏感数据。
- **VPS**
  - 两个环境都用 `env_file` 把 `.env` / `.env.staging` 送进容器运行时；生产的 compose 文件属 root，deploy 用户改不了，构建参数仍含旧密钥。
  - 部署时 VPS 上做 `git fetch` 加只允许快进的合并；它的工作区是仓库检出，`.env` 在它的上一级目录。

## 9 发布顺序

前 5 步可以回退；第 6 步起不可回退，每步执行前由 Jason 确认。

1. 在 Dashboard 新建两把 secret 密钥（`staging`、`production`），写进两个环境的 `.env` 文件。
2. 新代码（读 `SUPABASE_SECRET_KEY`）先上 staging，冒烟通过，再上生产，核对线上版本。此时旧密钥仍有效，两个环境都已不再读它。
3. 执行权限迁移；两个环境各冒烟一次（§env-smoke）；跑 §anon-denied、§default-privileges、§rls-all。
4. 停用旧密钥（可重新启用）；跑 §legacy-keys-disabled；两个环境各冒烟一次。
5. 重切已入库文档（先备份 `document_chunks`）；跑 §chunk-partition、§table-chunk。
6. 镜像备份到 `GOODMAN_DATA_DIR`；改写前做一次泄密扫描（gitleaks，钉版本与 sha256）。
7. 删除全部 Actions 运行记录与产物。
8. 暂停 `deploy.yml` 与 `deploy-staging.yml`；用 `git filter-repo` 改写全部分支与 tag（邮箱 → noreply，VPS 路径 → 占位符）；强推。
9. VPS 上两份检出重新克隆；恢复工作流；两个环境各部署一次（§deploy-after-rewrite）；改写后再扫描一次（§audit-findings）。
10. Jason 同意后公开；立即设置 fork PR 审批、私密漏洞报告、密钥扫描与推送保护（§public-settings）。

不在第 2 步之前执行迁移：旧版本应用读的是 anon 密钥，迁移一执行，两个环境就同时读写不了数据库。

## 10 开放设计问题

无。
