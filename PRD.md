# AI Resume Builder — Product Requirements Document (PRD)

**Version**: 1.6
**Date**: March 2026
**Status**: MVP v1 已实现并调试完成

---

## 1. 产品概述

### 核心价值主张

用户上传自己历史上写过的多份简历，系统从中提取"经历库"（Fact Bank）。每次投递时输入 JD（链接或文本），AI 自动选择最匹配的 title 版本，再根据 JD 改写 bullet points，生成一份高度定制、ATS 友好的一页简历。

### 解决的问题

- 同一段经历在不同简历里用了不同的 title 和侧重点，手动合并和维护成本高
- 每次投递都需要针对 JD 改写 bullet，费时且容易遗漏关键词
- ATS 筛选依赖精确关键词匹配，通用简历通过率低
- 投递记录分散，难以追踪每次投递使用了哪个版本的简历

### 目标用户

正在求职、需要针对不同岗位定制简历的职场人士，尤其是：
- 跨职能求职者（同一经历在不同简历里有不同 title）
- 频繁投递多个岗位的求职者
- 对 ATS 优化有意识但不知如何操作的用户

### MVP 范围

单用户、无需注册账号、所有数据存储在本地（localStorage）

---

## 2. 用户旅程（Happy Path）

```
Step 1 — 建立 Fact Bank（一次性）
─────────────────────────────────
上传 1 至多份简历（PDF / DOCX / TXT）
         ↓
AI 解析所有文件（每个文件独立解析）
  • 识别同一家公司的经历（按 company 名归并）
  • 每份简历 → 该经历的一个 Version（title + bullets）
  • 合并为统一 Fact Bank，自动保存到 localStorage
         ↓
用户审阅 Fact Bank，可编辑 contact、education、skills、experiences
每段经历可有多个 Version（不同 title + bullets）


Step 2 — 针对某个 JD 生成简历（每次投递重复）
─────────────────────────────────────────────────
输入 JD（粘贴 URL → 自动抓取，或直接粘贴全文）
URL 抓取后内容可直接编辑（修正抓取错误）
         ↓
AI 四步并行生成（两轮 Promise.all）：
  [轮1 并行]
    A. Version 选择：为每段经历选出最匹配 JD 职能的 title
    B. JD Keyword Report：提取 Hard Skills / Business Context / Title Keywords 等分类
  [轮2 并行，依赖轮1结果]
    C. Bullet 改写（保守模式）：对选中 Version 的 bullets 逐条最小改写，嵌入 JD 关键词
    D. Skills 重排：按 JD 相关度重新分组，保留所有原始技能，整合为 2–3 组
         ↓
一页约束检查：渲染 PDF → 若超页 → 循环删除最低分 bullet（最多 15 轮）
         ↓
生成完成，展示简历预览 + ATS Score Card（before/after 分数对比）


Step 3 — 审阅、编辑、优化
─────────────────────────────
ATS Score Card 显示：before/after 得分环、+N% 提升、缺失关键词列表
展开 Keyword Report 查看 Hard Skills / Business Context / Top 10 等分类
点击简历任意文字内联编辑
悬停行显示 × 删除按钮
点击"Recalculate"即时重新计算分数（纯前端，无 AI 调用）
可选：点击"Boost ATS"触发激进优化（独立 AI 调用）
  → 主动插入缺失 business context 到 bullets
  → 缺失 hard skill 先尝试插入 bullets，若无法自然插入则追加到 Skills 分组
  → Boost 完成后按钮变为"Boosted"，防止重复触发


Step 4 — 保存 & 下载
─────────────────────────────
点击"Download PDF" → 服务端渲染 PDF → 浏览器下载
  → 自动保存一条 Application 记录到 Applications log（每次生成只保存一次）
或点击"Save Application"手动保存（不依赖下载）
保存后显示"✓ Saved to Applications"，按钮变灰不可重复点击


Step 5 — Applications 历史
─────────────────────────────
切换到 Applications Tab 查看所有投递记录
每条记录：日期、role @ company、ATS 分数徽章、+improvement%
点击展开：contact、skills、experience bullets、原始 JD 文本
可单条删除 / 导出全部 JSON / 导入 JSON（去重合并）
```

---

## 3. 功能需求

### 模块一：Fact Bank 管理

#### 1.1 文档上传与解析

