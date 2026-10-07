# 开场工作台的 3D 源文件

背景图和挂件图都是用 Blender（Cycles）渲染出来的，网页里只负责让挂件晃动。

- `scene2.py`：整个场景（洞洞板、挂件、桌面、灯光、相机）
- `render_web.py`：渲染一张不含挂件的背景 `plate.webp`，每个挂件和公仔各渲一张透明图，并输出位置 `layout.json`
- `tex/`：挂件上的印刷图案。改 `tex.html`，再用 `node tex/render.js` 重新生成 PNG

重新出图（需要 Blender 5.2，或 `pip install bpy==5.2.2`）：

    node tex/render.js
    python3 render_web.py out 48 1920

然后把 `out/` 里的图转成 webp 放进 `public/open/`，把 `layout.json` 复制成 `src/shell/workbench-layout.json`。
脚本里的路径目前写的是云端的路径，在本机跑之前要改成本机路径。
