# 项目速查

未经用户明确要求，不要随意修改 README 文件。
测试保持精简有效，聚焦关键行为和边界条件。

## 结构

- `src`：Novelia 共享 Vue 组件、主题、布局、认证集成与工具；包名为 `@novelia/web-kit`，直接导出源码。
- `playground`：独立组件和主题示例，使用 Vite 开发与构建。
- `tests`：Node 原生测试，包含 TypeScript 源码与 Vue 组件测试辅助工具。
- 包由 auth、forum、auto-novel 消费；修改公开 API 时注意兼容性。

## 命令

使用 Node.js 22.18+、pnpm（版本见 package.json），在仓库根目录执行：

- `pnpm install --frozen-lockfile`：安装依赖。
- `pnpm dev`：启动 playground。
- `pnpm build`：共享包类型检查，不生成发布产物。
- `pnpm test`：运行测试。
- `pnpm build:playground`：示例类型检查与生产构建。
- `pnpm exec prettier --write <修改的文件>`：格式化。

README 中原 auth 工作区命令暂时保留；本仓库独立开发使用以上命令。

## 提交约定

`type(scope): 简体中文摘要`，scope 可省略；type 为 `feat/fix/refactor/chore/build/docs/test/revert`。