| 需求 | 优先级 |
|------|--------|
| 支持上传格式：PDF、DOCX、纯文本（TXT） | P0 |
| 支持一次性上传多个文件（多选或批量拖入） | P0 |
| 文件类型通过 magic bytes（文件头字节）判断，不依赖文件名或 MIME type | P0 |
| 每个文件独立解析，单文件失败不影响其他文件，错误单独显示 | P0 |
| AI 解析提取：工作经历、教育背景、技能、联系方式（含 LinkedIn / GitHub / 个人网站 URL） | P0 |
| 每份文件贡献一个 Version：保留该简历里的原始 title 和 bullets，不由 AI 凭空创作 | P0 |
| 多份文件中同一家公司的经历（按 company 名不区分大小写归并）各成一个 Version | P0 |
| Fact Bank 中 Version 只存 title + bullets（不存 date ranges，date 存在 Experience 层） | P0 |
| 单文件上传时仅生成一个 Version；用户如需更多 Version，可在 Fact Bank 里手动添加 | P0 |
| 上传新文件时与现有 Fact Bank 合并：同名公司追加 Version，不同公司新增 Experience | P0 |

> **文件类型检测逻辑（magic bytes）**
>
> | 文件头字节 | 识别类型 | 解析方式 |
> |-----------|---------|---------|
> | `%PDF`（0x25 0x50 0x44 0x46） | PDF | pdf-parse@1.1.1 |
> | `PK`（0x50 0x4B，ZIP 头） | DOCX | mammoth.extractRawText |
> | 其他 | 纯文本 | UTF-8 直读 |
>
> 文件名含多个扩展名（如 `resume.docx.pdf`）可正确处理，因为检测依赖字节而非名称。

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
| 以卡片形式展示每段经历，点击展开编辑 | P0 |
| 同一经历的多个 Version 以 Tab（div[role=tab]）形式展示，Tab 内含删除按钮 | P0 |
| 用户可修改任意 Version 的 title、bullet 文字 | P0 |
| 用户可删除 / 添加 bullet | P0 |
| 用户可手动新增一个 Version（空白模板，title="New Title"，1 个空 bullet） | P0 |
| 用户可手动新增一段完整经历（company="New Company"，1 个默认 Version） | P0 |
| Fact Bank 自动保存到 localStorage（1 秒防抖），刷新不丢失 | P0 |
| 支持导出 Fact Bank 为 JSON / 导入 JSON（导入直接替换整个 Fact Bank） | P1 |
| Contact 区域：所有字段可编辑（name, email, phone, location, linkedin, github, website） | P0 |
| Education 区域：school, location, degree, field, startDate, endDate 可编辑，可删除整条 | P0 |
| Skills 区域：每行格式为 `"Category: skill1, skill2"`，可增删改 | P0 |

---

### 模块二：JD 输入与简历生成

#### 2.1 JD 输入

| 需求 | 优先级 |
|------|--------|
| **方式 A：粘贴 JD 链接（URL）**，系统自动抓取页面内容提取 JD 文本 | P0 |
| URL 抓取成功后，显示**可编辑的 textarea**（透明背景，无边框），用户可直接修改抓取内容 | P0 |
| **方式 B：粘贴 JD 全文**（兜底方案，当 URL 抓取失败时提示用户用此方式） | P0 |
| LinkedIn URL 直接返回错误提示，不尝试抓取，不自动切换到文本模式 | P0 |
| 非 LinkedIn URL 抓取失败时：显示错误，自动切换到文本输入模式 | P0 |
| URL 抓取超时（5 秒）自动返回错误，提示用户粘贴文本 | P0 |

> **URL 抓取实现细节**
>
> - 5 秒 `AbortController` 超时
> - User-Agent 模拟 Chrome 120
> - 用 cheerio 清除 script/style/nav/header/footer/cookie banner
> - 按优先级尝试选择器：`[class*="job-description"]` → `[class*="description"]` → `main` → `article` → `body`
> - 抓取结果截断至 8000 字符
> - 内容少于 100 字符视为失败

#### 2.2 AI 生成逻辑（四步两轮并行）

**实际执行顺序（两轮 Promise.all）：**

```
[第一轮 并行]
  A. Version 选择（buildVersionSelectionPrompt）
  B. JD Keyword Report（buildJDReportPrompt）

等待第一轮完成后 ↓

[第二轮 并行]
  C. Bullet 改写（buildBulletRewritePrompt）   ← 依赖 A 的 version 选择结果 + B 的关键词
  D. Skills 重排（buildSkillsPrompt）          ← 依赖 B 的 JD 文本

等待第二轮完成后 ↓

一页约束检查（循环渲染 PDF + 裁剪）
```

