# Git 操作指南

> **文档用途**: 这是一份面向版本控制新手的实用 Git 参考。涵盖日常操作、分支策略和常见场景。
>
> *来源: Project Goodman (2025)*

---

## Git 是什么？

把 Git 想象成代码的**时光机 + 平行宇宙管理器**：

- **时光机**: 保存快照（commit），随时可以回到过去
- **平行宇宙**: 同时处理不同功能（branch）
- **协作**: 与远程仓库（GitHub）同步你的工作

---

## 核心概念

### 仓库 (Repository)
被 Git 追踪的文件夹。包含你的代码及其完整历史。

### 提交 (Commit)
代码在某个时间点的快照。就像游戏中的存档点。

### 分支 (Branch)
代码的平行版本。默认分支通常是 `main`。

### 远程 (Remote)
仓库在服务器上的副本（如 GitHub）。

```
本地 (你的电脑)              远程 (GitHub)
       │                          │
    [main] ◄────── pull ──────► [main]
       │                          │
 [feature/x] ───── push ────► [feature/x]
```

---

## 多设备开发工作流

> **适用场景**: 使用 macOS (iTerm2 + VS Code) 连接 VPS 开发，Git 作为同步中介。

### 架构示意

```
┌─────────────────┐         ┌─────────────────┐
│  本地 Mac       │         │     VPS         │
│  (iTerm2/VSCode)│         │  (生产/开发环境) │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │    push                   │ pull
         ▼                           ▼
    ┌─────────────────────────────────────┐
    │           GitHub (远程仓库)          │
    │         作为中央同步点               │
    └─────────────────────────────────────┘
```

### 典型工作流程

**在本地 Mac 开发**:
```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发、测试、提交
git add .
git commit -m "feat: add new feature"

# 3. 推送到 GitHub
git push -u origin feature/new-feature
```

**在 VPS 上部署/测试**:
```bash
# 1. 拉取最新代码
git fetch origin
git checkout feature/new-feature
git pull origin feature/new-feature

# 2. 测试/运行
npm run build
npm run start

# 3. 如果在 VPS 上做了修改
git add .
git commit -m "fix: adjust for production"
git push origin feature/new-feature
```

**回到本地 Mac 继续开发**:
```bash
# 同步 VPS 上的修改
git pull origin feature/new-feature
```

### 关键原则

1. **永远先 pull 再 push**: 避免冲突
2. **在同一分支工作**: 本地和 VPS 使用相同分支
3. **小步提交**: 频繁 commit，便于同步
4. **有意义的 commit 消息**: 方便追踪在哪里做了什么

### SSH 配置建议

为了方便在多设备间使用 Git：

```bash
# 在每台设备上生成 SSH 密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 将公钥添加到 GitHub
cat ~/.ssh/id_ed25519.pub
# 复制输出，添加到 GitHub Settings → SSH Keys

# 测试连接
ssh -T git@github.com
```

---

## 日常操作

### 1. 开始新工作

```bash
# 确保在 main 分支且是最新的
git checkout main
git pull origin main

# 创建新分支
git checkout -b feature/your-feature-name
```

**分支命名规范**:
```
feature/xxx   → 新功能
fix/xxx       → Bug 修复
docs/xxx      → 仅文档
refactor/xxx  → 代码重构
```

**示例**:
```bash
git checkout -b feature/user-authentication
git checkout -b fix/login-error
git checkout -b docs/update-readme
```

---

### 2. 保存进度（Commit）

```bash
# 查看哪些文件变更了
git status

# 查看具体变更（逐行）
git diff

# 暂存特定文件
git add filename.ts

# 暂存所有变更
git add .

# 提交
git commit -m "feat(auth): add password validation"
```

**何时提交**:
- ✅ 完成了一个逻辑单元的工作
- ✅ 准备休息之前
- ✅ 尝试有风险的操作之前
- ❌ 不要提交损坏的代码
- ❌ 不要用模糊的消息

---

### 3. Commit 消息格式

遵循 **Conventional Commits**:

```
type(scope): 简短描述

示例:
feat(auth): add password validation
fix(upload): resolve Excel parsing error
docs(readme): update installation guide
refactor(api): simplify validation logic
test(auth): add unit tests for login
chore(deps): update dependencies
```

**类型说明**:
| Type | 何时使用 |
|------|----------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 仅文档 |
| `refactor` | 代码重构（非新功能或修复） |
| `test` | 添加或更新测试 |
| `chore` | 维护（依赖、配置） |

---

### 4. 推送到远程

```bash
# 新分支首次推送（设置追踪）
git push -u origin feature/your-feature

# 后续推送
git push origin feature/your-feature

# 或者（如果已设置追踪）
git push
```

---

### 5. 与远程同步

```bash
# 下载最新变更（不修改本地文件）
git fetch origin

# 下载并合并最新变更
git pull origin main

# 用最新的 main 更新你的功能分支
git checkout feature/your-feature
git merge main
```

---

### 6. 查看历史

```bash
# 查看最近提交（紧凑格式）
git log --oneline -10

# 查看详细历史
git log

# 查看特定提交的变更
git show abc1234

# 查看每行是谁修改的
git blame filename.ts

# 查看所有分支
git branch -a
```

---

### 7. 切换分支

```bash
# 切换到另一个分支
git checkout branch-name

# 切换到 main
git checkout main

# 查看当前在哪个分支
git branch

# 查看所有分支（包括远程）
git branch -a
```

---

## 完成功能

### 完整的合并工作流

