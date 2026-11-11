# REQ — public-readiness

## 1 概述

### 1.1 需求背景 [冻结]

goodman 要改为公开仓库：一是发布流水线要用分支保护，而私有仓库在 GitHub 免费档上用不了；二是要给招聘方看代码。公开前的仓库有四个问题：服务端用 anon 密钥访问数据库，而 anon 对 `public` 下所有表都能读写，`users` 表的密码哈希也在其中，这道防线只靠 anon 密钥不外泄，而 Supabase 本身把 anon 密钥当作可公开的密钥；提交历史里有个人邮箱；文档与工作流里写着服务器的内部细节；仓库带着 AGPL-3.0 许可证，与"公开仅供查看"的意图不符。

### 1.2 范围

- 做：
  - 数据库访问收紧：服务端改用新的 secret 密钥，停用旧密钥，anon / authenticated 不再有任何权限
  - 三个 API 路由补输入验证
  - 公开内容：删除许可证，README 改写给外部读者，去掉服务器内部细节，安全联系改用 GitHub 私密漏洞报告
  - 改写全部提交历史，删除全部 Actions 运行记录
  - 泄密审计
  - 公开仓库，并完成公开后的设置
  - 内部清理：删除无调用方的 PDF 预览路由及其依赖（TD-029）、工具转换中无调用方的选项（TD-038）
- 明确不做：
  - 发布流水线的全部内容，包括 staging 与生产的数据隔离、`Dockerfile` 构建参数中的密钥（镜像不出 VPS，不随公开暴露），见 `docs/features/release-pipeline/TRACK.md`
  - 清除 12 个 PR 中保留的旧提交（见 §5.4）
  - antelacus 仓库中的部署信息

### 1.3 参考

- 裁定与现状核对：`TRACK.md`
- 技术债：`docs/TECHNICAL_DEBT.md` TD-032、TD-023、TD-029、TD-038
- GitHub《Removing sensitive data from a repository》：改写历史后旧提交仍可经 PR 访问

### 1.4 术语

N/A —— secret / publishable 密钥、旧的 anon / service_role 密钥沿用 Supabase 的叫法。

## 2 上下文图

```
外部读者（招聘方、贡献者、安全研究者）──▶ GitHub：antelacus/project-goodman（公开）
                                              │ Jason 推送；fork PR 的工作流须经批准
                                              ▼
                                      GitHub Actions ──SSH──▶ VPS（staging / 生产）
                                                                 │ secret 密钥（各一把）
                                                                 ▼
                                                        Supabase（两环境共用一个项目）
```

## 3 用例

- 招聘方打开仓库，从 README 了解这是什么、在哪能看到产品、文档在哪。
- 外部贡献者 fork 后提 PR：工作流在 Jason 批准前不运行。
- 安全研究者经 GitHub 私密漏洞报告提交问题，不需要知道任何人的邮箱。
- 有人拿到旧的 anon 密钥（例如从历史或旧镜像中）：它已失效，读不到任何数据。

## 4 功能列表

| 编号 | 功能 | 一句话说明 | 优先级 |
|------|------|-----------|--------|
| F1 | 数据库访问收紧 | secret 密钥、停用旧密钥、收回 anon 权限、全部表开 RLS | P0 |
| F2 | 输入验证 | 三个路由的输入经 Zod 验证 | P1 |
| F3 | 公开内容 | 许可证、README、去掉服务器内部细节、安全联系 | P0 |
| F4 | 历史改写 | 邮箱换 noreply、内部细节换占位符、删除运行记录 | P0 |
| F5 | 泄密审计 | 全部历史扫描，每条命中有结论 | P0 |
| F6 | 公开 | 满足前提后公开，随即完成公开后的设置 | P0 |

## 5 功能需求

### 5.1 数据库访问收紧（F1）

- 规则：
  - 服务端访问数据库与 Storage 只用 secret 密钥。staging 与生产各一把（名为 `staging` / `production`），任一把可以单独撤销。不用旧的 service_role 密钥：旧密钥是以项目 JWT 密钥签发的令牌，无法单独撤销或轮换。
  - 旧的 anon 与 service_role 密钥停用。项目不发 publishable 密钥：没有任何浏览器端直连数据库的代码。
  - anon 与 authenticated 对 `public` 下的表、函数、序列没有任何权限；`public` 的默认权限同样收回，今后的迁移新建的对象也不授予它们。只收回现有对象的授权不够：默认权限会让下一条迁移重新开放。
  - `public` 下每张表都开启 RLS，包括 `users` 与 `guest_activity`。
  - 停用旧密钥只在 staging 与生产都已改用 secret 密钥、并各自核实之后执行：两环境共用一个项目，提前停用会让两边同时连不上数据库。
- 硬错误（响亮失败）：服务端缺少 secret 密钥 → 报错并指出缺少的环境变量，不回退到其他密钥
- 验收判据：
  - §anon-denied 以 anon 与 authenticated 身份，对 `public` 下每张表的读与写、每个函数的执行都被拒绝
  - §default-privileges 新建一张表与一个函数后，anon 与 authenticated 对它们没有任何权限
  - §rls-all `public` 下每张表都开启 RLS；Supabase 安全检查没有"表未开 RLS"与"anon / authenticated 可执行 SECURITY DEFINER 函数"两类提示
  - §legacy-keys-disabled 用旧的 anon 密钥与旧的 service_role 密钥请求 REST 接口，均被拒绝
  - §server-secret-key 服务端代码不再读取旧密钥的环境变量；缺少 secret 密钥时报错，不回退
  - §env-smoke 改用 secret 密钥后，staging 与生产的冒烟各通过一次（含一次真实报告生成）

