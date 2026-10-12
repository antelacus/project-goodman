# TRACK — maintenance v4.6.4

## 一、范围与裁定

- 模式：maintenance · 目标：运行时升级至 Node 26，清除依赖安全公告，行为不变
- 范围：
  1. Node 版本只写在 `.nvmrc`；CI 经 `node-version-file` 读取；Dockerfile 三个阶段改用 `node:26-bookworm-slim`
  2. npm 11 默认拦截依赖安装脚本：`package.json` 的 `allowScripts` 批准 `canvas`（仅 `/api/documents/pdf-preview` 运行时动态导入，未编译则仅在调用时报错；该路由已无调用方 → TD-029），拒绝 esbuild / fsevents / unrs-resolver（已验证不需要）
  3. 依赖安全：Next 16.3.5 → 16.4.0；`eslint-config-next` 对齐至 16，ESLint 配置改为原生 flat config，删除 `@eslint/eslintrc`；`basic-ftp` 经 override 升至已修复版本；`braces` 链无上游修复，入 audit 允许清单
  4. 旧值清扫：CLAUDE.md / README / AGENTS.md / `next.config.ts` 注释 / about 页技术栈标签去掉版本号
  5. `.mcp.json` 加入 `.gitignore`
  6. Playwright 1.57 → 1.64：1.60 之前的版本在 Node 26 上解压浏览器时卡死（CI 卡在 `playwright install` 65 分钟）；CI job 加 `timeout-minutes: 20`
- 明确不做：CI 拦截部署、构建一次推广镜像、served SHA、密钥移出构建参数、Dependabot、EOL 检查（全部属于 v4.7.0 发布流水线移植）；旧技术债裁定（v4.7.0 Phase 0）；TD-028 的 12 处修复
- 全局约束：
  - 版本地板：Node → `.nvmrc`；依赖 → `package.json`
  - The Floor：本版不接触生产数据；部署沿用现有 development → main 流程，合并 main 前人工确认 CI 为绿（CI 拦截部署尚未实现）
- 裁定：
  - 2026-10-12 · CI 与生产直接上 Node 26（不等 10-28 转 LTS） · Jason · 级联：无
  - 2026-10-12 · 先升级 Node，再修 CI 拦截部署 · Jason · 级联：v4.7.0
  - 2026-10-12 · goodman 改用 antelacus 的分支模式与发布流水线，走标准模式 · Jason · 级联：v4.7.0（ADR 于 v4.7.0 写入）
  - 2026-10-12 · Dependabot 只开安全提醒 · Jason · 级联：custom-conventions §2、v4.7.0
  - 2026-10-12 · Next 安全修复并入本版，不另开 hotfix · Claude 提议，Jason 选方案 B 时以此为前提 · 级联：无
  - 2026-10-12 · `react-hooks/set-state-in-effect` 暂降为 warn（方案 B） · Jason · 级联：TD-028
  - 2026-10-12 · 技术债默认修复，接受须写明实际原因；已解决条目删除 · Jason · 级联：v4.7.0 Phase 0

## 三、门与发布

**评审发现登记**：本版不触发 Codex（无新写的输出相关代码）；diff 触及 `src/` 仅为 about 页两处文案，不跑 `/code-review`。

**Phase 4 证据**：
- 本地 Node 26.8.2，干净 `npm ci`：lint 0 error（12 warning = TD-028）· `tsc` 通过 · vitest 65 文件 / 272 测试通过 · audit 门通过 · `next build` 通过
- Docker 演练（本机 arm64，VPS 为 amd64）：镜像构建通过；容器内 Node 26.11.1、`canvas` 可加载、Next 16.4.0；启动后页面 200，health 仅因占位数据库 503
- CI 首跑（`48f8b1b`）：卡在 `playwright install chromium`，本地 Node 26 复现（下载 100% 后解压停滞），升级 Playwright 后 20 秒装完。本地 Phase 4 没拦住：本机已缓存浏览器，安装步骤从未执行
- CI（`6a1eba0`）：全绿 · Playwright 安装 13s · perf / Lighthouse / a11y 门通过 · E2E 3/3 通过（非阻断，TD-027）· audit · build
- staging 部署 + 冒烟（`48f8b1b` 与 `6a1eba0`，VPS amd64 构建，两次结果相同）：通过 · health `healthy`、`version` 4.6.4、database / redis ok · 冒烟四项（health、管理员登录、sessions API、报告生成）通过
- staging 关键业务路径端到端（上传 PDF → 预览 → 生成报告）：Jason 在 UI 上走通，三步均通过

**本版观察题**：哪些步骤从头到尾没用到 Jason 的判断，或从未拦下任何东西。

**Phase 6 boxes**：
- [ ] CHANGELOG 条目
- [ ] TECHNICAL_DEBT 定稿
- [ ] 旧值清扫（`node:20`、`Next.js 15`）
- [ ] tag `v4.6.4`
- [ ] 生产部署 + 核对 served SHA（health 只报 package 版本号、不报提交；本版以 health 的 `version` 为 4.6.4 加 VPS 上 `git rev-parse HEAD` 代替）
- [ ] 各门读数：运行次数 / 改变了输出的拦截次数
- [ ] **关版（最后一项）**：未了事项各归其位 → `git mv TRACK.md TRACK_v4.6.4.md`
