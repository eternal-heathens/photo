# 摄影作品专业分析 Agent 技术架构方案

## 0. 文档信息

| 项目 | 内容 |
|---|---|
| 系统名称 | 摄影作品专业分析 Agent |
| 文档版本 | v1.0 |
| 输出类型 | 技术架构方案 |
| 输入基线 | `docs/01-product-plan.md`、`docs/02-model-tool-research.md` |
| 当前阶段 | V0.5 技术架构设计 |
| 结论状态 | 建议推进 |

## 1. 输入压缩摘要

### 1.1 背景与目标

当前项目是 React + TypeScript + Vite + Tailwind CSS 的纯前端 MVP，已经支持照片上传、Transformers.js 本地识别、Gemini 结构化分析、术语气泡、结果展示和 JSON 下载。

新的产品边界已经确认：

- 前期不做自动改图、生成式修图、图片替换。
- 产品重点是照片质量诊断与优化建议。
- 默认使用小模型、工具、规则完成基础分析。
- 大模型仅作为可选高级分析配置。
- 输出结构必须围绕“当前情况、存在问题、如何改进”。

### 1.2 关键约束

- 基础分析模式不依赖大模型 Key。
- 基础模式尽量在浏览器本地完成，降低成本和隐私风险。
- 高级大模型模式不能阻塞基础结果。
- 不将单一美学分或单一模型输出包装成专业结论。
- 后续如接入大模型，必须通过后端或 Serverless 代理保护 Key。

### 1.3 已确认技术方向

- 保留现有 React/Vite/TypeScript/Tailwind 技术栈。
- 保留 Transformers.js 作为浏览器本地模型能力。
- 补充 CV 指标、EXIF、规则引擎、统一分析结果 Schema。
- V1 再接入 Serverless 代理和可选大模型高级分析。
- PyIQA 等专业 IQA 工具暂不进入纯前端主链路，作为后端 PoC。

### 1.4 未决问题

- 基础模式首批小模型 / 工具清单。
- 是否在 V0.5 引入对象检测或只保留分类/零样本识别。
- 视觉标注先做主体、干扰区域、留白还是裁切建议。
- 历史记录是否仅本地 IndexedDB，还是后续接云端账号体系。

## 2. 技术总监结论

### 2.1 问题理解

本项目不是传统“AI 修图工具”，而是“照片质量诊断与建议工具”。架构上不能把大模型当作核心依赖，否则会在早期引入成本、安全、延迟和稳定性风险。正确方向是先建设一个可解释、可扩展、可降级的基础分析引擎。

### 2.2 架构评价标准

| 标准 | 目标 |
|---|---|
| 可用性 | 无大模型 Key 时仍可完成基础分析 |
| 可解释性 | 每个分数和建议都能追溯到模型标签、工具指标或规则 |
| 可扩展性 | 后续能平滑接入 PyIQA、对象检测、大模型代理 |
| 隐私 | 基础模式默认不上传图片 |
| 性能 | 首屏轻量，模型和重计算按需加载 |
| 交互 | 结果组织为当前情况、存在问题、如何改进 |
| 成本 | V0.5 零后端或低后端成本，V1 才按需增加代理 |

### 2.3 最终裁决

采用“两层分析架构”：

```text
基础分析层：小模型 + CV/EXIF + 规则引擎
高级分析层：可选大模型代理 + 专业 IQA 服务
```

V0.5 优先完成基础分析层。V1 再引入高级分析层，不反向绑死基础能力。

## 3. 总体架构

### 3.1 目标架构

```text
浏览器前端
  ├─ Upload / Photo Session
  ├─ Image Normalizer
  ├─ Analysis Orchestrator
  │   ├─ Local Vision Adapter
  │   │   └─ Transformers.js / CLIP / ViT
  │   ├─ CV Metrics Adapter
  │   │   └─ Canvas / ImageBitmap / optional OpenCV.js
  │   ├─ EXIF Adapter
  │   │   └─ exifr
  │   ├─ Rule Engine
  │   │   └─ dimension scores / issue priority / recommendations
  │   └─ Optional Advanced Analyzer
  │       └─ Serverless LLM Proxy
  ├─ Result Store
  ├─ Result UI
  └─ Export / Report

可选后端层
  ├─ LLM Proxy
  │   ├─ Gemini
  │   ├─ OpenAI Vision
  │   └─ Qwen / InternVL provider
  ├─ IQA Worker
  │   └─ PyIQA
  └─ Observability / Rate Limit
```