### 5.2 输入验证（F2）

- 规则：`/api/documents/preview-url` 的查询参数、`/api/sessions/[id]` 的路径参数（UUID）、`/api/admin/upload-database-document` 的请求体，都经 Zod 验证；不合格的输入在进入业务逻辑之前被拒绝。
- 硬错误：输入不合格 → 400，响应为标准格式 `{ success: false, error }`
- 验收判据：
  - §input-validation 三个路由各以一例不合格输入请求，均返回 400 与标准格式的错误，且没有调用数据库

### 5.3 公开内容（F3）

- 规则：
  - 不放许可证：没有 `LICENSE` 文件，`package.json` 的 license 为 `UNLICENSED`，README 写明"保留所有权利"，公开仅供查看。
  - README 写给外部读者（招聘方）：这是什么、在哪能看到产品（`goodman.antelacus.com`）、文档在哪。只做地图，不重复其他文档的内容；功能细节交给落地页。
  - 仓库中不出现服务器内部细节，即 VPS 上的文件系统路径与目录结构；SSH 连接信息本就只在 GitHub Secrets 中。端口分配、nginx 配置、容器名是常见的技术配置，可以保留。工作流需要的路径放 GitHub Secrets：公开仓库的运行日志人人可见，Secrets 在日志中被遮蔽，仓库变量不会。部署说明留在仓库，其中的路径写成变量名，真实值只在仓库外的一个私有文件中（文件位置由 `.env` 中的环境变量给出）。产品网址可以出现。
  - 安全联系改用 GitHub 私密漏洞报告，仓库中不出现个人邮箱。
- 验收判据：
  - §no-license 仓库中没有 `LICENSE` 文件，`package.json` 的 license 为 `UNLICENSED`，README 含"保留所有权利"
  - §no-internals 当前文件中检索不到 VPS 上的部署路径（检索用的路径清单放在仓库外的私有文件中：清单本身就是要隐藏的内容）
  - §no-personal-email 当前文件中没有个人邮箱；安全联系指向 GitHub 私密漏洞报告

### 5.4 历史改写（F4）

- 规则：
  - 改写全部分支与 tag 的历史：作者与提交者的邮箱换成 GitHub noreply 地址；§5.3 清单中的服务器内部细节替换为占位符。已冻结的文档同样被替换：这是脱敏，不是改动它记录的事实。
  - 改写前，把仓库完整镜像备份到仓库外的私有目录。
  - 改写后，VPS 上的两份检出重新克隆，staging 与生产各成功部署一次。强推 `main` 会触发生产部署，而旧检出拉不下改写后的历史：改写与重新克隆的顺序由 DESIGN 规定。
  - 12 个 PR 仍保留改写前的旧提交（GitHub 把 `refs/pull/*` 设为只读；客服只清除无法靠更换密钥化解的敏感数据）。这是接受的残留：PR 中的旧提交含个人邮箱与服务器内部细节，不含仍然有效的密钥（由 §5.5 保证）。
  - 今后的提交只用 noreply 邮箱。
  - 全部 Actions 运行记录与产物在公开前删除。
- 验收判据：
  - §history-emails 全部分支与 tag 的提交中，作者与提交者邮箱只有 noreply 地址
  - §history-internals 全部分支与 tag 的历史中检索不到 VPS 上的部署路径（同一份私有清单）
  - §history-backup 镜像备份可以克隆，提交数与改写前一致
  - §deploy-after-rewrite 改写后 staging 与生产各部署一次，健康检查报出的版本与提交都是改写后的
  - §actions-cleared 仓库的 Actions 运行记录数与产物数均为 0

### 5.5 泄密审计（F5）

- 规则：
  - 在改写前，对全部分支与 tag 的历史做密钥扫描；改写后再扫一次。
  - 每条命中都有结论：占位值、已失效（例如已删除项目的密钥）、或仍然有效。仍然有效的必须在公开前更换。只改写历史不够：12 个 PR 仍保留旧提交（§5.4）。
  - 审计只记录命中的位置、类型与前缀，不读出密钥的值，也不用历史中的密钥去验证它是否有效。
- 验收判据：
  - §audit-findings 两次扫描的每条命中都有结论；没有结论为"仍然有效且未更换"的命中

### 5.6 公开（F6）

- 规则：
  - 前提全部满足后才公开：v4.8.0 已在生产上线并核实；§5.1 的验收判据全部通过；§5.4 完成；§5.5 没有未更换的有效密钥；Jason 明确同意。公开不可撤回。
  - 公开后立即：fork PR 的工作流对所有外部贡献者都须经批准；开启私密漏洞报告；开启密钥扫描与推送保护。fork PR 审批在私有仓库上无法预先设置，所以只能紧接着公开执行。
- 验收判据：
  - §public-settings 公开后，经 GitHub API 读出：仓库为公开，fork PR 审批为"所有外部贡献者"，私密漏洞报告、密钥扫描、推送保护均已开启

## 6 其他需求

### 6.1 数据与安全

- secret 密钥只在 VPS 的环境文件中，不进代码、不进对话、不进构建参数之外的任何地方（构建参数中的密钥属于发布流水线）。
- 镜像备份含改写前的全部历史（个人邮箱与服务器内部细节），只存放在仓库外的私有目录，不推送到任何远端。
- 数据库核对只读结构与授权，不读行内容。

## 7 对外接口

- **GitHub 仓库**（输出）：公开后对所有人可见的内容是当前文件与改写后的历史；读者是招聘方、贡献者与安全研究者。
- **Supabase API 密钥**（输入）：服务端只认 secret 密钥；旧密钥停用后，带旧密钥的请求一律被拒。

## 8 待确认事项

无。
