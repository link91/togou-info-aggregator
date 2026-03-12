# 土狗气象台 Skill

`togou-info-aggregator` 是一个用来读取 [土狗气象台](https://tugoumeme.fun/) 的 Web2 热点数据，并在需要时继续补充 Binance Web3 的公开研究能力，把”热点新闻”延伸成”可继续研判的题材线索”。

网站地址：

- [https://tugoumeme.fun/](https://tugoumeme.fun/)

## 这个 skill 能做什么

这份 skill 不只是读取最新消息，还能把热点往更完整的研究流程上延伸。当前能力包括：

- 读取系统状态、最新消息、分组统计、全平台热搜、单平台热搜
- 按关键词搜索最近热点
- 查看 Meme 潜力榜
- 从 Web2 热点里提取关键词、品牌、人名、事件名、梗词和题材词
- 将关键词进一步映射到 Binance Web3 的公开 token / 叙事 / 社交热度查询
- 补充 token 元信息、动态数据、安全审计、钱包持仓、Smart Money、Social Hype、Meme Rush 等公开研究数据

这个 skill 的重点不是“直接从新闻里找 CA”，而是：

1. 先从 Web2 热点里提取关键词和题材
2. 再判断这些题材有没有映射到链上
3. 在已经确认 token / CA / 地址后，继续做更深入的链上验证

## 适合什么场景

适合下面这些任务：

- 看今天最值得关注的热点和热搜
- 从 Web2 热点里筛出可能映射到链上的题材
- 对某个 token / CA / 地址做快速研究补全
- 把一条热点整理成“新闻 + 热度 + 风险 + 聪明钱”的研究卡片
- 生成适合发群、发推或继续跟踪的研究摘要

## 仓库结构

```text
skills/
  togou-info-aggregator/
    SKILL.md
```

核心文件：

- [skills/togou-info-aggregator/SKILL.md](./skills/togou-info-aggregator/SKILL.md)

## 安装方式

### 手动安装

1. 打开 [skills/togou-info-aggregator/SKILL.md](./skills/togou-info-aggregator/SKILL.md)
2. 将文件复制到你本地的 skill 目录
3. 按你的运行环境要求加载该 skill

## 已知问题

目前暂无已知问题。

## 数据来源

### 土狗气象台公开接口

- `/api/status`
- `/api/messages`
- `/api/channels/groups`
- `/api/hot-search/`
- `/api/hot-search/{source}`
- `/api/hot-search/search`
- `/api/hot-search/ranking`

### Binance Web3 公开研究能力

用于在热点命中后补充：

- token search
- token metadata
- dynamic market data
- token audit
- wallet holdings
- smart money
- social hype / rank
- meme rush / topic rush

## 当前版本

- `2.2.0`

## License

MIT