### 3.2 架构分层

| 层级 | 职责 | V0.5 | V1 |
|---|---|---|---|
| 表现层 | 上传、配置、分析控制、结果展示 | 必做 | 持续优化 |
| 会话层 | 管理照片队列、分析状态、结果缓存 | 必做 | 可接历史记录 |
| 基础分析层 | 本地模型、CV、EXIF、规则引擎 | 必做 | 持续增强 |
| 高级分析层 | 大模型深度点评、IQA 服务 | 可选开关 | Serverless 化 |
| 数据层 | 会话内结果、JSON 导出、可选 IndexedDB | 基础结果 | 历史记录 |
| 可观测层 | 错误、耗时、模型状态 | 前端日志 | 服务端指标 |

## 4. 核心模块设计

### 4.1 Photo Session 模块

职责：

- 管理上传照片、预览 URL、文件大小、文件类型。
- 管理分析任务状态：待分析、分析中、基础完成、高级完成、失败。
- 在删除照片时释放 `URL.createObjectURL`。

建议类型：

```ts
type PhotoSessionItem = {
  id: string;
  file: File;
  fileName: string;
  size: number;
  mimeType: string;
  previewUrl: string;
  status: "queued" | "analyzing" | "basic_done" | "advanced_done" | "failed";
};
```

### 4.2 Image Normalizer 模块

职责：

- 读取图片尺寸、比例、方向。
- 创建分析用缩略图，避免大图直接进入模型和 CV 计算。
- 统一输出 `ImageBitmap`、Canvas ImageData、Blob。

设计要点：

- 原图仅用于预览和导出，不直接长期存储。
- 分析图建议长边限制在 768 到 1024 px。
- 保留原始宽高用于发布适配建议。

### 4.3 Analysis Orchestrator 模块

职责：

- 编排本地模型、CV 指标、EXIF、规则引擎。
- 控制并发、取消、超时和回退。
- 保证基础结果先返回，高级结果后合并。

建议接口：

```ts
type Analyzer<TOutput> = {
  id: string;
  stage: "basic" | "advanced";
  run(input: AnalysisInput, context: AnalysisContext): Promise<TOutput>;
};

type AnalysisOrchestrator = {
  analyze(photo: UploadedPhoto, config: AnalysisConfig): Promise<PhotoAnalysisV2Result>;
};
```

执行顺序：

```text
读取图片
  -> normalize
  -> 并行执行 localVision / cvMetrics / exif
  -> ruleEngine 汇总基础结果
  -> 渲染基础结果
  -> 如用户启用高级模式，调用 LLM Proxy
  -> 合并高级点评
```

### 4.4 Local Vision Adapter

职责：

- 负责主体、场景、基础标签识别。
- 继续复用现有 `src/lib/visionAnalysis.ts`。
- 支持 image-classification 与 zero-shot-image-classification。

工具取舍：

| 候选 | 结论 | 原因 |
|---|---|---|
| Transformers.js | 采用 | 已接入，能在浏览器运行，支持图像分类、对象检测、分割、零样本图像分类等任务 |
| TensorFlow.js models | P1 评估 | 可用于 COCO-SSD、DeepLab 等对象检测/分割，但会增加包体和模型管理复杂度 |
| 自研模型 | 暂不采用 | 缺少样本集和评测标准 |

### 4.5 CV Metrics Adapter

职责：

- 输出技术质量指标：模糊、亮度、对比度、饱和度、色偏、尺寸、比例。
- 用指标支持“当前情况”和“存在问题”的证据。

V0.5 指标：

| 指标 | 计算方式 | 用途 |
|---|---|---|
| brightness | RGB / luminance 均值与分布 | 判断过暗、过亮 |
| contrast | luminance 标准差 | 判断画面灰、层次弱 |
| blur | Laplacian 方差或边缘强度 | 判断疑似手抖/跑焦 |
| saturation | HSV/HSL 饱和度统计 | 判断饱和度过高/过低 |
| colorCast | RGB 通道偏移 | 判断明显偏色 |
| aspectRatio | 宽高比 | 判断发布适配和裁切建议 |

工具取舍：

| 候选 | 结论 | 原因 |
|---|---|---|
| Canvas / ImageData | V0.5 采用 | 零依赖、浏览器原生、足够覆盖基础指标 |
| OpenCV.js | P1 评估 | 能做更复杂图像处理，但体积和加载成本较高 |
| Sharp | 后端场景采用 | 适合 Node 服务端批处理，不适合当前纯前端基础路线 |

