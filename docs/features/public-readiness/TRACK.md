# TRACK — public-readiness v4.8.0

## 一、范围与裁定

- 模式：standard · 目标：仓库可以安全公开——拿到 anon 密钥的人不再能读写数据库，历史与 Actions 里没有可用的密钥——然后公开
- 范围：
  1. TD-032：服务端访问数据库改用服务端密钥；收回 anon / authenticated 对 `public` 表与函数的权限；`users`、`guest_activity` 开启 RLS；`.claude/rules/code-conventions.md` 的 RLS 一节随之改正
  2. TD-023：三个路由补 Zod 验证
  3. TD-029：删除无调用方的 PDF 预览路由及 `canvas` / `pdfjs-dist`
  4. 删除许可证（`LICENSE`、`package.json` 改 `UNLICENSED`、README 改"保留所有权利"）
  5. 泄密审计：全部提交历史；Actions 运行日志与产物
  6. 公开：TD-032 在生产核实、审计通过、Jason 明确同意后，把仓库改为公开，随即设置 fork PR 的工作流须经批准
- 明确不做：发布流水线的全部内容（`docs/features/release-pipeline/TRACK.md`），包括 staging 数据隔离、`Dockerfile` 构建参数中的密钥（镜像不出 VPS，不随公开暴露）、TD-031、TD-027；TD-024、TD-026
- 全局约束：
  - 版本地板：Node → `.nvmrc`；依赖 → `package.json`
  - 外部约束（DESIGN 开写后迁入其外部约束一节）：
    - GitHub：私有仓库读不了也设不了 fork PR 审批（API 422）、用不了分支保护（403），所以 fork PR 审批只能在公开之后立即设置；公开后，Actions 的运行日志与未过期产物对所有人可见
    - Supabase：新的 secret / publishable 密钥与旧的 anon / service_role JWT 密钥可以同时有效；停用旧密钥是项目级开关（可重新启用），staging 与生产共用一个项目，会同时受影响
  - 现状（2026-11-04 核实）：`createServerSupabaseClient` 36 处调用、25 个文件；用 service_role 的只有 `src/lib/documents/storage.ts`、`src/lib/reports/docx-upload.ts`、`pdf-upload.ts`。GitHub Actions：128 次运行，24 个未过期产物，全部是 `coverage-report`；仓库 Secrets 只有部署所需的 4 个、`NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。本地 `.env` 的 Supabase 密钥是占位值
  - 待核（Phase 1 结束前）：数据库当前的授权、RLS 与 `SECURITY DEFINER` 函数（需 Supabase MCP 重新认证）；VPS 上生产与 staging 的 `.env` 中密钥的角色、是否仍指向同一项目（需 Jason 授权只读 SSH 核对，或由 Jason 自己执行）
  - The Floor：审计只数命中、看前缀，不读出密钥的值；不用历史里的凭据去验证它是否有效；数据库核对只读结构与授权，不读行内容
- 裁定：
  - 2026-10-19 · goodman 改为公开仓库，作为分支保护的前提；公开在审计通过之后执行 · Jason · 级联：本 TRACK 范围 6
  - 2026-10-19 · 历史中 2025-07 的 service_role 密钥（`setup-storage.js`，项目 `moivfobm…`）属于已删除的 Supabase 项目、已失效，保留在历史中，不改写历史 · Jason · 级联：本 TRACK 范围 5
  - 2026-10-19 · 不放许可证：删除 AGPL-3.0；公开仅供查看 · Jason · 级联：本 TRACK 范围 4
  - 2026-10-20 · TD-032 在仓库公开之前修复 · Jason · 级联：`docs/TECHNICAL_DEBT.md`、本 TRACK 范围 1
  - 2026-11-04 · 从发布流水线拆出本版，先于流水线；上面四条 10-19 / 10-20 裁定随之迁入 · Jason · 级联：`docs/features/release-pipeline/TRACK.md`、`v4_DEVELOPMENT_PLAN.md` §3.13

## 二、批次

（Phase 2 切分）

## 三、门与发布

**评审发现登记**：（Phase 2 起）

**Phase 4 证据**：（Phase 4）

## 四、Session-end pickup