所有 AI 调用均使用 `gpt-4o`，`response_format: { type: 'json_object' }`。

---

**Step A — Version 选择**

- 传入：JD 文本（截断至 3000 字符）+ 每段经历的 `{id, company, versions: [{id, title}]}`（**不传 bullets**）
- 选择标准：完全基于 title 职能匹配，不考虑 bullet 内容
- 提供正向优先级例子（非反面例子）：
  - PM JD: "Product Manager" > "Project Manager" > "Data Analyst"
  - Data Analyst JD: "Risk Data Analytics" > "Project Manager" > "Product Manager"
  - "Cofounder | Product" = product management 职能
- 若无 title 与 JD 职能接近，选择最具可迁移技能的 Version
- `temperature: 0.1`

> **设计原则**：Title 决定 ATS 能否通过第一道关卡，bullet 关键词可在 Step C 改写时补充。
>
> **已知 Bug 修复记录**：早期 prompt 中曾使用反面例子（"don't pick PM when JD is Data Analyst"），导致 AI 在 PM JD 下也回避 PM title。修复：改为正向优先级排序，不使用反面例子。

---

**Step B — JD Keyword Report**

- JD 文本截断至 3000 字符
- 使用 JD 中的**精确原文短语**，不通用化
- 不提取软技能（communication, teamwork 等，无 ATS 价值）
- 提取分类：
  - `titleKeywords`：max 4，职位名称及相近职能词
  - `hardSkills`：max 12，工具、语言、平台、技术方法
  - `actionKeywords`：max 8，来自 Responsibilities 的 "动词+宾语" 短语
  - `businessContext`：max 10，业务场景和领域概念（如 roadmap、stakeholder management）
  - `domainKeywords`：max 5，行业词（如 SaaS、B2B、fintech）
  - `hardFilters`：max 6，明确要求（如 "3+ years"、"SQL required"）
  - `top10`：最重要的 10 个关键词，按重要性排序
- `temperature: 0.1`

---

**Step C — Bullet 改写（保守模式，默认）**

- 输入：仅使用**选中 Version 的 bullets**（不合并所有 Version）
- Bullets 显式编号：`[1] bullet text\n[2] bullet text...`
- 改写规则（严格顺序）：
  1. **RETURN UNCHANGED**：不需要关键词改动的 bullet → 完全原样复制，字符不差
  2. **VARIANT FIX**：bullet 中存在关键词的变体形式（如 "A/B testing" vs JD 里的 "A/B test"）→ 只替换那个词/短语，其他一字不改
  3. **KEYWORD INSERT**：MISSING 关键词 → 找最相关的 bullet 自然插入，编辑量最小；若无法自然插入则跳过，不强行
  4. 绝不捏造事实、数字、工具名、公司名
  5. bullet 结尾不加句号
  6. **返回与输入完全相同数量的 bullets**（不合并、不拆分、不删除）
- `temperature: 0.2`

---

**Step D — Skills 重排**

- JD 文本截断至 1500 字符
- 保留用户所有原始技能，一个不漏
- 整合为恰好 2–3 个分组
- JD 相关技能在每组内排在前面
- 格式：`"CategoryName: skill1, skill2, skill3"`
- `temperature: 0.2`

---

**ATS 评分算法（加权）**

```
hardSkills:     每个关键词 2 分
titleKeywords:  每个关键词 1.5 分
businessContext: 每个关键词 1 分
score = Math.round(earned / total * 100)   // 0–100
```

**关键词匹配逻辑（三步递进）**：
1. 精确子字符串匹配（不区分大小写）
2. 词干化后匹配（去除 ing / tion / ment / ed / er / ly / s / es）
3. 多词短语：每个词单独匹配（精确或词干）

BEFORE 分数：基于选中 Version 的 `[title + bullets]` 计算
AFTER 分数：基于最终简历的 `[titles + bullets + skills]` 计算

---

**生成进度 UI（假进度步骤）**

生成期间在 Generate 按钮下方显示 4 个步骤，按时间轴依次变绿：

