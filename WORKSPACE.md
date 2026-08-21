# Mineradio 本地工作区

项目的运行数据、用户资料、缓存、构建下载和临时文件统一保存在：

```text
.workspace/
```

该目录已加入 `.gitignore`，不会提交到源码仓库。主要子目录包括：

- `user-data/`：账号状态、应用设置和本地资料索引。
- `cache/`：歌词、Chromium、节拍图和原生辅助缓存。
- `temp/`：项目运行、测试产生的临时文件。
- `profile/`：项目专用的 Roaming/Local 应用资料。
- `npm-cache/`、`pnpm-store/`、`electron-cache/`：依赖与构建缓存。

## 使用方式

- 双击 `start-mineradio.bat` 启动播放器。
- 双击 `workspace-shell.bat` 后，在打开的命令行里执行安装、测试或构建命令。
- VS Code 可直接打开 `Mineradio.code-workspace`；新终端会自动使用项目内的数据目录。
- Codex 从本目录开启新任务时，`.codex/config.toml` 会把写入范围限制在工作区，并把常用缓存和临时目录指向 `.workspace`。

不要从普通系统终端直接执行依赖安装；如果确实要这样做，先运行 `scripts\workspace-env.bat`，或使用 `workspace-shell.bat`。

Codex/编辑器/Node/Electron 可执行文件本身可能安装在系统盘；本配置控制的是本项目新增和持续增长的数据，不会搬动或删除已有应用程序文件。
