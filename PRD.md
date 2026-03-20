# AI Resume Builder — Product Requirements Document (PRD)

**Version**: 1.5
**Date**: March 2026
**Status**: MVP v1 已实现并调试完成

---

## 1. 产品概述

### 核心价值主张

用户上传自己历史上写过的多份简历，系统从中提取"经历库"（Fact Bank）。每次投递时输入 JD（链接或文本），AI 自动选择最匹配的 title 框架，再根据 JD 改写 bullet points，生成一份高度定制、ATS 友好的一页简历。

### 解决的问题

- 同一段经历在不同简历里用了不同的 title 和侧重点，手动合并和维护成本高
- 每次投递都需要针对 JD 改写 bullet，费时且容易遗漏关键词
- ATS 筛选依赖精确关键词匹配，通用简历通过率低

### 目标用户

正在求职、需要针对不同岗位定制简历的职场人士，尤其是：
- 跨职能求职者（同一经历在不同简历里有不同 title）
- 频繁投递多个岗位的求职者
- 对 ATS 优化有意识但不知如何操作的用户

### MVP 范围

单用户、无需注册账号、Fact Bank 存储在本地（localStorage）

---

## 2. 用户旅程（Happy Path）

```
Step 1 — 建立 Profile（一次性）
─────────────────────────────────
上传 1 至多份简历（PDF / Word / 粘贴文本）
         ↓
AI 解析所有文件
  • 识别同一家公司的经历
  • 每份简历 → 该经历的一个 Version（该简历里的 title + bullets）
  • 合并为统一 Fact Bank
         ↓
用户审阅 Fact Bank，可编辑、增删 Version / bullet


Step 2 — 针对某个 JD 生成简历（每次投递重复）
─────────────────────────────────────────────────
输入 JD（粘贴链接 或 粘贴全文）
         ↓
AI 两步生成：
  [Step 2a] Version 选择
    → 分析 JD 的职能偏向和职级
    → 为每段经历选择最匹配的 Version（即最合适的 title）
    → Version 选择以 title 职能匹配为最高优先级
  [Step 2b] Bullet 改写
    → 汇总该经历所有 Version 的全部 bullets 为候选池
    → 改写 bullets，将 JD 关键词嵌入，保留所有原始细节
         ↓
生成一页简历（Education → Skills → Work Experience）
         ↓
用户在 Preview 页面内联编辑微调
         ↓
Download PDF
```

---

## 3. 功能需求

### 模块一：Fact Bank 管理

#### 1.1 文档上传与解析

| 需求 | 优先级 |
|------|--------|
| 支持上传格式：PDF、Word (.docx)、纯文本粘贴 | P0 |
| **支持一次性上传多个文件**（多选或批量拖入） | P0 |
| 文件类型通过 magic bytes（文件头字节）判断，不依赖文件名或 MIME type | P0 |
| 每个文件独立解析，单文件失败不影响其他文件，错误单独显示 | P0 |
| AI 解析提取：工作经历、教育背景、技能、联系方式（含 LinkedIn / GitHub / 个人网站 URL） | P0 |
| 每份文件贡献一个 Version：保留该简历里的原始 title 和 bullets，不由 AI 凭空创作 | P0 |
| 多份文件中同一家公司的经历被归并到同一个 Experience 下，各成一个 Version | P0 |
| **Fact Bank 中 Version 只存 title + bullets，不存 phrasings** | P0 |
| 单文件上传时仅生成一个 Version；用户如需更多 Version，可在 Fact Bank 里手动添加 | P0 |

> **文件类型检测逻辑（magic bytes）**
>
> | 文件头字节 | 识别类型 | 解析方式 |
> |-----------|---------|---------|
> | `%PDF`（0x25 0x50 0x44 0x46） | PDF | pdf-parse@1.1.1 |
> | `PK`（0x50 0x4B，ZIP 头） | DOCX | mammoth |
> | 其他 | 纯文本 | UTF-8 直读 |
>
> 文件名中含 `.docx` 字样但实际内容为 PDF 的情况（如 `resume.docx.pdf`）可正确处理。