### 4.6 EXIF Adapter

职责：

- 读取快门、光圈、ISO、焦距、相机型号、拍摄时间、方向。
- 将拍摄参数转换为可执行建议。

候选工具：

| 候选 | 结论 | 原因 |
|---|---|---|
| exifr | 建议采用 | 支持浏览器和 Node，适合读取 EXIF/GPS/XMP/IPTC 等元数据 |
| exif-js | 可替代 | 轻量，但维护和能力完整性需评估 |

隐私策略：

- 默认不展示 GPS 精确位置。
- 导出 JSON 时 GPS 默认脱敏或移除。
- 如果后续上传云端，高级分析请求默认不携带 GPS。

### 4.7 Rule Engine

职责：

- 把模型标签、CV 指标、EXIF 转为维度评分、问题、建议。
- 统一不同工具的口径。
- 生成首要问题排序。

规则分层：

```text
Metric Rules
  例如 blurScore 低 -> 清晰度问题

Scene Rules
  例如 人像 + 背景复杂 -> 主体隔离建议

Dimension Rules
  例如 构图 / 光线 / 色彩 / 技术质量汇总

Recommendation Rules
  生成拍摄建议、后期建议、发布建议、学习建议

Priority Rules
  根据影响范围、置信度、用户场景排序
```

建议输出：

```ts
type IssuePriority = "high" | "medium" | "low";
type ImprovementType = "shooting" | "post" | "publishing" | "learning";

type DimensionAnalysis = {
  id: string;
  name: string;
  score: number;
  currentState: string[];
  issues: Array<{
    priority: IssuePriority;
    evidence: string;
    impact: string;
    source: "vision" | "cv" | "exif" | "rule" | "llm";
  }>;
  improvements: Array<{
    type: ImprovementType;
    action: string;
    reason?: string;
  }>;
};
```

### 4.8 Optional Advanced Analyzer

职责：

- 在用户主动启用时调用大模型。
- 解释基础指标，补充叙事、情绪、复杂构图和建议润色。
- 不替代基础结果，不阻塞基础结果。

V1 接入方式：

```text
前端
  -> /api/analyze/advanced
  -> Serverless LLM Proxy
  -> Gemini / OpenAI / Qwen Provider
  -> 返回 advancedAnalysis
  -> 前端合并结果
```

关键原则：

- 前端不保存服务端 API Key。
- 请求中带基础分析结果，减少大模型重复判断。
- 大模型只能补充解释、建议和置信度，不直接覆盖工具指标。
- 失败时保留基础结果。

## 5. 数据架构

### 5.1 核心数据对象

```ts
type AnalysisConfig = {
  mode: "basic" | "advanced";
  localVision: {
    enabled: boolean;
    provider: "Transformers.js";
    model: string;
    task: "image-classification" | "zero-shot-image-classification";
    topK: number;
    candidateLabels?: string[];
  };
  tools: {
    cvMetrics: boolean;
    exif: boolean;
    iqa?: boolean;
  };
  advanced?: {
    enabled: boolean;
    provider: "gemini" | "openai" | "qwen" | "internvl";
    model: string;
  };
};

type ToolMetrics = {
  image: {
    width: number;
    height: number;
    aspectRatio: number;
    megapixels: number;
  };
  cv?: {
    brightness: number;
    contrast: number;
    blur: number;
    saturation: number;
    colorCast: number;
  };
  exif?: {
    exposureTime?: string;
    fNumber?: number;
    iso?: number;
    focalLength?: number;
    cameraModel?: string;
    takenAt?: string;
  };
};

type PhotoAnalysisV2Result = {
  id: string;
  fileName: string;
  previewUrl: string;
  summary: {
    overallScore: number;
    sceneType: string;
    bestUse: string[];
    topIssues: string[];
    nextBestAction: string;
  };
  dimensions: DimensionAnalysis[];
  recommendations: {
    shooting: string[];
    postProcessing: string[];
    publishing: string[];
    learning: string[];
  };
  signals: {
    labels: VisionLabel[];
    metrics: ToolMetrics;
    advanced?: unknown;
  };
  provenance: {
    analyzers: string[];
    mode: "basic" | "advanced";
    generatedAt: string;
  };
};
```

### 5.2 数据生命周期

