# 参与开发

感谢愿意一起把 Meme 做得更好。这是一个个人向的本地优先工具，改动不必很大，能解决实际问题就好。

## 环境

- Node.js 22+
- pnpm 11（`corepack enable` 或 `npm i -g pnpm`）

## 本地跑起来

```bash
pnpm install
pnpm dev          # http://127.0.0.1:5173
```

首次打开会写入一组示例数据（10 个条目、8 个书签、一本示例小说、3 条备忘录），都在本机 IndexedDB 里，清掉浏览器数据就重置了。

## 提交前请跑

```bash
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest，合并 / 章节 / 编码 / 年份 / 统计 / 更新器
pnpm e2e          # Playwright，本机默认用 Edge
```

桌面端相关：

```bash
pnpm build
pnpm exec electron-builder --mac --dir   # 只打包不签名，产物在 release/
```

## 代码结构

```
src/pages/          页面：媒体库、详情、书架、阅读器、备忘、统计、设置
src/components/     UI 与业务组件（ui/ 下是通用件）
src/lib/            数据层：db、repo、元数据源、同步、阅读器、统计
src/lib/metadata/   Bangumi / AniList / TMDB 适配
electron/           桌面壳与自更新（mac 用自研安装器）
e2e/                Playwright 用例
```

## 提 PR

1. fork 后从 `main` 拉一个分支：`feat/xxx`、`fix/xxx`
2. 只做一件事；改动大就先开 issue 聊聊
3. 提交前跑完上面的检查，PR 描述里写清「改了什么 / 为什么 / 怎么验证的」
4. 截图或录屏对 UI 改动很有帮助

## 请不要提交

- 你自己的 `data/library.json`、GitHub Token、TMDB Key
- `release/`、`dist/`、`.shots/` 之类的构建产物（已在 `.gitignore` 里）

Token 只存在本机 localStorage，也请不要贴进 issue。

## 协议

提交代码即表示同意以 [MIT](LICENSE) 协议发布。