| 步骤 | 文案 | 变绿时间 |
|------|------|---------|
| 1 | Selecting best title version for each experience... | 立即（t=0） |
| 2 | Analyzing JD keywords... | t = 4 秒 |
| 3 | Rewriting bullets with JD keywords... | t = 9 秒 |
| 4 | Fitting to one page... | t = 16 秒 |

- `i < activeStep`：绿色实心点，文字 `var(--text)`（已完成）
- `i === activeStep`：绿色脉冲点（`animate-pulse`），文字 `var(--text)`（进行中）
- `i > activeStep`：灰色点（`var(--border-2)`），文字 `var(--text-dim)`（待进行）
- 生成完成后所有 timer 清除，步骤重置

#### 2.3 Boost ATS 模式（激进优化）

默认生成完成后，用户可点击 **Boost ATS** 触发第二轮 AI 优化，目标是最大化 ATS 关键词覆盖率。

| 需求 | 优先级 |
|------|--------|
| Boost 为独立的第二轮 AI 调用，基于当前已生成的简历内容 | P0 |
| 主动将缺失的 business context + action keywords 插入现有 bullets（允许小幅改写该短语）| P0 |
| 缺失的 hard skill：先尝试插入 bullets；bullets 改写后仍缺失的，追加到 Skills 分组 | P0 |
| 无法自然嵌入的词跳过，不伪造事实 | P0 |
| Boost 完成后 ATS 分数自动重新计算并展示 | P0 |
| Boost 后按钮变为"Boosted"状态（同款 pill 样式），防止重复触发 | P0 |
| experience 的 key 使用 `"${company}-${title}"` 复合字符串（Boost API 中无 UUID）| P0 |

> **设计意图**：默认模式保持简历真实感和可读性；Boost 模式面向 ATS 最大化场景，用户明确知晓是激进优化。

#### 2.4 一页约束

| 需求 | 优先级 |
|------|--------|
| Bullet 改写阶段不预设数量限制，改写完成后再做一页检查 | P0 |
| 超出一页时：服务端渲染 PDF → `pdf-parse` 读取页数 → 循环裁剪（最多 15 轮）| P0 |
| 每轮裁剪：找出 ATS 得分最低的 bullet（`hardSkill 命中 × 2 + businessContext 命中 × 1`），删除一条 | P0 |
| 每段经历最少保留 1 条 bullet，不删至 0 | P0 |
| 优先删最早（最后入职）的经历的低分 bullet；若最新经历得分明显更低则删最新 | P0 |
| PDF 渲染失败时假设 1 页，不中断生成流程 | P0 |
| Preview 中在 `top: 1008px` 位置显示红色虚线（页面边界视觉提示）| P0 |

---

### 模块三：投递记录（Applications Log）

#### 3.1 触发与保存

| 需求 | 优先级 |
|------|--------|
| 用户点击 **Download PDF** 后，自动将本次投递记录保存到 Applications（首次下载触发，重复点击不重复保存）| P0 |
| 用户也可点击 **Save Application** 手动保存（不依赖下载，按钮在 Generate tab 页头）| P0 |
| 保存后按钮变为"✓ Saved to Applications"并禁用，页头同时显示绿点"Saved"指示 | P0 |
| 新生成简历时重置 saved 状态，允许对新简历再次保存 | P0 |
| 每条记录包含：`id`、`date`（ISO）、`company`、`role`、`resume`（GeneratedResume 完整快照）、`jdText` | P0 |
| company 和 role 来自 `resume.jdReport.company` 和 `resume.jdReport.role`（AI 从 JD 提取）| P0 |

#### 3.2 Applications Tab UI

| 需求 | 优先级 |
|------|--------|
| 独立 Tab，Tab 标签显示记录总数徽章 | P0 |
| 卡片列表：日期（DM Mono）、role @ company（Syne 700）、ATS 分数绿色徽章、+N% 提升 | P0 |
| 点击卡片展开：contact（name + email/phone/location）、skills、experiences（bullets）、原始 JD（collapsible `<details>`，截断至 2000 字符）| P0 |
| 每条记录右侧 Remove 按钮，hover 变红 | P0 |
| 空状态：显示图标 + 说明文字 + Import JSON 按钮 | P0 |
| 所有字段 null-safe：任何字段为 null 时显示"—"，不崩溃 | P0 |

#### 3.3 导出与导入

| 需求 | 优先级 |
|------|--------|
| 导出：触发 `applications-{日期}.json` 下载 | P0 |
| 导入：读取 JSON 文件，按 `id` 去重合并（imported 中不存在的 id 才插入），持久化到 localStorage | P0 |

