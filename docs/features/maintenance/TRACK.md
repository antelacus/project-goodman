# TRACK — maintenance v4.7.2

## 一、范围与裁定

- 模式：maintenance · 目标：关掉 Next.js 的远程代码执行漏洞，用户可见行为不变
- 范围：
  1. `next` ^16.1.6（锁定 16.4.0）→ ^16.4.3，`eslint-config-next` 随之对齐：GHSA-673q-mjm6-r5xr（`use cache` 返回多个 typed array 时无需认证的远程代码执行，CVSS 9.5，16.0.0–16.4.0 受影响）。同一批发布还修了经 sharp 的图片优化内存漏洞与 Server Actions 的拒绝服务
  2. `body-parser` 1.20.8 → 1.20.9（仅开发依赖 `@lhci/cli` → `express`，兼容范围内更新）
  3. `zod`、`openai`、`chromium-bidi` 入 audit 允许清单，到期 2026-11-15：GHSA-mrhx-c7xc-m3w5（数组 schema 无长度上限时内存耗尽）只在 zod 4 修复；后两者只是因为依赖 zod 3 被连带标出。迁移登记为 TD-035，在 v4.7.3 做
- 明确不做：zod 4 迁移（v4.7.3）；Trivy 镜像扫描（镜像仍在 VPS 上构建，CI 里扫不到上线的那一份，放进发布流水线版本）
- 全局约束：
  - 版本地板：Node → `.nvmrc`（26，镜像内 26.12.1 已含 Node 2026-10-21 安全修复）；依赖 → `package.json`
  - 本版不含数据库迁移
  - staging 冒烟会在生产库写入一个会话和 2 条消息（`docs/features/release-pipeline/TRACK.md` 外部约束），本版不改变这一点
- 裁定：
  - 2026-10-29 · 两个公网站点的 Next.js 安全修复按 maintenance 模式做，antelacus 先、goodman 后 · Jason · 级联：无
  - 2026-10-29 · zod 走方案 A：本版只修 Next，zod / openai / chromium-bidi 入允许清单至 2026-11-15，zod 4 迁移单独作 v4.7.3（Codex 上线前审查） · Jason · 级联：`tests/quality-baselines/audit/audit-allowlist.json`、`docs/TECHNICAL_DEBT.md` TD-035
  - 2026-10-29 · goodman 的 Trivy 镜像扫描放进发布流水线版本 · Jason · 级联：`docs/features/release-pipeline/TRACK.md` 范围 3

## 三、门与发布

**评审发现登记**：maintenance 模式不触发 Codex；改动不涉及源码，不跑 `/code-review`。

**Phase 4 证据**：
- 本地：`npm run test:audit` 通过（新增 3 条允许项）；lint 0 错误、16 条警告（与 `main` 上次 CI 相同，TD-028 等既有项）；`tsc` 通过；vitest 69 个文件、314 个测试全过

**Phase 6 boxes**：
- [x] CHANGELOG 条目
- [ ] TECHNICAL_DEBT 定稿
- [x] 旧值扫尾：`16.4.0` 在 CHANGELOG 与冻结文档之外无出处
- [ ] staging：`development` 快进到本分支，部署冒烟与 CI 通过；一次真实问题经 staging 对话接口
- [ ] 生产部署 + 核对 served 版本；容器内 `next` 16.4.3
- [ ] tag `v4.7.2`
- [ ] 各门读数：运行次数 / 改变了输出的拦截次数
- [ ] **关版（最后一项）**：未了事项各归其位 → `git mv TRACK.md TRACK_v4.7.2.md`
