# Mineradio

![Mineradio 暗场启动页](./docs/assets/readme/cinema-beat-smoke.png)

## 关于本仓库（二创说明）

本仓库是 `whathill111` 基于原作者 [`XxHuberrr`](https://github.com/XxHuberrr) 的 [Mineradio](https://github.com/XxHuberrr/Mineradio) 制作的**二创发布版**，遵循 GPL-3.0。

由 `whathill111` 新增的二创内容：

- **今日计划**：左上角紧凑的每日计划板块，按本地日期保存待办、勾选完成
- **伴学宠物**：可导入自制宠物包，宠物根据计划与播放状态切换动画并给出本地激励语
- **自定义壁纸**：除原版的 Wallpaper Engine 视觉外，支持导入任意本地图片作为背景

此外由 `whathill111` 整理用于公开分发：

- 移除个人自用内容，只保留可公开分发的素材与代码
- 提供可公开分发的仓库与 Windows 安装包（见 [Releases](https://github.com/whathill111/Mineradio/releases)）
- 下载入口与使用说明指向本仓库的 GitHub Release

**原作者署名与 GPL-3.0 授权完整保留**。Mineradio 原项目由 `XxHuberrr` 设计与打造，著作权归原作者所有。

Mineradio 是一款 Windows 桌面沉浸式音乐播放器，把搜索播放、歌词舞台、粒子视觉、3D 歌单架和完整桌面模式组合成一个更接近现场感的私人音乐空间。

## 立即下载 Windows 安装包

安装包从本仓库的 GitHub Release 下载。

[下载 Mineradio 2.1.3 — GitHub Release](https://github.com/whathill111/Mineradio/releases/tag/v2.1.3)

安装时只需要下载并运行 `Mineradio-2.1.3-Setup.exe`。不要把 `.blockmap`、`latest.yml` 或 `win-unpacked` 当成正式安装包。

## 下载或安装被拦截怎么办

小众 Electron 桌面软件、未签名安装包有时会被浏览器、Windows Defender 或 SmartScreen 提示风险。请先确认安装包来自本仓库的 GitHub Release，文件名是 `Mineradio-2.1.3-Setup.exe`。

1. 浏览器下载栏提示风险时，打开下载列表，点这条下载右侧的 `...` 三个点，选择 `保留` / `仍要保留` / `显示更多` 后继续保留。
2. Windows SmartScreen 弹出蓝色拦截窗口时，点 `更多信息`，再点 `仍要运行`。
3. 如果杀毒软件明确显示木马、高危或已经隔离，不要强行运行；删除该文件后重新从本仓库 GitHub Release 下载，仍然异常请带截图反馈给作者。

## 当前版本

当前版本：`2.1.3`

状态：Mineradio 2.1.3 正式版。

> 安全提示：`v1.0.10` 及更早旧安装包不再建议继续安装或传播。请使用本仓库 GitHub Release 提供的 `Mineradio-2.1.3-Setup.exe`。

## 核心特性

- 首页包含每日推荐、平台推荐、继续听、听歌画像和我的歌单入口
- 完整桌面模式保留播放器、主页、歌单和桌面交互
- 支持本地 MP4 与 Wallpaper Engine 视觉内容
- 播放后切换到 Emily / 默认播放态视觉，歌词舞台与粒子舞台同步工作
- 基于节奏的电影镜头视觉系统
- 面向长播客和 DJ 曲目的专属视觉模式
- 歌词舞台、自定义歌词、歌词位置与视觉控制
- 自定义专辑封面上传与裁剪
- 右键唤起 3D 歌单架，支持歌单队列浏览
- 网易云音乐账号、搜索、歌单、播客等体验接入
- QQ 音乐搜索、登录态与音源补充接入
- GitHub Releases 更新检测与下载入口
- 首次启动内置「默认测试」视觉用户存档，软件内默认视觉参数与该存档一致
- 左上角紧凑「今日计划」：按本地日期保存待办、勾选完成并联动伴学宠物
- 无需会员的「开放音频」来源：只接入 Internet Archive 中带明确公开许可的音频，并显示来源与许可
- 可导入本地图片或视频作为背景；支持关闭、电影漂移和音乐律动三种轻量动态模式
- 可导入自制伴学宠物包；宠物会根据计划与播放状态切换动画并给出本地激励语，支持按住拖动换位

## 使用说明

Windows 用户可以从本仓库的 GitHub Release 下载安装包。

正式分发以 `Mineradio-2.1.3-Setup.exe` 为准，不建议直接使用 `win-unpacked` 目录。安装包会创建桌面快捷方式。

### 二创功能使用

- 「今日计划」位于左上角，可直接输入今天要完成的事情，点击右侧复选框完成；计划按日期保存在本机。
- 在视觉控制台的「界面 → 背景媒体」中点击「选择」，可导入图片或视频；选择「关闭 / 电影 / 律动」切换动态效果。视频会保存在本地应用数据中，重启后恢复。
- 开放音频不要求登录会员。搜索结果会标记 `OA`，播放详情会显示 Archive.org 来源和许可链接；只使用应用能够重新确认许可和公开音频文件的条目。
- 伴学宠物在「今日计划 → 伴学宠物」中导入 `pet.json + spritesheet.webp/png`，完整格式和自制说明见 [docs/STUDY_PET.md](./docs/STUDY_PET.md)。

已经安装过旧版本的用户可直接运行 `Mineradio-2.1.3-Setup.exe` 完成更新。软件内更新入口只会打开浏览器下载页，不会在客户端内下载或应用补丁。

## 开发运行

```bash
npm install
npm start
npm run build:win
```

桌面版入口由 Electron 主进程加载本地服务。`npm run build:win` 会生成 Windows NSIS 安装包，产物位于 `dist/`。

## 更新机制

Mineradio 会请求 GitHub Releases latest 检测新版本。远端版本高于本地版本时，应用内更新入口会展示 Release 内容，并通过系统浏览器打开本仓库 GitHub Release 的下载页；即使 Release 附带完整安装包，`2.0.3+` 客户端也不会读取、下载、缓存或应用该附件与补丁。

本地验证更新链路时，可以通过 `MINERADIO_UPDATE_MANIFEST` 指向一个本地 manifest JSON 或 HTTP 地址来模拟线上 Release。

## 第三方音乐平台说明

Mineradio 不是网易云音乐、QQ 音乐或腾讯音乐娱乐集团的官方客户端，也不隶属于任何音乐平台。

项目中的第三方平台接入仅用于个人学习、本地客户端体验和用户自有账号的播放辅助。请遵守对应平台的用户协议、版权规则和会员权益规则。项目不会提供绕过付费、绕过会员、破解音质或重新分发音乐内容的能力。

## 用户数据与隐私

登录 Cookie、搜索历史、自定义封面、自定义歌词、节奏分析缓存等数据只应保存在本机用户数据目录或浏览器本地存储中，不应提交到仓库。

更多说明见 [PRIVACY.md](./PRIVACY.md)。

## 版权与授权

Copyright (C) 2026 XxHuberrr.

本项目采用 GPL-3.0 授权。详见 [LICENSE](./LICENSE)。

MR Logo、Mineradio 名称、界面视觉设计与原创视觉表达归作者所有；第三方依赖和第三方服务分别遵循其各自授权与服务条款。

> 本仓库由 `whathill111` 基于原作者 `XxHuberrr` 的 Mineradio 改造发布，保留全部原作者署名与 GPL-3.0 授权。仓库不含个人自用内容，仅保留可公开分发的素材与代码。