> **Version 生成逻辑**
>
> | 上传情况 | 结果 |
> |----------|------|
> | 1 份简历 | 每段经历有 1 个 Version |
> | 3 份简历（含同一家公司）| 该公司经历有 3 个 Version，各对应一份简历的视角 |
> | 3 份简历（公司各不同）| 每段经历各有 1 个 Version，共 3 段经历 |

#### 1.2 Fact Bank 编辑 UI

| 需求 | 优先级 |
|------|--------|
| 以卡片形式展示每段经历，可展开编辑 | P0 |
| 同一经历的多个 Version 以 Tab（div[role=tab]）形式展示，Tab 内含删除按钮 | P0 |
| 用户可修改任意 Version 的 title、bullet 文字 | P0 |
| 用户可删除 / 添加 bullet | P0 |
| 用户可手动新增一个 Version（空白模板） | P0 |
| 用户可手动新增一段完整经历 | P0 |
| Fact Bank 自动保存到 localStorage（1 秒防抖），刷新不丢失 | P0 |
| 支持导出 Fact Bank 为 JSON / 导入 JSON | P1 |

---

### 模块二：JD 输入与简历生成

#### 2.1 JD 输入

| 需求 | 优先级 |
|------|--------|
| **方式 A：粘贴 JD 链接（URL）**，系统自动抓取页面内容提取 JD 文本 | P0 |
| **方式 B：粘贴 JD 全文**（兜底方案，当 URL 抓取失败时提示用户用此方式） | P0 |
| URL 抓取失败时给出明确提示，引导用户切换为粘贴文本 | P0 |

> **URL 抓取的局限性**
>
> - 大部分公开职位页面（Greenhouse、Lever、公司官网）可直接抓取
> - LinkedIn 职位页需要登录，**无法直接抓取**，提示用户手动复制文本
> - 抓取超时（> 5 秒）自动降级到粘贴模式

#### 2.2 AI 两步生成逻辑

**Step 2a — Version 选择（Title 选择）**

| 需求 | 优先级 |
|------|--------|
| 解析 JD：提取核心职能、职级、Top 10 ATS 关键词 | P0 |
| 对每段经历的每个 Version 按三个维度评分：(1) title 职能匹配、(2) bullet 关键词重叠、(3) 职级对齐 | P0 |
| **title 职能匹配为最高权重**：若有 Version 的 title 职能与 JD 一致，必须优先选该 Version，即使其他 Version 的 bullet 含更多关键词 | P0 |
| Version 选择为通用三步打分逻辑，不在 prompt 中写死任何具体职能→Version 的映射例子 | P0 |

> **Version 选择设计原则**
>
> Title 决定 ATS 能否通过第一道关卡，bullet 关键词可在 Step 2b 改写时补充。
> 因此即使某 Version 的 bullet 含更多 JD 关键词，只要其 title 职能与 JD 不一致，就应排在职能匹配 Version 之后。
>
> **已知 Bug 修复记录**：早期 prompt 中曾用 `"Project Manager when the JD is for a Data Analyst"` 作为反面例子，导致 AI 将 PM frame 泛化为"坏选择"，在 PM JD 下也回避了 PM frame。修复方式：删除所有具体职能例子，改为纯规则描述（三步打分）。

**Step 2b — Bullet 改写（逐条映射，非自由生成）【默认保守模式】**

核心机制：后端在调用 AI 之前，将每段经历所有 Version 的所有 bullet 提取出来、**显式编号** `[1][2][3]...` 后传给 AI。AI 的任务是逐条改写，不是自由生成。Step 2a（Version 选择）与 Step 2b（Keyword Report + Bullet 改写 + Skills 重排）**并行执行**，总生成时间约 10–15 秒。

改写规则：
1. **去重合并**：编号列表中描述**完全相同**成就的 bullet（跨 Version 重复表达）→ 合并为一条输出
2. **独有 bullet**：描述不同成就的每一条 → 各输出一条改写版本
3. **输出数量 = 去重后的不同成就数**，可能是 3 条，也可能是 8 条，由素材决定
4. 不因"简历太长"在改写阶段跳过 bullet，跳过只在页面检查阶段发生