#### 3.4 存储

- localStorage key: `resume_builder_applications`（独立于 Fact Bank 的 `resume_builder_factbank`）
- 每条记录 `id` = `Math.random().toString(36).slice(2) + Date.now().toString(36)`
- 读取时每条记录过 `sanitize()`：为所有字段提供 null-safe 默认值
- 新记录 `unshift`（插入最前，最新在上）

---

### 模块四：简历格式规范

#### 4.1 Section 顺序（固定）

```
1. Education
2. Skills
3. Work Experience
```

#### 4.2 排版格式

| 元素 | 格式规范 |
|------|----------|
| 姓名 | 居中，Times-Bold 14pt |
| Contact 行 | 居中，`\|` 分隔；phone、email（mailto 链接）、LinkedIn、GitHub、Website（后三个显示文字而非 URL）|
| LinkedIn / GitHub / Website | Preview 和 PDF 中均为**可点击超链接**，显示 "LinkedIn" / "GitHub" / "Website" 文字 |
| Section 标题 | **全大写加粗**，下方 2px 实线（EDUCATION / SKILLS / WORK EXPERIENCE）|
| 公司名 / 学校名 | **加粗**（Times-Bold），右侧地点同行右对齐 |
| 职位名称 | *Times-Italic* |
| 学位名称 | *Times-Italic* |
| **专业方向（Field of Study）** | ***Times-BoldItalic***（与学位名称同行，逗号分隔）|
| 日期 | 右对齐，`#333333` 色 |
| Bullet | 圆点 •，文字 `textAlign: justify` |
| **Skills 分组行** | 行首 `•`，Category 名称 **Times-Bold**，后接冒号和逗号分隔的技能列表 |
| 行间距 | `lineHeight: 1.25`，section/experience 间距最小化 |
| 字体基础 | Times-Roman 8.5pt（Preview: Cambria / Times New Roman，PDF: @react-pdf/renderer 内置 Times-Roman）|

#### 4.3 Preview 与 PDF 一致性

| 需求 | 优先级 |
|------|--------|
| Preview 即所见即所得，视觉与 PDF 高度一致（816px × 1056px，模拟 US Letter）| P0 |
| 用户可点击任意文字进行内联编辑（contentEditable，ref-based，不用 React 受控模式）| P0 |
| 超链接在 Preview 可点击，PDF 使用 `@react-pdf/renderer` 的 `<Link>` 组件保留超链接 | P0 |
| PDF 纯文字，无图片 / 表格，ATS-safe，字体 Times-Roman 系列 | P0 |
| 严格一页（LETTER 尺寸，padding 36pt 四边）| P0 |

---

### 模块五：PDF 导出

| 需求 | 优先级 |
|------|--------|
| 点击"Download PDF"直接触发浏览器下载 | P0 |
| PDF 服务端渲染（`renderToBuffer`），客户端不加载 `@react-pdf/renderer` | P0 |
| PDF 纯文字，ATS-safe，字体 Times-Roman 系列（Times-Roman / Times-Bold / Times-Italic / Times-BoldItalic）| P0 |
| 专业方向（field）使用 Times-BoldItalic | P0 |
| 页边距 36pt（约 0.5 inch）四边一致，严格一页 LETTER | P0 |
| 超链接在 PDF 中可点击（email mailto / linkedin / github / website）| P0 |
| 文件名：`{contact.name}.pdf`，name 为空时 fallback 到 `resume.pdf` | P0 |

---

## 4. 非功能性需求

| 需求 | 目标 |
|------|------|
| 简历生成时间 | 约 10–20 秒（两轮并行 AI 调用 + 一页检查）|
| URL 抓取超时 | 5 秒，超时返回错误，提示用户粘贴文本 |
| 设备支持 | 桌面优先（Preview 宽度 816px，需要宽屏）|
| 数据隐私 | 用户文档仅在 API 请求时传给 OpenAI，服务端不持久化任何数据 |
| 离线 Fact Bank | localStorage 存储，无网络也可查看 / 编辑 Fact Bank 和 Applications |
| localStorage 容错 | 任何 parse 异常返回空默认值，不崩溃 |

---

## 5. 技术方案

