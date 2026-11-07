# Meme

[![CI](https://github.com/zxy-fish/Meme/actions/workflows/ci.yml/badge.svg)](https://github.com/zxy-fish/Meme/actions/workflows/ci.yml)
[![Deploy web](https://github.com/zxy-fish/Meme/actions/workflows/pages.yml/badge.svg)](https://github.com/zxy-fish/Meme/actions/workflows/pages.yml)
[![Desktop builds](https://github.com/zxy-fish/Meme/actions/workflows/desktop.yml/badge.svg)](https://github.com/zxy-fish/Meme/actions/workflows/desktop.yml)

> 把看过的、在看的、想看的番剧 / 电视剧 / 电影 / 小说 / 漫画和网页，收进一个地方。
> 本地优先，元数据一键补全，手机和电脑同步，内置一个 Kindle 手感的阅读器。

Meme 是一个个人媒体库（Media Memo）：记录 + 整理 + 阅读。它不做在线播放，也不替你找片源；它只负责把你已经看过和想看的那些东西，安静地收好。

![媒体库](docs/screenshots/library.jpg)

## 现在能做什么

- **六类条目**：番剧、剧集、电影、小说、漫画，以及独立的网页书签。
- **状态与进度**：想看 / 在看 / 看过 / 搁置 / 弃坑；集数、话数、卷数、百分比进度；评分、收藏、标签、短评、笔记。
- **元数据一键填充**：搜标题 → 选条目 → 自动带出封面、原名、年份、话数、制作公司、角色、CV、简介、Bangumi / TMDB 链接。
  - 番剧 / 漫画 / 小说：Bangumi（主力），AniList（兜底）。
  - 电影 / 剧集：TMDB（填自己的免费 API Key）。
- **网页书签**：网址、描述、标签；点击标签筛选。适合收番剧站、资料站、工具站。
- **阅读器**：导入 TXT，自动识别 UTF-8 / GBK / GB18030 / Big5 / UTF-16；章节识别；分页翻页；宋体 / 黑体 / 楷体；纸黄 / 纯白 / 护眼 / 夜间；字号、行距、留白；目录、书签、阅读进度；左右滑动 / 方向键翻页。
- **多端同步**：数据存本地 IndexedDB，联网时和你的 **GitHub 私有仓库** 合并。每次同步是一次 commit，历史本身就是备份。
- **PWA**：可以添加到 Android / iOS 主屏幕，也可以直接当桌面网页用。

## 截图

| 阅读器（手机） | 一键填充 |
| --- | --- |
| ![阅读器](docs/screenshots/reader.jpg) | ![自动填充](docs/screenshots/autofill.jpg) |

| 网页书签 |
| --- |
| ![书签](docs/screenshots/bookmarks.jpg) |

## 在线使用

Web 版已经通过 GitHub Pages 部署：

**<https://zxy-fish.github.io/Meme/>**

Android Chrome 打开后可以「添加到主屏幕」，当成 App 用。数据存在本机，同步需要按下一节配置 Token。

## 快速开始

要求 Node.js 22+ 和 pnpm。

```bash
pnpm install
pnpm dev          # http://127.0.0.1:5173
pnpm build        # 产出 dist/
pnpm preview
pnpm test         # 单元测试（合并、章节、编码）
pnpm e2e          # Playwright（本机默认使用 Edge）

# 桌面端（macOS / Windows）
pnpm build
pnpm exec electron-builder --mac   # 或 --win
```

首次打开会生成一组示例数据（8 个条目、8 个书签、一本示例小说）。示例封面是脚本生成的占位海报，真实搜索会使用 Bangumi / TMDB 的封面。

## 配置 GitHub 同步

数据仓库和代码仓库是分开的：代码可以公开，**数据仓库请保持私有**。

1. 新建一个私有仓库，例如 `你的用户名/meme-data`（默认为 `zxy-fish/meme-data`）。
2. 创建一个 GitHub Token：
   - 经典 Token：勾选 `repo` 权限即可；
   - 或者 fine-grained Token：只授权 `meme-data` 仓库的 **Contents: Read and write**。
   - 直达链接：<https://github.com/settings/tokens/new?scopes=repo&description=Meme%20Sync>
3. 打开 App → 设置 → GitHub 同步：
   - Owner / 数据仓库 / 分支 / 文件路径（默认 `data/library.json`）；
   - 粘贴 Token；
   - 点「测试连接」，再点「立即同步」。
4. 打开「自动同步」。之后打开 App、切回前台、每 5 分钟都会自动检查一次。

同步规则：按每条记录的 `updatedAt` 做 Last-Write-Wins 合并；删除用墓碑字段，避免旧设备把已删除的条目复活。Token 只存在本机浏览器 localStorage；换设备时需要重新填一次。

> 数据里不包含书籍正文，只包含书籍元数据和阅读进度，避免仓库膨胀。

## 桌面端

Electron 壳加载的是同一份 `dist/`，数据仍然存在本机（`app://meme` 自定义协议，IndexedDB 可用）。

- 本地构建：`pnpm build && pnpm exec electron-builder --mac`（或 `--win`），产物在 `release/`。
- 云端出包：GitHub Actions 的 **Desktop builds** 工作流，手动触发或打 `v*` tag，下载 Artifacts。
- 安装包没有做代码签名：macOS 首次打开需要右键 → 打开；Windows 可能提示 SmartScreen。个人使用足够，公开分发需要自己补签名证书。

## 元数据

| 来源 | 覆盖 | 说明 |
| --- | --- | --- |
| [Bangumi](https://bgm.tv) | 番剧、漫画、轻小说 | 中文标题、CV、制作人员、章节；无需 Key |
| [AniList](https://anilist.co) | 番剧、漫画 | Bangumi 不可用时的兜底；日文 / 英文标题 |
| [TMDB](https://www.themoviedb.org) | 电影、剧集 | 需要免费 API Key；中文简介、季集、演员 |

搜索和详情请求都在浏览器 / Electron 里直接发出，不经过任何中间服务器。如果所在网络访问不稳定，可以在设置里配置代理（规划中）。

## 阅读器

- **TXT**：编码探测、BOM、CRLF 归一化；按「第 X 章 / 卷 / 回 / 序章 / 番外 / Chapter N」切章；识别失败时按 6000 字切块。
- **排版**：CSS 多栏分页，翻页位移；默认宋体、19px、1.9 行距、纸黄底；所有参数可调，自动保存。
- **进度**：章节 + 页码 + 百分比；700ms 防抖写回；同步到其他设备。
- **书签**：当前章节 / 页码，存进书籍元数据一起同步。
- **EPUB / PDF**：规划中。

## 技术栈

- React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- Dexie（IndexedDB）本地优先存储
- React Router（HashRouter，方便静态托管）
- GitHub Contents API 同步
- PWA（vite-plugin-pwa）
- Vitest + Playwright
- 桌面端 Electron、Android 打包：见下方 Roadmap

```text
src/
  components/       UI 组件（layout / media / bookmarks / ui）
  pages/            页面（媒体库、详情、书签、书架、阅读、统计、设置）
  lib/
    db.ts           Dexie schema
    repo.ts         条目 / 书签 / 书籍的读写
    metadata/       Bangumi / AniList / TMDB 适配器
    sync/           GitHub 同步与 LWW 合并
    reader/         编码探测、章节解析、TXT 读取
  store/            Zustand（设置、Toast）
```

## Roadmap

- [x] 媒体库 CRUD、筛选、详情、角色 / CV
- [x] 网页书签 + 标签
- [x] Bangumi / AniList / TMDB 搜索与一键填充
- [x] TXT 阅读器、目录、书签、进度
- [x] GitHub 私有仓库同步
- [x] PWA
- [ ] EPUB / PDF
- [x] 桌面端 Electron 安装包（macOS / Windows）
- [ ] Android APK（当前先用 PWA 添加到主屏幕）
- [ ] Bangumi 收藏导入
- [ ] 当季新番日历
- [ ] 阅读划线 / 笔记

## 说明

- 本项目只做「记录 + 阅读」，不提供在线播放、采集规则或弹幕。
- 示例小说《夜航书店》为项目内原创文本，仅用于演示阅读器。
- 示例海报由 `scripts/gen_assets.py` 生成。
- 代码 MIT License。