默认保守改写要求：
- **最小改动原则**：仅修正 variant form（如 "A/B testing" → "A/B test"）并插入缺失关键词，不大幅重写句子结构
- 以强动词开头，嵌入 JD 关键词（逐字镜像，不改写原 JD 短语）
- 保留所有原始细节：数字、百分比、工具名、团队规模、专有名词，一个不能少
- 不捏造原始素材中没有的事实或数字

| 需求 | 优先级 |
|------|--------|
| 后端预处理：提取所有 Version 的 bullet 并显式编号后传给 AI | P0 |
| AI 对编号列表逐条改写，合并完全重复的，不跳过独有的 | P0 |
| 改写时嵌入 JD 关键词（逐字镜像）| P0 |
| 保留原始 bullet 的所有细节，不简化，不捏造 | P0 |
| bullet 输出数量由素材中不同成就的数量决定，不设固定上下限 | P0 |
| 不生成 Summary | P0 |
| 技能按 JD 相关度筛选，AI 自主决定分组数量和分组名称（1–3 组），以 `"Category: skill1, skill2"` 格式输出（方案 A） | P0 |
| 每组独占一行，Category 名称加粗，行首加 `•` | P0 |

#### 2.3 Boost ATS 模式（激进优化）

默认生成完成后，用户可点击 **Boost ATS Score** 触发第二轮 AI 优化，目标是最大化 ATS 关键词覆盖率。

| 需求 | 优先级 |
|------|--------|
| Boost 为独立的第二轮 AI 调用，不影响默认生成结果 | P0 |
| 主动将 Keyword Report 中 missing 的 business context 关键词插入现有 bullet | P0 |
| hard skill 关键词：优先插入 bullet，若不自然则追加到 Skills 分组 | P0 |
| 无法自然嵌入的词不强行添加，不伪造事实 | P0 |
| Boost 完成后 ATS 分数自动重新计算并展示提升幅度 | P0 |
| Boost 后按钮变为"Boosted"状态，防止重复触发 | P0 |

> **设计意图**：默认模式保持简历的真实感和可读性；Boost 模式面向 ATS 最大化场景，用户明确知晓是激进优化。

#### 2.4 一页约束

| 需求 | 优先级 |
|------|--------|
| AI 先完成所有 bullet 改写（不预设数量限制），再整体评估是否超出一页 | P0 |
| 超出时按优先级逐条删减：先删最不相关的 bullet，最后才删整段经历 | P0 |
| 不足时补充 bullet 或纳入更多经历，不留大片空白 | P0 |
| 不得在生成/改写阶段预先限制 bullet 数量、词数或行数 | P0 |
| 预览中显示一页边界线（视觉提示） | P1 |

---

### 模块三：投递记录（Applications Log）

#### 3.1 触发与保存

| 需求 | 优先级 |
|------|--------|
| 用户点击 **Download PDF** 后，自动将本次投递记录保存到 Applications | P0 |
| 用户也可在生成简历后点击 **Save Application** 手动保存（不依赖下载） | P0 |
| 同一次生成只保存一条记录，重复点击 Download 不产生重复条目 | P0 |
| 每条记录包含：company、role、jdText、resume 快照（GeneratedResume 完整对象）、ATS 分数、保存时间 | P0 |

#### 3.2 Applications Tab UI

| 需求 | 优先级 |
|------|--------|
| 独立 Tab，标签显示记录总数 | P0 |
| 卡片列表：展示日期、role@company、ATS 分数徽章 | P0 |
| 点击展开查看完整简历内容（contact、skills、experiences） | P0 |
| 每条记录可单独删除 | P0 |
| 空状态友好提示 | P0 |
| null 字段容错：任何字段为 null 时不崩溃，跳过展示 | P0 |

#### 3.3 导出与导入

| 需求 | 优先级 |
|------|--------|
| 支持导出全部记录为 JSON 文件（防止 localStorage 被清空） | P0 |
| 支持导入 JSON 文件恢复记录，与现有记录合并（去重 by id） | P0 |

