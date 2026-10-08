# 部署与协作规则

网站托管在 Cloudflare Pages，连着 GitHub 仓库 `oTATo-Boss/otato-art`。**推送到哪个分支，Cloudflare 就自动构建哪个分支**：

| 分支 | 用途 | 推送后 |
| --- | --- | --- |
| `main` | 线上版本 | 自动构建并发布到 **otato.art** |
| `dev` | 日常开发 | 自动构建一个**预览链接**（`dev.otato-art.pages.dev`），不影响线上 |

Cloudflare 的构建设置：构建命令 `npm run build`，输出目录 `out`，生产分支 `main`。

## 日常流程

```bash
git switch dev
# ……改东西，本地 otato art dev 看效果……
git add -A
git commit -m "fix: 挂件拖拽方向"
git push                     # 推送前会自动跑检查，见下文
```

1. 推送 `dev` 后，到 Cloudflare Pages 的「部署」里打开 `dev` 的预览链接，桌面和手机都看一眼。
2. 没问题再合并到 `main` 上线：

```bash
git switch main
git merge --ff-only dev      # main 只接受从 dev 合并，不直接在 main 上改
git push
git switch dev
```

3. 上线后打开 otato.art 确认一遍。

## 推送前检查

`.githooks/pre-push` 会在每次 `git push` 前跑 `npm run check`（代码检查 + 类型检查 + 构建）。任何一步失败就不推送，线上永远是能构建通过的版本。

- 第一次 clone 后跑一次 `npm install`，会自动启用这个钩子（`package.json` 里的 `prepare`）。
- 手动检查：`otato art check`。
- 紧急情况下可以 `git push --no-verify` 跳过，**不要用在 main**。

## 出问题怎么回滚

- **最快**：Cloudflare Pages → 项目 → 部署 → 找到上一个正常的生产部署 → 「回滚到此部署」。几秒钟生效，不用动代码。
- **代码层面**：在 `dev` 上 `git revert <出问题的提交>`，走一遍正常流程上线。

## 提交信息

用中文一句话写清楚改了什么，前面可以加类型：

- `feat:` 新功能（新频道、新交互）
- `fix:` 修问题
- `style:` 视觉调整
- `assets:` 只换了图片、模型
- `docs:` 文档
- `chore:` 依赖、配置、整理

## 素材规则

- `public/` 只放**网页实际会加载**的文件。单个文件尽量不超过 1MB；3D 模型必须用 `otato art publish` 压缩过再放进来。
- 源素材（Blender 工程、4K 贴图、原始模型）放在 `3d/workbench/`，其中 `assets/`、`renders/`、`*.blend` 不进仓库（体积大，单个文件可能超过 GitHub 的 100MB 限制），只留在本机。换电脑时记得单独备份这几个文件夹。
- 用第三方素材前先确认授权：要能商用；需要署名的（如 CC BY），在 README 的「第三方素材」和网页悬停署名里都加上。来源不明的素材不要用。

## AI 协作规则

Claude、Codex 等 AI 助手可以改代码、跑检查、在本地提交到 `dev`，但**推送、合并到 main、改 Cloudflare 设置、删除文件**都必须先说明要做什么、等确认后再做。