| 数据 | V0.5 生命周期 | V1 生命周期 |
|---|---|---|
| 原图 File | 当前页面会话 | 可选 IndexedDB 历史 |
| 预览 URL | 当前页面会话 | 当前页面会话 |
| 基础指标 | 当前页面会话，可导出 JSON | 可保存历史 |
| 大模型结果 | 不默认启用 | 用户授权后保存 |
| API Key | 不进入导出结果 | 服务端保存或用户会话配置 |
| EXIF GPS | 默认不展示精确值 | 默认脱敏 |

## 6. 接口与集成设计

### 6.1 V0.5 前端内部接口

```ts
async function analyzePhotoBasic(
  photo: UploadedPhoto,
  config: AnalysisConfig,
  onProgress?: (event: AnalysisProgressEvent) => void,
): Promise<PhotoAnalysisV2Result>;
```

进度事件：

```ts
type AnalysisProgressEvent = {
  photoId: string;
  stage:
    | "normalizing"
    | "local_vision"
    | "cv_metrics"
    | "exif"
    | "rule_engine"
    | "advanced"
    | "done"
    | "failed";
  message: string;
};
```

### 6.2 V1 Serverless 高级分析接口

```http
POST /api/analyze/advanced
Content-Type: application/json
```

请求：

```json
{
  "image": {
    "mimeType": "image/jpeg",
    "base64": "..."
  },
  "basicResult": {},
  "config": {
    "provider": "gemini",
    "model": "gemini-2.5-flash"
  }
}
```

响应：

```json
{
  "advancedSummary": {},
  "dimensionPatches": [],
  "recommendationPatches": [],
  "warnings": []
}
```

安全要求：

- 限制图片大小和 MIME 类型。
- 服务端注入 provider API Key。
- 记录耗时、状态码、provider，不记录原图内容。
- 默认不持久化图片。

## 7. 关键业务流程

### 7.1 基础分析流程

```text
用户上传图片
  -> 生成预览和会话对象
  -> 点击开始分析
  -> Image Normalizer 读取尺寸并生成分析图
  -> Local Vision Adapter 输出主体/场景标签
  -> CV Metrics Adapter 输出技术指标
  -> EXIF Adapter 输出拍摄参数
  -> Rule Engine 生成维度结果和建议
  -> Result UI 渲染基础结果
```

### 7.2 高级分析流程

```text
基础结果已生成
  -> 用户启用高级分析
  -> 前端发送图片 + 基础结果到 Serverless
  -> LLM Proxy 调用 provider
  -> 返回高级点评补丁
  -> 前端合并结果
  -> 如果失败，保留基础结果并提示
```

### 7.3 视觉标注流程

V1 再实现：

```text
基础结果
  -> 主体/干扰/留白候选区域
  -> 转成相对坐标
  -> Canvas/SVG Overlay 渲染
  -> 用户可开关标注层
```

## 8. 技术选型

### 8.1 前端框架

继续采用 React 18 + TypeScript + Vite + Tailwind CSS。

理由：

- 已有项目基础稳定。
- 当前产品是工具型工作台，React 状态和组件模型足够。
- Vite 构建简单，适合快速迭代。

### 8.2 本地模型

继续采用 Transformers.js。

理由：

- 已接入项目。
- 官方支持浏览器运行模型，并支持图像分类、对象检测、分割、零样本图像分类等视觉任务。
- 可通过懒加载、Web Worker、量化模型降低首次加载压力。

注意：

- 本地模型只承担主体、场景、标签和部分区域理解。
- 不把本地模型输出直接作为专业质量结论。

### 8.3 CV 指标

V0.5 使用 Canvas / ImageData 自研轻量指标。

理由：

- 无额外依赖。
- 能覆盖模糊、亮度、对比度、饱和度、尺寸、比例等基础指标。
- 性能和体积可控。

OpenCV.js 作为 P1 候选。

### 8.4 EXIF

建议采用 `exifr`。

理由：

- 支持浏览器和 Node。
- 能读取 EXIF、GPS、XMP、IPTC 等元数据。
- 可按需解析，适合前端上传场景。

### 8.5 IQA / 美学评分

V0.5 不引入重型 IQA。V1 后端 PoC 引入 PyIQA。

理由：

- PyIQA 覆盖 PSNR、SSIM、LPIPS、NIQE、MUSIQ、TOPIQ、NIMA、BRISQUE 等多类 IQA / 美学模型。
- 但它基于 PyTorch，更适合 Python 后端或离线服务，不适合直接塞进浏览器主链路。

### 8.6 大模型高级分析

V1 以 Serverless LLM Proxy 方式接入。

