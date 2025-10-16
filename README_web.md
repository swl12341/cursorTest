GitHub Pages 部署

步骤
1) 将 `docs/` 目录提交到你的 GitHub 仓库（分支 `main`）。
2) 在仓库 Settings → Pages：
   - Source 选择 `Deploy from a branch`
   - Branch 选择 `main`，Folder 选择 `/docs`
3) 保存后等待几分钟，访问页面底部显示的链接即可。

备注
- 网页入口是 `docs/index.html`。
- 如需仓库根目录即为站点根，可把 `docs/` 的内容移动到仓库根，并在 Pages 里选择 `/root`。

摄像头手势控制
- 在 `docs/` 页面点击“启用摄像头控制”，浏览器会请求摄像头权限。
- 基础手势：
  - 身体中心左右偏移：左右移动方块
  - 右手腕高于右肩：旋转
  - 左手腕快速下压到髋部以下：硬降
- 键盘仍可用：← → ↑ ↓，Space，P，R。