#### 3.4 存储

- 数据存储在 localStorage，key 独立于 Fact Bank
- 每条记录有唯一 `id`（timestamp-based）和 `date` 字符串
- 读取时做 null-safe sanitize，旧数据格式兼容

---

### 模块四：简历格式规范

#### 3.1 Section 顺序（固定）

```
1. Education
2. Skills
3. Work Experience
```

#### 3.2 排版格式

| 元素 | 格式规范 |
|------|----------|
| 姓名 | 居中，大号加粗，Arial 10pt |
| Contact 行 | 居中，\| 分隔；phone、email、LinkedIn、GitHub、Website |
| LinkedIn / GitHub / Website | Preview 和 PDF 中均为**可点击超链接**，显示文字而非原始 URL |
| Section 标题 | **全大写加粗**，下方粗黑实线（EDUCATION / SKILLS / WORK EXPERIENCE）|
| 公司名 / 学校名 | **加粗** |
| 学位名称 | *斜体* |
| **专业方向（Field of Study）** | ***斜体 + 加粗***（与学位名称在同一行，逗号分隔） |
| 公司名 + 地点 | 同一行，地点右对齐 |
| 职位 + 日期 | 同一行，日期右对齐 |
| Bullet | 圆点 •，文字 justify 对齐 |
| **Skills 分组行** | 每组一行，行首 `•`，Category 名称**加粗**，后接冒号和逗号分隔的技能列表 |
| 行间距 | 紧凑（lineHeight 1.25），section/experience 间距最小化 |

#### 3.3 Preview 与 PDF 一致性

| 需求 | 优先级 |
|------|--------|
| Preview 即所见即所得，与 PDF 视觉高度一致 | P0 |
| 用户可点击任意文字进行内联编辑 | P0 |
| 超链接在 Preview 可点击，PDF 保留链接注释 | P0 |
| PDF 使用 Helvetica / Helvetica-BoldOblique，纯文字，无图片/表格，ATS-safe | P0 |
| 严格一页（LETTER 尺寸） | P0 |

---

### 模块五：PDF 导出

| 需求 | 优先级 |
|------|--------|
| 点击"Download PDF"直接触发下载 | P0 |
| PDF 纯文字，ATS-safe | P0 |
| 字体 Helvetica，Section 标题全大写 | P0 |
| 专业方向使用 Helvetica-BoldOblique（斜体加粗） | P0 |
| 页边距 ~0.5 inch，严格一页 | P0 |
| 超链接在 PDF 中可点击 | P0 |

---

## 4. 非功能性需求

| 需求 | 目标 |
|------|------|
| 简历生成时间 | < 15 秒 |
| URL 抓取超时 | 5 秒，超时自动降级为粘贴模式 |
| 设备支持 | 桌面优先 |
| 数据隐私 | 用户文档仅在请求时传给 OpenAI，不在服务器持久化 |
| 离线 Fact Bank | localStorage 存储，无网络也可查看/编辑 |

---

## 5. 技术方案

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| 框架 | Next.js 16 (App Router, Turbopack) | 前后端一体，部署简单 |
| AI | OpenAI GPT-4o | 最强指令遵循，JSON mode 稳定 |
| 文件解析 | `pdf-parse@1.1.1` + `mammoth` | 服务端解析，稳定；版本锁定 1.1.1 |
| 文件类型检测 | Magic bytes（文件头字节）| 不依赖 MIME type 或文件名扩展名 |
| URL 抓取 | `cheerio` + Node `fetch` | 轻量 HTML 解析，无需 headless browser |
| PDF 生成 | `@react-pdf/renderer` | 真正文本 PDF，ATS-safe，支持链接，支持 BoldOblique |
| 样式 | Tailwind CSS v4 | 快速开发 |
| 存储 | localStorage | MVP 无需数据库 |
| 部署 | Vercel | 零配置，支持 Next.js |
| API 上下文管理 | Fact Bank 拆分传输（contact/education/skills 优先，experiences 后发）| 防止 education 被字符限制截断导致 AI 幻觉 |

