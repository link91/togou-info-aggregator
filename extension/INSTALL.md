# 土狗气象台浏览器插件安装教程

这份教程适用于 `Chrome` 和 `Edge`。

## 方式一：加载已解压扩展（推荐测试版）

适合自己本地使用、调试最新代码。

### Chrome

1. 打开浏览器，进入 `chrome://extensions/`
2. 打开右上角的“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择本仓库目录：
   - `tugou-weather-station-extension`
5. 安装完成后，刷新目标站点页面

### Edge

1. 打开浏览器，进入 `edge://extensions/`
2. 打开“开发人员模式”
3. 点击“加载解压缩的扩展”
4. 选择本仓库目录：
   - `tugou-weather-station-extension`
5. 安装完成后，刷新目标站点页面

## 方式二：安装 CRX 文件

适合手动分发安装。

### 安装步骤

1. 准备打包好的 `.crx` 文件
2. 打开扩展管理页：
   - Chrome：`chrome://extensions/`
   - Edge：`edge://extensions/`
3. 将 `.crx` 文件直接拖进扩展管理页
4. 按提示确认安装

### 注意

- 部分浏览器版本会限制直接拖拽安装第三方 `.crx`
- 如果安装被拦截，请改用“加载已解压扩展”的方式

## 方式三：Chrome Web Store 安装

Chrome 商店版本正在提交审核中。

审核通过后，可以直接通过 Chrome Web Store 安装，无需手动加载。

## 安装后如何使用

安装成功后，扩展只会在以下白名单站点生效：

- `https://gmgn.ai/*`
- `https://www.gmgn.ai/*`
- `https://axiom.trade/*`
- `https://www.axiom.trade/*`
- `https://debot.ai/*`
- `https://www.debot.ai/*`
- `https://web3.binance.com/zh-CN/about*`

进入这些页面后，你会看到土狗气象台悬浮监控窗。

## 首次使用建议

1. 点击一次悬浮窗，确保浏览器允许后续声音播放
2. 在设置里确认提示音是否开启
3. 按需要开启或关闭消息来源
4. 添加自己的关键词种子

## 常见问题

### 1. 安装后没有看到悬浮窗

请确认：

- 当前页面是否在白名单站点内
- 扩展是否已经启用
- 页面是否已经刷新

### 2. 没有声音提醒

请确认：

- 扩展里的声音开关已开启
- 浏览器没有拦截自动播放
- 已点击过一次页面或悬浮窗

### 3. 页面上没有新消息

扩展消息来自：

- [土狗气象台官网](https://tugoumeme.fun/)

如果官网当前没有对应消息，扩展里也不会显示。

## 相关链接

- 官网：[https://tugoumeme.fun/](https://tugoumeme.fun/)
- GitHub：[https://github.com/tugoumonitor/tugou-weather-station-extension](https://github.com/tugoumonitor/tugou-weather-station-extension)
- 隐私政策：[PRIVACY.md](./PRIVACY.md)