候选：

| Provider | 角色 | 采用阶段 |
|---|---|---|
| Gemini | 高级分析首选候选 | V1 |
| OpenAI Vision | 高级分析备选 | V1 |
| Qwen / InternVL | 自部署或私有化候选 | V2 |

## 9. 开源工具调研与方案取舍

| 能力 | 候选方案 | 结论 | 取舍理由 |
|---|---|---|---|
| 浏览器模型推理 | Transformers.js / TensorFlow.js | 先用 Transformers.js | 已接入，支持当前任务，迁移成本低 |
| 对象检测 | TensorFlow.js COCO-SSD / Transformers.js object-detection | P1 评估 | V0.5 先不增加模型体积，视觉标注前再接 |
| 图像指标 | Canvas / OpenCV.js | 先用 Canvas | V0.5 指标简单，OpenCV.js 体积较重 |
| EXIF | exifr / exif-js | 建议 exifr | 功能覆盖更完整，适合浏览器和 Node |
| IQA | PyIQA / PIQ / 自研 | 建议 PyIQA PoC | 覆盖模型多，社区成熟，适合后端服务 |
| 高级 VLM | Gemini / OpenAI / Qwen / InternVL | V1 可选 | 不进入基础主链路，按成本和隐私选择 |
| 存储 | 内存 / localStorage / IndexedDB | V0.5 内存，V1 IndexedDB | MVP 不做历史；历史结果再引入 IndexedDB |

## 10. 部署架构

### 10.1 V0.5 部署

```text
Static Hosting / CDN
  └─ React SPA
      ├─ JS/CSS assets
      ├─ lazy-loaded model bundles
      └─ browser local analysis
```

特点：

- 无后端。
- 无服务端成本。
- 适合验证基础分析和交互体验。

### 10.2 V1 部署

```text
Static Hosting / CDN
  └─ React SPA

Serverless API
  ├─ /api/analyze/advanced
  ├─ /api/log/client-error
  └─ rate limit / auth-lite

Optional Python Worker
  └─ PyIQA batch or async scoring
```

V1 仍不需要复杂微服务。只有当高级分析、历史记录、账号体系出现明确需求时再扩展。

## 11. 安全设计

### 11.1 图片数据

- 基础模式不上传图片。
- 高级模式必须显式提示会调用第三方模型。
- Serverless 默认不落盘原图。
- 请求大小限制建议 8 MB 到 20 MB，按 provider 限制调整。

### 11.2 API Key

- V0.5 可保留用户自带 Key 的 MVP 能力，但要明确风险。
- V1 所有平台 Key 应迁移到服务端。
- 导出 JSON 不包含 Key。

### 11.3 EXIF 隐私

- GPS 默认脱敏。
- 不在结果卡片中默认展示精确位置。
- 如果导出报告，提供“移除隐私元数据”开关。

## 12. 性能与扩展性设计

### 12.1 前端性能

- 对模型相关代码使用 dynamic import。
- 本地模型首次加载展示阶段进度。
- 使用 Web Worker 执行 CV 指标和模型推理，避免阻塞 UI。
- 分析图降采样，避免大图进入模型。
- 多图分析默认串行或限制并发为 1 到 2。
- 当前构建主 JS chunk 偏大，V0.5 应做分包。

### 12.2 可扩展性

采用 Adapter + Orchestrator 架构，新增能力只需增加 analyzer：

```text
new Analyzer
  -> 输出标准 signal
  -> Rule Engine 合并
  -> Result Schema 不变
```

示例：

- 加入对象检测：新增 `objectDetectionAnalyzer`。
- 加入 PyIQA：新增 `iqaAnalyzer`。
- 加入 OpenAI：新增 `openaiAdvancedAnalyzer`。

## 13. 高可用与容灾设计

V0.5：

- 静态站点依赖 CDN。
- 模型加载失败时回退到 CV + 规则建议。
- 大模型不可用不影响基础分析。

V1：

- Serverless 失败时返回基础结果。
- Provider 超时降级，不重试超过 1 次。
- 对高级分析设置超时和 rate limit。

## 14. 可观测性设计

V0.5 前端本地记录：

- 模型加载耗时。
- 每个 analyzer 耗时。
- 失败 analyzer 和错误类型。
- 基础分析总耗时。

V1 服务端记录：

- provider、model、耗时、状态码、错误码。
- 请求大小区间。
- 不记录原图和完整用户内容。

建议事件：

