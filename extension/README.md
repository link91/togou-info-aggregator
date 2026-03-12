# 土狗气象台浏览器悬浮监控扩展

可拖动的实时监控悬浮窗扩展，接入土狗气象台消息流、关键词种子、来源筛选和声音提醒。

## 当前功能

- 可拖动悬浮窗与最小化圆形浮窗
- WebSocket 实时消息
- 来源开关
- 关键词种子
- 声音提醒
- 复制 / 打开链接
- 未读统计与全部已读
- 风向精选筛选

## 生效站点

当前仅在以下站点注入：

- `https://gmgn.ai/*`
- `https://www.gmgn.ai/*`
- `https://axiom.trade/*`
- `https://www.axiom.trade/*`
- `https://debot.ai/*`
- `https://www.debot.ai/*`

## 数据来源

- 网站：[https://tugoumeme.fun/](https://tugoumeme.fun/)
- 扩展通过网站公开接口与 WebSocket 获取消息

主要使用：

- `/api/status`
- `/api/channels/groups`
- `/api/messages`
- `/ws`

## 本地加载

1. 打开 Chrome 或 Edge 扩展管理页
2. 开启开发者模式
3. 选择“加载已解压的扩展程序”
4. 选中本仓库目录

更详细的安装说明见 [INSTALL.md](./INSTALL.md)。

## 安装方式

- 开发测试：使用“加载已解压的扩展程序”
- 手动分发：使用打包好的 `.crx`
- Chrome Web Store：审核通过后可直接商店安装

## 权限说明

- `storage`：保存窗口位置、关键词、开关状态
- `tabs`：点击“打开”时新开标签页

## 隐私

见 [PRIVACY.md](./PRIVACY.md)

## 许可证

MIT，见 [LICENSE](./LICENSE)
