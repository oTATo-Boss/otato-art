# 开场工作台出图流程

开场画面分两层：

1. **背景照片**：Blender（Cycles）渲染的整张工作台，不含挂件、挂杆、香蕉猫和架上玩具。
2. **活的部分**：
   - 挂件、挂杆、香蕉猫是 three.js 实时 3D（`src/shell/HangingCharms.tsx`）。
   - 公仔和架子上的玩具是同机位渲出来的透明小图（`src/shell/Workbench.tsx`），碰一下会晃。
   - 每个玩具的影子单独一层（同一个太阳、阴影捕捉渲的），正片叠底叠在背景上，玩具跳起来时影子变淡变虚。

两层用的是**同一台相机**：Blender 导出相机参数到 `workbench-layout.json`，网页照着它摆 three.js 相机，所以能严丝合缝。

```
Blender 场景 ──export_web.py──▶ renders/web/ ──otato art publish──▶ public/open/ + workbench-layout.json ──▶ 网页
 (build_*.py)                   原始 PNG / GLB                       调色、webp、压缩模型
```

## 文件

```
3d/workbench/
  workbench.blend        场景文件（不进仓库，由脚本生成）
  lib.py                 工具函数：建盒子/圆柱/圆环、贴图材质、导入模型、追加素材
  build_room.py          1. 墙、窗、窗帘、洞洞板、挂杆、桌子、灯光、相机
  build_props.py         2. 桌面物件：植物、笔筒、相机、马克杯、T^T 公仔、切割垫、印章……
  build_brand.py         3. 三个产品挂件 + Coming soon 卡、透明盒、贴纸包、标语牌、置物架
  build_decor.py         4. 便利贴、贴纸、海报
  build_extra.py         5. 置物架上的玩具、书堆、手表等
  export_web.py          导出网页素材
  grade.py               调色参数的 Python 版本（和 scripts/publish-workbench.mjs 一致，方便在 Blender 里试）
  tex/                   自己做的贴图（便利贴、封面、屏幕、贴纸、拍立得、标语牌……）
  tex-src/               这些贴图的 HTML 源文件，改完用 render.mjs 重新截图
  models/                T^T 公仔、小机器人等单独的模型
  assets/                第三方源素材（不进仓库）
    codex/               模型、贴图、HDRI
    extra/               玩具模型、植物、文具等
  renders/web/           export_web.py 的输出（不进仓库）
```

所有路径都相对 `workbench.blend` 所在的文件夹，不引用项目外的文件。

## 改场景、重新出图

需要 Blender 5.1 以上。在 Blender 里打开 `3d/workbench/workbench.blend`，到「脚本」工作区的 Python 控制台运行：

```python
import os
d = os.path.dirname(bpy.data.filepath) + "/"
for f in ("build_room", "build_props", "build_brand", "build_decor", "build_extra"):
    exec(open(d + f + ".py").read())
bpy.ops.outliner.orphans_purge(do_recursive=True)
exec(open(d + "export_web.py").read())     # 渲染背景 + 小图、导出模型，2400×1350 大约 1～2 分钟
bpy.ops.wm.save_mainfile()
```

然后在项目目录：

```bash
otato art publish     # 调色 + 转 webp + 压缩 glb，写进 public/open/ 和 src/shell/workbench-layout.json
otato art dev         # 看效果
```

只改了某一部分时，可以只跑对应的 `build_*.py`。每个脚本开头会清空自己负责的集合再重建。

## 常见改动

- **挪位置**：每个物件的位置都写在对应脚本里，单位是米。坐标：x 向右，y 向墙里（负数朝镜头），z 向上。桌面高 0.75，置物架面高 1.02。
- **换调色**：改 `scripts/publish-workbench.mjs` 顶部的 `GRADE`（白点、S 曲线、饱和、冷暖），重新 `otato art publish`。不用重渲。
- **加一个架上玩具**：
  1. 在 `build_extra.py` 里用 `import_glb(...)` 放上去。
  2. 在 `export_web.py` 的 `sprites` 里加一行。
  3. 重新导出。
  4. 网页会自动读取 `layout.json` 里的新小图。
  5. 需要署名的，在 `Workbench.tsx` 的 `CREDITS` 里加一行。
- **换挂件**：改 `build_brand.py` 里对应的函数。网页按节点名找部件（`hook_*` 钩子、`crt_screen` 屏幕、`case` 亚克力、`ghost_card`），这几个名字别改。

## 注意

- 压缩模型时不能合并或拍平节点（`publish-workbench.mjs` 已经处理），否则网页找不到屏幕、钩子这些部件。
- 挂件模型是世界坐标导出的，网页用 `layout.json` 里的挂点 `charms` 和钩子下端 `hookLow` 把它们挂回去。
- 渲染背景时挂件、挂杆、香蕉猫、玩具全部隐藏（连影子）。玩具影子由 `export_web.py` 的 shadows 步骤单独渲（半分辨率），`publish` 去噪、裁剪成 `sprites/<id>-shadow.webp`。影子深浅、冷暖改 `publish-workbench.mjs` 里的 `SHADOW`。
