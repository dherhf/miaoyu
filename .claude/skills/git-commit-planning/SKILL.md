---
name: git-commit-planning
description: 'Git 提交规划与 Commit Message 规范技能。当用户准备提交代码、询问如何拆分提交、编写 commit message、整理 git 历史、或提及 Conventional Commits / Angular 规范时启用。涵盖提交原子性拆分、commit message 格式规范、交互式 rebase 整理历史、以及提交粒度把控。即使用户只是说"帮我提交一下"或"这几个改动怎么拆 commit"，也应当启用。'
---

# Git 提交规划技能

## 核心原则

1. **原子性（Atomic）**：一个 Commit 只做一件事。如果被 Revert，不应影响其他功能。
2. **清晰性（Clear）**：通过 Commit Message 就能看懂"做了什么"和"为什么这么做"，无需查阅代码。
3. **一致性（Consistent）**：遵循统一的提交格式和规范。

## 工作流程

当用户请求帮助规划提交时，按以下步骤操作：

### Step 1: 分析当前变更状态

运行以下命令了解全貌：

```bash
git status --short          # 总览工作区状态
git diff --cached --stat   # 已暂存变更的文件级摘要
git diff --stat             # 未暂存变更的文件级摘要
git log --oneline -10      # 近期提交历史，了解项目已有风格
```

如有需要，进一步查看具体 diff 内容，理解每个文件的变更目的。

### Step 2: 按"逻辑"拆分提交

根据变更内容判断是否需要拆分为多个提交。拆分维度：

- **不同功能模块**的变更分开提交（如：DB schema 变更 vs API 接口 vs 前端 UI）
- **不同意图**的变更分开提交（如：新功能 vs bug 修复 vs 重构 vs 文档）
- **不同关注层**的变更分开提交（如：基础设施配置 vs 业务逻辑）

判断标准：如果将这批变更 revert，是否会连带影响不相关的功能？如果是，说明需要拆分。

### Step 3: 为每个提交编写规范的 Commit Message

采用 Conventional Commits（Angular 规范）：

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### type 类型选择

| type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修补 bug |
| `docs` | 文档修改 |
| `style` | 代码格式修改（不影响运行逻辑） |
| `refactor` | 重构（非新功能、非 bug 修复） |
| `perf` | 性能优化 |
| `test` | 增加或修改测试 |
| `build` | 构建系统或外部依赖修改 |
| `ci` | 持续集成配置修改 |
| `chore` | 其他不修改源代码的改动 |
| `revert` | 回滚上一个版本 |

#### scope（可选）

说明 commit 影响的范围，如模块名、组件名等。例如 `auth`、`cart`、`config`。

#### subject 规则

- 以动词开头，第一人称现在时（如"添加"而非"添加了"）
- 不超过 50 个字符
- 结尾不加句号

#### body（可选）

解释**为什么**要做这个变更，以及与之前行为的对比。每行不超过 72 个字符。如果变更本身从 subject 就能完全理解，可省略 body。

#### footer（可选）

- 关联 Issue：`Closes #123`、`Fixes #456`
- 不兼容变动：以 `BREAKING CHANGE:` 开头描述

### Step 4: 向用户展示提交规划

以表格或列表形式展示拆分方案，包括每个提交的：
- 提交信息（完整的 Header + Body + Footer）
- 涉及的文件
- 变更概述

等用户确认后再执行。

### Step 5: 执行提交

对每个逻辑分组，使用 `git add` 暂存对应文件后提交：

```bash
git add <file1> <file2>
git commit -m "<type>(<scope>): <subject>" -m "<body>" -m "<footer>"
```

或使用多行 commit message 的 heredoc 方式。

## 提交粒度参考

- **太大**：单个 commit 超过 500 行变更，Code Review 困难
- **太小**：仅修改一个错别字、调整一个空格——应合并到相关 commit 或用 `--amend`
- **理想**：一个 commit 解决一个完整且独立的问题，能被单独 revert 而不破坏其他功能

## 历史整理（Push 前检查项）

如果本地已有多个碎片提交，在 push 前建议整理：

1. **合并琐碎提交**：`git rebase -i HEAD~n`，将相关小提交 squash 为一个
2. **修改提交信息**：`git rebase -i` 中选择 reword
3. **补充遗漏文件到上一提交**：`git commit --amend`
4. **WIP 提交整理**：推送前必须将 WIP 提交 squash 成规范提交

## 正反案例

### 反面案例

```
update code              // 毫无意义
fix bug                  // 哪个 bug？怎么修的？
111                      // 无信息量
feat: 添加购物车功能，修复登录bug，更新README  // 大杂烩
Added a new feature for user login.  // 时态和格式错误
```

### 正面案例

```
feat(cart): 添加购物车商品数量动态修改功能

- 引入 debounce 优化输入框频繁触发请求的问题
- 增加数量小于 1 时的边界校验
- 提取公共的 CartItem 组件

Closes #102
```

```
fix(auth): 修复登录失败计数未按手机号哈希隔离的问题

Redis key 从明文手机号改为 SHA-256 哈希值，
避免明文手机号出现在日志和 key 名称中。
```

## 注意事项

- 遵循项目已有的 commit message 语言（中文或英文）。如果近期 commit 历史全为中文，保持中文；全为英文则保持英文。
- 如果项目已配置 Commitlint / Husky，遵守其规则约束。
- 不要使用 `git add .` 一次性暂存所有文件。按逻辑分组分别 `git add`。
- 提交信息中写清楚 What 和 Why，不写 How（代码本身已经说明 How）。