---

## 6. 数据模型

### Fact Bank 核心结构

```
FactBank
├── contact: { name, email, phone, location, linkedin, github, website }
├── experiences[]
│   ├── company, location, startDate, endDate
│   └── versions[]            ← 每个 Version 来自一份真实简历
│       ├── id
│       ├── title              ← 该简历里的实际 title
│       ├── bullets[]          ← 原始 bullet 文本
│       └── sourceFile         ← 来源文件名
├── education[]
│   ├── school, location, degree, field, startDate, endDate
│   └── notes[]
└── skills[]              ← 扁平字符串数组，每条为一个分类行，如 "Technical: Python, SQL"
```

### Generated Resume 结构

```
GeneratedResume
├── contact
├── education[]               ← Section 1，完整复制自 Fact Bank，不得省略任何条目
├── skills[]                  ← Section 2，AI 按 JD 相关度分组，格式 "Category: skill1, skill2"，1–3 组
├── experiences[]             ← Section 3
│   ├── company, title        ← title 来自选中的 Version（Version 选择以职能匹配为最高优先级）
│   ├── location, startDate, endDate
│   └── bullets[]             ← 跨所有 Version 汇总候选池，保留所有细节，嵌入 JD 关键词
└── jdKeywordCoverage         ← { covered[], missing[] }
```

> 无 summary 字段

---

## 7. 已知设计决策与约束

| 问题 | 决策 |
|------|------|
| Version 选择规则 | 通用三步打分（Step 1 识别 JD 职能 → Step 2 三维打分 → Step 3 选最高分）；prompt 中不写死任何具体职能例子，避免 AI 偏向某一职能 |
| Bullet 数量 | 后端显式编号所有 source bullet 传给 AI，AI 逐条映射改写；输出数量 = 去重后的不同成就数，不设固定上下限；页面裁剪在改写完成后单独进行 |
| Skills 分类 | 方案 A（AI 自主决定）：AI 根据 JD 和用户实际技能自主选择分组名称和数量（1–3 组），以 `"Category: items"` 格式输出；方案 B（保留原始分类）暂未实现，后续可考虑 |
| Education 完整性 | contact/education/skills 作为"关键段"优先完整传输，防止被 experiences 的大体量截断 |
| 文件类型检测 | 使用 magic bytes，避免文件名含多个扩展名（如 `resume.docx.pdf`）时误判 |

---

## 8. UI 设计优化工具链

目标：去 AI 味、提升审美质感。使用以下 Claude Code skills 组合进行递进式 UI 优化。

| Skill | 作用 |
|-------|------|
| `/audit` | 全面诊断界面质量问题，找出所有设计缺陷 |
| `/critique` | 针对性批评当前设计，指出具体问题 |
| `/polish` | 细节打磨 — 间距、对齐、视觉层次 |
| `/typeset` | 字体排印优化，去掉默认 AI 风格字体感 |
| `/colorize` | 色彩方案优化 |
| `/bolder` | 让设计更有视觉冲击力，不那么"平淡" |

**推荐工作流程：**

```
/audit    → 扫描整个 UI 找出所有问题
    ↓
/critique → 针对最明显的问题做深入批评
    ↓
/typeset  → 先改字体排印（往往是 AI 味的主要来源）
    ↓
/colorize → 改色彩
    ↓
/polish   → 最后做细节收尾
    ↓
/bolder   → 可选，如果想要更有力的视觉风格
```

> 性价比最高的组合：`/audit` → `/polish` → `/typeset`，先跑这三个看效果，不满意再加 `/colorize` 和 `/bolder`。

---

## 9. 超出 MVP 范围（后续版本）

| 功能 | 版本 |
|------|------|
| 用户账号 + 云端 Fact Bank 同步 | v2 |
| 云端 Applications 历史记录同步 | v2 |
| ATS 评分可视化 dashboard | v2 |
| 中文简历支持 | v2 |
| 多种简历模板风格 | v2 |
| LinkedIn 导入 | v2 |
| Chrome Extension（从 JD 页面直接生成）| v3 |
