# otato.art

去皮土豆 oTATo 的品牌官网。每个产品是一个频道，往下滚就是换台。

- 中文：`/`，英文：`/en`
- 更新记录：`/updates`、`/en/updates`
- prompt 的自动更新清单：`/updates/appcast.xml`（正式版发布前保持为空）

## 本地运行

第一次在项目目录里运行一次（之后在任何目录都能用）：

```bash
npm link
```

以后一键启动：

```bash
otato art dev
```

打开 http://localhost:4100 。也可以在项目目录里直接 `npm run dev`。第一次启动、依赖有变化或换了电脑时，会先自动装好依赖。快捷键：↑ ↓ 换台，数字键直达频道，M 打开频道列表，在 prompt 频道按 ⌥ Space 试搜索。

## 加一个新产品（新频道）

1. 在 `src/channels/` 下新建文件夹，比如 `src/channels/foo/`，放两个文件：
   - `meta.ts`：名称、频道号、中英文案、链接、状态（`live` 直播中 / `test` 试播 / `soon` 即将开播）、主题色
   - `Screen.tsx`：这个频道的画面，完全按产品自己的品牌来做
2. 在 `src/channels/index.ts` 里加一行。

已有频道不用改。品牌壳（台标、频道号、频道列表、语言切换）会自动读取新频道的配置。

产品上线后，把 `meta.ts` 里的 `status` 改成 `"live"`。

## 其他要改的地方

- 社媒链接：`src/content/site.ts`（小红书、抖音填上主页链接后才会显示）
- 更新记录：`src/content/updates.ts`
- 品牌文案：`src/lib/i18n.ts`

## 结构

```
src/app/(zh)/        中文页面
src/app/(en)/en/     英文页面
src/channels/        各产品频道
src/shell/           品牌壳：台标、频道号、换台转场、开机、频道列表、关于
src/content/         社媒、更新记录
public/channels/     频道用到的图片
public/brand/        logo
```

技术：Next.js 16、React 19、Tailwind CSS 4。字体：Geist、Geist Mono、Geist Pixel，中文用思源黑体（Noto Sans SC），都打包在项目里，不依赖 Google Fonts。

## 部署

GitHub 仓库：`oTATo-Boss/otato-art`，生产分支：`main`。
Cloudflare Pages 使用个人账户 `5de6d827a228377db32730376e2e9b28`。
构建命令：`npm run build`；静态输出目录：`out`。

本机 Wrangler 的 `personal` 登录配置绑定到本项目目录，公司登录保留在 `default`。
Blender 工程、渲染历史、备份脚本和本地预览截图不纳入 Git，网站运行资产保留在 `public/`。