| 层级 | 技术选型 | 备注 |
|------|----------|------|
| 框架 | Next.js 16.2.0（App Router, Turbopack）| 前后端一体，API Routes 作为 serverless 函数 |
| 语言 | TypeScript | 全栈 strict 模式 |
| AI | OpenAI GPT-4o | JSON mode，temperature 0.1–0.3，所有 prompt 在 `lib/prompts.ts` |
| 文件解析 | `pdf-parse@1.1.1` + `mammoth` | 服务端，`pdf-parse` 必须锁定 1.1.1 |
| 文件类型检测 | Magic bytes | 不依赖 MIME type 或文件名扩展名 |
| URL 抓取 | `cheerio` + Node `fetch` | 轻量 HTML 解析，无需 headless browser |
| PDF 生成 | `@react-pdf/renderer` | 服务端渲染，须在 `next.config.ts` 的 `serverExternalPackages` 声明 |
| 样式 | Tailwind CSS v4 + CSS custom properties（OKLCH 色彩空间）| |
| 字体 | Syne / DM Mono / Instrument Sans（Google Fonts）| 简历 Preview/PDF 用 Cambria / Times-Roman |
| 存储 | localStorage | `resume_builder_factbank`（Fact Bank）+ `resume_builder_applications`（投递记录）|
| 部署 | Vercel | 零配置，支持 Next.js serverless |

**`next.config.ts` 必须包含：**
```ts
serverExternalPackages: ['pdf-parse', 'mammoth', '@react-pdf/renderer']
```

**`.env.local` 必须包含：**
```
OPENAI_API_KEY=sk-...
```

---

## 6. 数据模型

### FactBank（localStorage: `resume_builder_factbank`）

```
FactBank
├── contact: { name, email, phone, location, linkedin, github, website }
├── experiences: Experience[]
│   ├── id: string（UUID，服务端生成）
│   ├── company, location, startDate, endDate: string
│   └── versions: Version[]
│       ├── id: string（UUID）
│       ├── title: string
│       ├── bullets: string[]
│       └── sourceFile?: string（来源文件名）
├── education: Education[]
│   ├── id: string
│   ├── school, location, degree, field, startDate, endDate: string
│   └── notes: string[]
└── skills: string[]   ← 每条格式: "Category: skill1, skill2"
```

**localStorage migration**：旧数据中 `experiences[].frames` 字段在加载时自动迁移为 `versions`，向后兼容。

### GeneratedResume

```
GeneratedResume
├── contact: Contact
├── education: Education[]            ← 完整复制自 Fact Bank
├── skills: string[]                  ← AI 重排后，2–3 组，格式 "Category: items"
├── experiences: GeneratedExperience[]
│   ├── company, title, location, startDate, endDate: string
│   └── bullets: string[]             ← 选中 Version 的 bullets 经保守改写后的结果
├── jdKeywordCoverage: {
│   ├── score: number                 ← AFTER 加权分数（0–100）
│   ├── beforeScore: number           ← BEFORE 加权分数（0–100）
│   ├── covered: string[]             ← AFTER 已覆盖关键词
│   ├── missing: string[]             ← AFTER 缺失关键词
│   ├── beforeCovered: string[]       ← BEFORE 已覆盖关键词
│   ├── beforeMissing: string[]       ← BEFORE 缺失关键词
│   └── hardSkillsMissing: string[]   ← AFTER 仍缺失的 hard skill（红色警告）
└── jdReport: JDReport
    ├── role, company: string
    ├── titleKeywords, hardSkills, actionKeywords: string[]
    ├── businessContext, domainKeywords, hardFilters: string[]
    ├── top10: string[]
    ├── alreadyHave: string[]         ← 等同 covered
    └── needToAdd: string[]           ← 等同 missing
```

> 无 summary 字段，不生成个人介绍段落。

### Application（localStorage: `resume_builder_applications`）

```
Application
├── id: string        ← Math.random().toString(36).slice(2) + Date.now().toString(36)
├── date: string      ← ISO 8601
├── company: string   ← 来自 jdReport.company，默认 "—"
├── role: string      ← 来自 jdReport.role，默认 "—"
├── resume: GeneratedResume | null
└── jdText: string | null
```

---

## 7. 已知设计决策与约束