```bash
# 1. 确保你的功能分支与 main 同步
git checkout main
git pull origin main
git checkout feature/your-feature
git merge main

# 2. 解决冲突（如果有）
#    - 编辑冲突文件
#    - 删除 <<<<<<< ======= >>>>>>> 标记
git add .
git commit -m "merge: resolve conflicts with main"

# 3. 推送你的分支
git push origin feature/your-feature

# 4. 在 GitHub 上创建 Pull Request（通过网页界面）

# 5. PR 合并后，清理
git checkout main
git pull origin main
git branch -d feature/your-feature    # 删除本地分支
```

---

## 标记发布（Tags）

```bash
# 创建带注释的标签
git tag -a v2.0.0 -m "Version 2.0.0: 双重存储架构"

# 推送标签到 GitHub
git push origin v2.0.0

# 推送所有标签
git push origin --tags

# 列出所有标签
git tag -l

# 查看标签详情
git show v2.0.0
```

**何时打标签**: 将完整版本合并到 main 之后。

---

## 撤销错误

### 丢弃未提交的变更

```bash
# 丢弃特定文件的变更
git checkout -- filename.ts

# 丢弃所有未提交的变更（小心！）
git checkout -- .
```

### 取消暂存

```bash
# 取消暂存一个文件（git add 之后，commit 之前）
git reset HEAD filename.ts

# 取消暂存所有文件
git reset HEAD
```

### 撤销提交

```bash
# 撤销最后一次提交，保留变更（已暂存）
git reset --soft HEAD~1

# 撤销最后一次提交，保留变更（未暂存）
git reset HEAD~1

# 撤销最后一次提交，丢弃变更（危险！）
git reset --hard HEAD~1

# 创建一个新提交来撤销之前的提交（安全）
git revert abc1234
```

### 恢复

```bash
# 查看所有操作的历史（包括 reset）
git reflog

# 恢复"丢失"的提交
git checkout abc1234
```

---

## 处理合并冲突

当 Git 无法自动合并时：

```
<<<<<<< HEAD
你的变更
=======
他们的变更
>>>>>>> feature/other-branch
```

**解决步骤**:
1. 打开冲突文件
2. 决定保留哪个版本（或合并它们）
3. 删除 `<<<<<<<`、`=======`、`>>>>>>>` 标记
4. 保存文件
5. `git add filename`
6. `git commit -m "merge: resolve conflict in filename"`

---

## 快速参考卡片

| 我想要... | 命令 |
|-----------|------|
| 开始新功能 | `git checkout -b feature/name` |
| 保存工作 | `git add . && git commit -m "message"` |
| 查看变更 | `git status` / `git diff` |
| 上传到 GitHub | `git push origin branch-name` |
| 获取最新代码 | `git pull origin main` |
| 切换分支 | `git checkout branch-name` |
| 查看历史 | `git log --oneline -10` |
| 标记发布 | `git tag -a v1.0.0 -m "message"` |
| 撤销未提交的变更 | `git checkout -- filename` |
| 撤销最后提交（保留变更） | `git reset --soft HEAD~1` |

---

## 可视化工作流

```
main ─────●─────────────────────────────────●───────────── (稳定)
          │                                 ↑
          │ checkout -b feature/xxx         │ merge (via PR)
          │                                 │
          ▼                                 │
feature ──●────●────●────●────●────●────●───┘
              │    │    │    │    │    │
           commit  │ commit  │ commit  │
           "feat"  │  "fix"  │ "test"  │
                   │         │         │
               push to    push to   create PR
               remote     remote
```

---

## 常见场景

### 场景 1："我提交到了错误的分支"

```bash
# 记住提交哈希
git log --oneline -1
# (记下哈希，如 abc1234)

# 在当前分支撤销提交
git reset --soft HEAD~1

# 切换到正确的分支
git checkout correct-branch

# 在那里提交
git commit -m "your message"
```

### 场景 2："我需要用最新的 main 更新我的分支"

```bash
git checkout main
git pull origin main
git checkout your-branch
git merge main
# 如有冲突则解决
git push origin your-branch
```

### 场景 3："我想查看文件的旧版本"

```bash
# 查看特定提交时的文件
git show abc1234:path/to/file.ts

# 从特定提交恢复文件
git checkout abc1234 -- path/to/file.ts
```

### 场景 4："我不小心删除了分支"

```bash
# 在 reflog 中找到提交哈希
git reflog

# 从该提交重建分支
git checkout -b recovered-branch abc1234
```

---

## 安全规则

1. **永远不要强制推送到 main**: `git push --force origin main`（危险！）
2. **推送前先拉取**: 先 `git pull origin branch`
3. **不要 rebase 公共分支**: 只 rebase 本地/私有分支
4. **频繁提交**: 小提交更容易撤销
5. **写有意义的消息**: 未来的你会感谢现在的你

---

## Git + AI 开发工作流

```
1. git checkout -b feature/xxx     # 创建功能分支
2. 与 AI 讨论                      # 规划实现
3. AI 实现代码                     # 代码变更
4. git add . && git commit         # 保存进度
5. 重复 3-4 每个任务               # 迭代开发
6. git push origin feature/xxx     # 推送到远程
7. 在 GitHub 创建 PR               # 代码审查
8. 合并到 main                     # 完成功能
9. git tag -a v1.x.0               # 打版本标签
```

---

## Git + 多设备开发检查清单

### 切换到 VPS 工作前
```bash
# 在本地 Mac 上
git add .
git commit -m "wip: work in progress"
git push origin feature/xxx
```

### 在 VPS 上开始工作
```bash
git fetch origin
git checkout feature/xxx
git pull origin feature/xxx
```

### 切换回本地 Mac 前
```bash
# 在 VPS 上
git add .
git commit -m "fix: production adjustments"
git push origin feature/xxx
```

### 在本地 Mac 继续
```bash
git pull origin feature/xxx
```

**黄金法则**: 切换设备前，先 commit + push；切换设备后，先 pull。

---

*模板版本: 1.0*
*来源: Project Goodman (2025)*
