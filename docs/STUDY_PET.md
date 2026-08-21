# 伴学宠物包

Mineradio 的伴学宠物是本地导入功能。宠物图集和清单会保存在当前应用的本地数据中，不调用外部 AI API，也不要求登录会员服务。

## 导入步骤

1. 打开 Mineradio 左上角的“今日计划”，展开“伴学宠物”。
2. 点击“导入文件”，同时选择 `pet.json` 和 `spritesheet.webp`（也支持 PNG）；或者点击“导入文件夹”，选择包含这两个文件的文件夹。
3. 导入完成后，在下拉框中选择宠物。宠物显示在左下角，点击宠物可以触发挥手/跳跃和本地激励语。
4. 可以用“隐藏/显示”暂时关闭画面上的宠物；“删除”只删除当前宠物包，不影响计划本和音乐。

最多保存 12 只宠物；同一个 `id` 再次导入会更新原包。图集单文件最大 18 MB，图片必须是 WebP 或 PNG。

## 图集契约

当前导入器使用固定的 Codex 8×9 图集契约：

| 项目 | 要求 |
| --- | --- |
| 总尺寸 | `1536 × 1872` 像素 |
| 单格尺寸 | `192 × 208` 像素 |
| 列数/行数 | `8 × 9` |
| 文件 | `spritesheet.webp` 或 `spritesheet.png` |
| 行 0 | `idle`，待机 |
| 行 1/2 | `running-right` / `running-left`，学习中移动 |
| 行 3 | `waving`，互动 |
| 行 4 | `jumping`，完成反馈 |
| 行 5 | `failed`，导入或状态失败反馈 |
| 行 6 | `waiting`，空计划等待 |
| 行 7 | `running`，学习中 |
| 行 8 | `review`，完成计划后的复盘状态 |

每行最多 8 帧。可以在清单中为每行指定 `frames` 和 `durations`（每帧毫秒数），也可以指定 `fps`；缺少的状态会使用内置默认值。图集尺寸不符合契约时，导入会被拒绝。

## 最简 `pet.json`

下面的清单可以直接和图集放在同一个文件夹中：

```json
{
  "id": "study-cat",
  "displayName": "伴学小猫",
  "description": "安静陪你完成今天的计划。",
  "spritesheetPath": "spritesheet.webp"
}
```

`id` 只允许字母、数字、点、下划线和连字符；`spritesheetPath` 必须指向包内文件，不能使用网址、绝对路径或 `..` 路径。

## 可选动画清单

需要自定义帧数或速度时，可以扩展 `states`。未写出的状态仍会回退到默认值：

```json
{
  "id": "study-cat",
  "displayName": "伴学小猫",
  "spritesheetPath": "spritesheet.webp",
  "pixelated": false,
  "states": {
    "idle": { "row": 0, "frames": 6, "durations": [280, 110, 110, 140, 140, 320] },
    "running": { "row": 7, "frames": 6, "fps": 8 },
    "waving": { "row": 3, "frames": 4, "durations": [140, 140, 140, 280] },
    "jumping": { "row": 4, "frames": 5, "durations": [140, 140, 140, 140, 280] }
  }
}
```

如果使用 Codex 或 Claude Code 制作图集，生成阶段就应把画布固定为 `1536×1872`，每格固定为 `192×208`，并按上表保留 9 行。不要把多余的行直接放进正式包；多余行会使图集尺寸校验失败。

## 状态与数据位置

- 计划有未完成项或正在播放音乐时，宠物进入 `running`。
- 完成一项计划时，短暂播放 `review`；全部完成时播放 `jumping`。
- 没有计划时会在合适的时机进入 `idle`/`waiting`。
- 宠物点击互动、定时鼓励和计划事件都只使用内置本地文案。
- 图集保存在浏览器 IndexedDB，当前宠物和隐藏状态保存在 localStorage；正常重启应用后会恢复。

若要分享宠物，只需分享 `pet.json` 与图集两个文件。不要把应用的 `.workspace`、浏览器 profile 或 IndexedDB 数据目录一起打包。
