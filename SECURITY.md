# 安全策略

## 报告问题

**请不要开公开 issue。** 用 GitHub 的私密报告：

<https://github.com/zxy-fish/Meme/security/advisories/new>

里面写清版本、复现步骤和影响，我会尽快回。修复发布后会在 Security Advisory 里说明。

## 支持范围

只处理最新 Release（以及 `main` 上的最新提交）。更早的版本请先升级再验证。

## 这个项目的安全边界

Meme 是纯本地优先的应用，没有后端。请对照下面几点判断问题是否真的成立：

- **数据不出本机**，除了你自己配置的两处出网请求：
  - 元数据搜索（Bangumi / AniList / TMDB），由浏览器 / Electron 直接发出；
  - GitHub 同步，写入你自己指定的**私有**数据仓库。
- **凭据只存在本机**：GitHub Token 和 TMDB Key 存在浏览器 `localStorage`（桌面版是 `app://meme` 这个 origin 的 IndexedDB / localStorage），不上传、不写进数据仓库、也不进代码仓库。
- **桌面版自更新**会校验 `latest-mac.yml` 里的 sha512，并核对 Bundle ID 与版本号；安装包没有 Apple 公证，首次打开需要手动放行。这属于分发层面的取舍，不算漏洞；但如果校验可以被绕过（例如签名被忽略、可被降级到任意地址），那算。
- **导入的文件**（TXT / PDF / ZIP / CBZ）都在本机解析。如果构造一个文件就能在读 README 之外的场景执行脚本（比如 Markdown 预览里的 XSS，或 ZIP 路径穿越写到应用目录之外），那算。
- **示例数据**只用于演示，和你的真实数据分开存放。

## 已知的非问题

- macOS / Windows 安装包未做代码签名，系统会提示「未验证的开发者」或 SmartScreen——这是当前分发方式的已知限制，见 README。
- 网页版部署在 GitHub Pages 上，任何拿到 URL 的人都能打开页面本身；能不能看到你的数据取决于你有没有在那台设备上配好 Token 并同步。
- 你自己把 Token 贴进 issue、截图或聊天记录里造成的泄露，不在本项目处理范围内（但请立刻去 GitHub 吊销并重新生成）。