| 问题 | 决策 |
|------|------|
| Version 选择策略 | 纯 title 职能匹配；提供正向优先级例子（不使用反面例子，曾导致 AI 泛化回避）；不传 bullets 给选择步骤 |
| Bullet 改写：使用哪些 bullets | 仅使用**选中 Version 的 bullets**，不合并其他 Version（保持每段经历 title 与 bullets 一致性）|
| Bullet 数量 | 改写后输出**精确相同数量**的 bullets，不合并、不删除；一页裁剪在改写后单独进行 |
| Skills 分类 | AI 自主决定分组名称和数量（2–3 组），保留所有原始技能，不遗漏 |
| Boost API 的 experience key | 使用 `"${company}-${title}"` 复合字符串（GeneratedExperience 无 id 字段）|
| PDF 字体 | Times-Roman 系列（Times-Roman / Times-Bold / Times-Italic / Times-BoldItalic），`@react-pdf/renderer` 内置，无需外部加载 |
| contentEditable 实现 | 用 ref-based DOM 模式（不用 React 受控 state），避免用户输入时光标跳位；`isEditing` ref 防止外部状态变化覆盖正在编辑的内容 |
| Applications 保存去重 | 由调用方（page.tsx）维护 `saved` boolean 状态，首次 download/save 后设为 true，新生成时重置 |
| localStorage 兼容性 | Fact Bank 加载时运行 `migrate()`，将旧 `frames` 字段转换为 `versions`（一次性，永久兼容）|
| `@react-pdf/renderer` | 必须在 `next.config.ts` 中声明 `serverExternalPackages`，否则 Turbopack 打包报错 |

---

## 8. UI 设计系统

### 色彩（OKLCH 色彩空间）

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg` | `oklch(93% 0.010 80)` | 页面底色（暖灰）|
| `--surface` | `oklch(97% 0.007 80)` | 卡片背景 |
| `--surface-2` | `oklch(91% 0.013 80)` | 输入框、嵌套区域 |
| `--border` | `oklch(87% 0.016 80)` | 默认边框 |
| `--border-2` | `oklch(81% 0.020 80)` | 强调边框 |
| `--text` | `oklch(15% 0.010 80)` | 主文字（暖近黑）|
| `--text-muted` | `oklch(54% 0.018 80)` | 次要文字 |
| `--text-dim` | `oklch(75% 0.014 80)` | 最弱文字 |
| `--ink` | `#1a1810` | 主按钮背景、Tab 激活态 |
| `--green` | `oklch(52% 0.155 145)` | ATS 成功、关键词已覆盖、激活 tab |
| `--red` | `oklch(48% 0.17 25)` | 缺失 hard skills、错误状态 |
| `--orange` | `oklch(62% 0.16 55)` | 缺失其他关键词、警告 |
| `--blue` | `oklch(48% 0.16 265)` | Business Context 分类标签 |

### 字体
- **Syne**（700/800）：标题、Logo、Tab 标签、主按钮
- **DM Mono**（400/500）：ATS 分数、日期、代码值、单调数据
- **Instrument Sans**（400/600）：正文、标签、次要按钮

### 主要组件类
- `.card`：surface 背景，14px 圆角，subtle 阴影
- `.input-field`：surface-2 背景，DM Mono 13px，focus 时 green glow
- `.btn-primary`：ink 背景，Syne 700，hover 上浮
- `.btn-ghost`：透明背景，border，hover 时 surface-2

---

## 9. UI 设计优化工具链

目标：去 AI 味、提升审美质感。使用以下 Claude Code skills 组合进行递进式 UI 优化。

| Skill | 作用 |
|-------|------|
| `/audit` | 全面诊断界面质量问题，找出所有设计缺陷 |
| `/critique` | 针对性批评当前设计，指出具体问题 |
| `/polish` | 细节打磨 — 间距、对齐、视觉层次 |
| `/typeset` | 字体排印优化，去掉默认 AI 风格字体感 |
| `/colorize` | 色彩方案优化 |
| `/bolder` | 让设计更有视觉冲击力 |

推荐组合：`/audit` → `/polish` → `/typeset`，不满意再加 `/colorize` 和 `/bolder`。

---

## 10. 超出 MVP 范围（后续版本）

| 功能 | 版本 |
|------|------|
| 用户账号 + 云端 Fact Bank 同步 | v2 |
| 云端 Applications 历史记录同步 | v2 |
| ATS 评分可视化 dashboard | v2 |
| 中文简历支持 | v2 |
| 多种简历模板风格 | v2 |
| LinkedIn 导入 | v2 |
| Chrome Extension（从 JD 页面直接生成）| v3 |