```ts
type TelemetryEvent =
  | "analysis_started"
  | "basic_analysis_completed"
  | "advanced_analysis_completed"
  | "analyzer_failed"
  | "json_exported";
```

## 15. 工程实施计划

### 阶段 1：结果 Schema 与基础引擎

目标：不改产品形态太多，先让数据结构支撑多维分析。

任务：

- 新增 `PhotoAnalysisV2Result` 类型。
- 将现有三维结果映射到 `dimensions[]`。
- 增加 `AnalysisOrchestrator`。
- 增加 CV Metrics Adapter。
- 增加 EXIF Adapter。
- 增加 Rule Engine。

验收：

- 无 Gemini Key 时也能输出多维分析。
- 结果有当前情况、存在问题、如何改进。
- 构建通过。

### 阶段 2：交互重构

目标：让用户快速看懂首要问题。

任务：

- 结果卡片顶部增加摘要和首要问题。
- 多维诊断面板改为可折叠或 Tab。
- 建议按拍摄、后期、发布、学习分组。
- 增加复制建议能力。

### 阶段 3：可选高级分析

目标：让大模型成为增强项而非基础依赖。

任务：

- 抽象 Advanced Analyzer。
- 现有 Gemini 调用改造成高级分析模式。
- V1 再迁移到 Serverless Proxy。
- 高级结果以 patch 方式合并基础结果。

### 阶段 4：性能与质量

任务：

- 模型代码分包。
- Web Worker 化 CV 计算。
- 分析耗时统计。
- 建立 50 到 100 张样本的人工评测集。

## 16. 风险清单与应对

| 风险 | 等级 | 影响 | 应对 |
|---|---:|---|---|
| 基础指标误判 | 高 | 建议不可信 | 引入置信度和“需人工复核”标记 |
| 维度过多导致难读 | 中 | 用户找不到重点 | 顶部摘要 + 首要问题排序 |
| 模型加载慢 | 中 | 首次体验差 | 懒加载、分包、缓存、进度提示 |
| 大模型 Key 泄露 | 高 | 安全风险 | V1 Serverless 代理 |
| 多工具结果冲突 | 中 | 结论不一致 | Rule Engine 统一冲突解决策略 |
| EXIF 缺失 | 低 | 建议不够具体 | 按缺省规则生成建议 |
| PyIQA 服务成本高 | 中 | 后端复杂度提升 | 仅作为 PoC 和批量模式，不进入主链路 |

## 17. 架构争议与取舍

### 17.1 为什么不前期直接上大模型

大模型能提升深度点评质量，但它不适合作为基础能力的唯一依赖：

- 成本不可控。
- 前端 Key 暴露风险高。
- 网络和 provider 稳定性影响核心流程。
- 客观技术质量仍需 CV/IQA 指标支撑。

因此大模型只作为高级分析层。

### 17.2 为什么不直接接 PhotoFramer

当前产品已明确不做改图。PhotoFramer 更适合生成改图建议图，与当前“诊断与建议”目标不完全一致。接入它会增加 GPU 部署、模型体积、延迟和成本风险。

### 17.3 为什么先用规则引擎

规则引擎可以把小模型、CV、EXIF 的离散信号统一为可解释建议，是前期最稳定的方式。后续有用户反馈和样本集后，再逐步训练或校准模型。

## 18. 最终结论

建议采用“前端基础分析引擎 + 可选高级分析层”的技术架构：

- V0.5 不新增后端主依赖，优先完成基础分析引擎。
- 小模型、CV、EXIF、规则引擎是默认主链路。
- 大模型作为用户主动开启的高级模式。
- 结果 Schema 先升级，为后续视觉标注、历史记录、报告导出打基础。
- V1 再引入 Serverless 代理、PyIQA PoC 和可观测性。

该架构能满足当前产品方向：低成本、隐私友好、可解释、可扩展，并为后续专业化能力保留空间。

## 19. 参考资料

- Transformers.js: https://huggingface.co/docs/transformers.js/index
- PyIQA: https://github.com/chaofengc/IQA-PyTorch
- Gemini image understanding: https://ai.google.dev/gemini-api/docs/image-understanding
- OpenAI Images and vision: https://platform.openai.com/docs/guides/images-vision
- Exifr: https://exifr.netlify.app/
- OpenCV.js image processing: https://docs.opencv.org/3.4/d2/df0/tutorial_js_table_of_contents_imgproc.html
- TensorFlow.js models: https://www.tensorflow.org/js/models
