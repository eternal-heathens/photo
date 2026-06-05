# 摄影作品专业分析 Agent 详细设计文档

## 1. 文档范围

本文档基于 `docs/01-product-plan.md`、`docs/02-model-tool-research.md` 和 `docs/03-technical-architecture.md`，输出可指导 V0.5 开发、测试和后续 V1 演进的详细设计。

本文覆盖：

- V0.5 前端基础分析引擎的模块拆分、类型设计、核心流程、规则引擎、异常处理和测试方案。
- 当前 React/Vite 项目如何从“Gemini / Transformers.js 分析 MVP”演进到“小模型 + CV + EXIF + 规则”的建议型产品。
- V1 可选高级分析层的接口、数据、部署、安全和回滚设计。

本文不覆盖：

- 自动改图、生成式修图、图片替换。
- 账号体系、多人协作、云端图库管理。
- 训练或微调自有视觉模型。
- 正式商业计费系统。

## 2. 输入依据

### 2.1 产品方案

产品已经确认定位为“摄影作品质量诊断与优化建议 Agent”。

核心边界：

- 默认不改图，只提供建议。
- 输出必须围绕“当前情况、存在问题、如何改进”。
- 基础能力不依赖大模型 Key。
- 大模型作为用户主动启用的高级分析能力。
- 基础模式默认图片不上传云端。

V0.5 成功标准：

- 用户上传图片后，不配置大模型 Key 也能获得可读、结构化、多维度的照片分析结果。
- 结果包含基础指标、问题优先级、拍摄建议、后期建议、导出 JSON。
- 模型失败时能降级到规则结果，不中断主流程。

### 2.2 技术架构

架构结论采用两层分析架构：

```text
基础分析层：小模型 + CV / EXIF + 规则引擎
高级分析层：可选大模型代理 + 专业 IQA 服务
```

V0.5 优先实现基础分析层。V1 再把 Gemini / OpenAI / Qwen / PyIQA 等能力通过后端或 Serverless 接入。

### 2.3 当前代码依据

当前项目结构：

```text
src/App.tsx
src/components/AnalysisResultCard.tsx
src/components/MetricBar.tsx
src/components/ModelConfigPanel.tsx
src/components/PhotoQueue.tsx
src/components/TermBubble.tsx
src/components/UploadZone.tsx
src/lib/geminiAnalysis.ts
src/lib/mockAnalysis.ts
src/lib/modelPresets.ts
src/lib/photographyGlossary.ts
src/lib/utils.ts
src/lib/visionAnalysis.ts
src/types/photo.ts
```

当前已有能力：

- 上传 jpg / jpeg / png / webp。
- 多张图片队列。
- Transformers.js 本地分类或零样本分类。
- Gemini 云端结构化分析。
- 分析结果卡片、术语气泡、JSON 下载。
- 模型失败 fallback。

当前主要缺口：

- `mockAnalysis.ts` 仍承担“分析编排 + 规则结果生成”的混合职责。
- 缺少独立 CV 指标、EXIF 解析、规则引擎、问题优先级、建议分组。
- 缺少统一的 V2 分析结果 Schema。
- 基础模式默认模型 preset 目前不是本地模式，容易误导用户前期必须配置 Gemini Key。
- 高级大模型仍在前端直连，正式产品有 Key 暴露风险。

### 2.4 约束与假设

| 类型 | 内容 |
|---|---|
| 技术栈 | React 18、TypeScript、Vite 6、Tailwind CSS、lucide-react、Transformers.js |
| 部署方式 | V0.5 静态站点部署，V1 可增加 Serverless API |
| 隐私约束 | 基础分析不上传原图；高级分析需用户主动确认 |
| 成本约束 | V0.5 不引入必须付费的云端能力 |
| 性能约束 | 模型按需加载，图片分析前压缩到工作尺寸 |
| 产品约束 | 不做自动修图，不把单模型结果包装成专业认证 |

## 3. 目标与非目标

### 3.1 研发目标

1. 将现有分析流程拆分为明确的 `orchestrator -> adapters -> rule engine -> result mapper`。
2. 新增 V2 结果 Schema，支撑多维度质量分析和可解释建议。
3. 新增基础 CV 指标：曝光、对比度、清晰度、颜色复杂度、主体区域粗略估计。
4. 新增 EXIF 解析能力，优先读取 ISO、光圈、快门、焦距、时间、设备。
5. 新增规则引擎，将视觉标签、CV 指标、EXIF 和用户配置合成为“情况 / 问题 / 建议”。
6. 新增问题优先级和建议分类，提升可执行性。
7. 保留 Gemini 高级分析，但标记为可选增强，并为 V1 代理接口预留边界。

### 3.2 测试目标

1. 覆盖上传、模型配置、基础分析、失败降级、结果渲染、JSON 导出。
2. 覆盖小图、大图、无 EXIF、有 EXIF、透明 PNG、极暗、过曝、模糊等边界样本。
3. 确认无 Key 时基础分析可用。
4. 确认高级分析失败不影响基础分析结果。

### 3.3 非目标

- 不在 V0.5 实现服务端数据库。
- 不在 V0.5 实现 Redis、MQ、分布式锁。
- 不在 V0.5 实现用户历史云同步。
- 不在 V0.5 引入 PyIQA 作为强依赖。

## 4. 模块拆分

### 4.1 模块总览

| 模块 | 职责 | 输入 | 输出 | V0.5 文件建议 |
|---|---|---|---|---|
| Upload / Photo Session | 上传校验、对象 URL 管理、队列增删 | FileList | UploadedPhoto[] | `src/components/UploadZone.tsx`、`src/App.tsx` |
| Model / Tool Config | 分析模式、模型、工具开关、隐私开关 | 用户配置 | AnalysisConfig | `src/components/ModelConfigPanel.tsx`、`src/lib/modelPresets.ts` |
| Image Normalizer | 图片解码、缩放、Canvas/ImageData 提取 | File | NormalizedImage | `src/lib/imageNormalizer.ts` |
| Local Vision Adapter | 本地小模型识别、标签归一化 | File、VisionModelConfig | VisionAnalysis | `src/lib/visionAnalysis.ts` |
| CV Metrics Adapter | 曝光、对比度、清晰度、颜色等指标 | NormalizedImage | CvMetrics | `src/lib/cvMetrics.ts` |
| EXIF Adapter | 读取拍摄参数和隐私字段 | File | ExifSummary | `src/lib/exifAnalysis.ts` |
| Rule Engine | 合并多源信号并输出维度诊断 | Signals | DimensionResult[] | `src/lib/ruleEngine.ts` |
| Analysis Orchestrator | 编排任务、进度、失败隔离、结果聚合 | UploadedPhoto[]、AnalysisConfig | PhotoAnalysisV2Result[] | `src/lib/analysisOrchestrator.ts` |
| Result Mapper | V2 结果转现有 UI 结构或新 UI VM | PhotoAnalysisV2Result | ResultViewModel | `src/lib/resultMapper.ts` |
| Optional Advanced Analyzer | 大模型高级点评和建议润色 | 基础结果、图片 | AdvancedAnalysis | `src/lib/advancedAnalysis.ts` |
| Result UI | 展示得分、问题、建议、指标、JSON | ResultViewModel | React UI | `src/components/*` |

### 4.2 建议目录结构

```text
src/
  types/
    photo.ts
    analysisV2.ts
  lib/
    analysisOrchestrator.ts
    advancedAnalysis.ts
    cvMetrics.ts
    exifAnalysis.ts
    imageNormalizer.ts
    modelPresets.ts
    resultMapper.ts
    ruleEngine.ts
    visionAnalysis.ts
  components/
    AnalysisModePanel.tsx
    AnalysisResultCard.tsx
    DimensionInsightPanel.tsx
    IssuePriorityList.tsx
    RecommendationList.tsx
    ToolSignalPanel.tsx
```

### 4.3 组件职责调整

| 当前组件 | 保留职责 | 建议调整 |
|---|---|---|
| `App.tsx` | 页面状态、上传队列、触发分析 | 只调用 orchestrator，不承载分析规则 |
| `ModelConfigPanel.tsx` | 模型和 Key 配置 | 拆出“基础 / 高级模式”开关和工具开关 |
| `AnalysisResultCard.tsx` | 结果展示和下载 | 按“当前情况 / 存在问题 / 如何改进”重组 |
| `MetricBar.tsx` | 分数条 | 支持置信度、来源标识、风险标签 |
| `UploadZone.tsx` | 上传入口 | 增加文件大小限制、数量限制、错误码 |
| `PhotoQueue.tsx` | 待分析列表 | 增加单张分析状态 |

## 5. 核心流程设计

### 5.1 V0.5 基础分析正常流程

```text
用户上传图片
  -> UploadZone 校验 MIME / 数量 / 大小
  -> App 写入 Photo Session
  -> 用户点击开始分析
  -> Analysis Orchestrator 为每张图片创建 task
  -> Image Normalizer 解码并缩放图片
  -> Local Vision Adapter 获取主体 / 场景标签
  -> CV Metrics Adapter 计算曝光 / 对比度 / 清晰度 / 色彩指标
  -> EXIF Adapter 读取拍摄参数
  -> Rule Engine 合并信号
  -> Result Mapper 生成结果视图
  -> UI 展示当前情况、存在问题、如何改进
  -> 用户下载 JSON
```

### 5.2 V0.5 高级分析可选流程

```text
基础分析完成
  -> 判断用户是否启用高级分析
  -> 如果未启用：直接返回基础结果
  -> 如果启用且配置 Gemini Key：调用高级分析 adapter
  -> 高级结果仅补充 narrative / explanation / refined suggestions
  -> 不覆盖工具指标和基础得分
  -> 高级失败时保留基础结果，并显示降级提示
```

### 5.3 V1 Serverless 高级分析流程

```text
基础分析完成
  -> 用户点击高级分析
  -> 前端弹出云端分析授权提示
  -> 前端请求 /api/analyze/advanced
  -> Serverless 验证参数、额度、文件大小
  -> 调用 Gemini / OpenAI / Qwen
  -> 返回高级点评和建议
  -> 前端合并展示
```

### 5.4 异常流程

| 异常 | 触发点 | 处理方式 | 用户提示 |
|---|---|---|---|
| 非图片文件 | 上传 | 跳过并记录文件名 | 已跳过非图片文件 |
| 图片过大 | 上传或解码 | 拒绝或压缩分析副本 | 图片过大，请压缩后重试 |
| 图片解码失败 | Normalizer | 当前图片失败，不影响其他图片 | 图片读取失败 |
| 本地模型加载失败 | Vision Adapter | 返回 fallback vision | 模型加载失败，已使用规则分析 |
| 零样本候选标签为空 | Vision Adapter | 返回配置错误 | 请至少配置一个候选标签 |
| EXIF 不存在 | EXIF Adapter | 返回空摘要 | 未读取到拍摄参数 |
| Gemini Key 缺失 | Advanced Analyzer | 阻止高级分析，不阻止基础分析 | 可继续使用基础分析 |
| 云端 API 失败 | Advanced Analyzer | 保留基础结果 | 高级分析失败，基础结果可用 |

### 5.5 补偿流程

V0.5 不引入持久化任务队列，因此补偿以 UI 重试为主：

- 单张失败时允许重新分析当前图片。
- 批量分析中某张失败不终止后续图片。
- 高级分析失败时允许用户修正 Key 或切换模型后重试高级分析。
- 上传图片删除时必须释放 `URL.createObjectURL` 创建的对象 URL。

## 6. 状态机设计

### 6.1 Photo Session 状态

| 当前状态 | 事件 | 下一状态 | CAS 条件 | 失败处理 |
|---|---|---|---|---|
| empty | upload.valid | ready | photos.length = 0 | 无 |
| ready | upload.valid | ready | 未超过数量限制 | 追加照片 |
| ready | remove.photo | ready / empty | photo.id 存在 | 释放 previewUrl |
| ready | analyze.start | analyzing | isAnalyzing = false | 禁用按钮 |
| analyzing | analyze.photoSuccess | analyzing | task.id 匹配 | 写入单张结果 |
| analyzing | analyze.photoFailed | analyzing | task.id 匹配 | 写入失败状态 |
| analyzing | analyze.done | completed | 所有 task 结束 | 展示结果 |
| completed | upload.valid | ready | 新图片加入 | 保留已有结果或按策略清理 |
| completed | remove.photo | completed / empty | photo.id 存在 | 删除对应结果 |

### 6.2 单张分析任务状态

| 当前状态 | 事件 | 下一状态 | CAS 条件 | 失败处理 |
|---|---|---|---|---|
| pending | normalize.start | normalizing | task 未取消 | 解码失败进入 failed |
| normalizing | normalize.done | extractingSignals | normalizedImage 存在 | 无 |
| extractingSignals | localVision.done | extractingSignals | task 未取消 | vision fallback |
| extractingSignals | cv.done | extractingSignals | task 未取消 | cv fallback |
| extractingSignals | exif.done | extractingSignals | task 未取消 | exif empty |
| extractingSignals | signals.done | applyingRules | 至少有一种信号 | 无 |
| applyingRules | rules.done | basicCompleted | result schema valid | schema 错误进入 failed |
| basicCompleted | advanced.start | advancedAnalyzing | 用户启用高级分析 | 高级失败保留 basicCompleted |
| advancedAnalyzing | advanced.done | completed | advanced result valid | 无 |
| advancedAnalyzing | advanced.failed | completed | basic result exists | 添加 warning |
| any | cancel | cancelled | task id 匹配 | 停止后续状态写入 |

### 6.3 高级分析授权状态

| 当前状态 | 事件 | 下一状态 | CAS 条件 | 失败处理 |
|---|---|---|---|---|
| disabled | user.enable | pendingConsent | 用户主动开启 | 显示隐私说明 |
| pendingConsent | consent.accept | enabled | 用户确认 | 允许调用 |
| pendingConsent | consent.reject | disabled | 用户取消 | 仅基础分析 |
| enabled | key.missing | blocked | provider 需要 Key | 提示配置 |
| blocked | key.valid | enabled | Key 非空 | 可重试 |

## 7. 数据库详细设计

### 7.1 V0.5 数据存储结论

V0.5 不引入服务端数据库，数据生命周期如下：

| 数据对象 | 存储位置 | 生命周期 | 是否包含原图 | 说明 |
|---|---|---|---|---|
| UploadedPhoto | React state | 页面会话 | 是，File 对象 | 仅浏览器内存 |
| previewUrl | Blob URL | 页面会话 | 指向本地 Blob | 删除或卸载时释放 |
| AnalysisConfig | React state / localStorage | 会话或本机浏览器 | 否 | Key 仅 Gemini MVP 场景可保存 |
| PhotoAnalysisV2Result | React state | 页面会话 | 否，保存 previewUrl 引用 | 可下载 JSON |
| Export JSON | 用户下载文件 | 用户本地 | 默认不含 API Key | 可包含分析指标 |

### 7.2 V1 可选 IndexedDB 对象库

如果 V1 增加本地历史记录，优先使用 IndexedDB，不需要服务端数据库。

对象库：

| Store | Key | 用途 | 生命周期 |
|---|---|---|---|
| `analysis_sessions` | `sessionId` | 一次批量分析会话 | 用户手动删除 |
| `analysis_results` | `resultId` | 单张图片分析结果 | 用户手动删除 |
| `analysis_assets` | `assetId` | 可选缩略图 Blob | 默认 30 天或用户删除 |

`analysis_results` 建议结构：

```ts
type AnalysisResultRecord = {
  resultId: string;
  sessionId: string;
  fileName: string;
  fileSize: number;
  imageHash?: string;
  createdAt: string;
  updatedAt: string;
  result: PhotoAnalysisV2Result;
  thumbnailAssetId?: string;
};
```

索引：

| Store | 索引 | 字段 | 用途 |
|---|---|---|---|
| `analysis_sessions` | `idx_createdAt` | `createdAt` | 历史列表倒序 |
| `analysis_results` | `idx_sessionId` | `sessionId` | 查询会话下结果 |
| `analysis_results` | `idx_createdAt` | `createdAt` | 最近分析 |
| `analysis_results` | `idx_sceneType` | `result.scene.sceneType` | 按场景筛选 |

### 7.3 V1 可选云端历史表 DDL

只有在引入账号体系和云端历史时才需要 SQL 数据库。

```sql
CREATE TABLE photo_analysis_session (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  mode VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_user_created_at (user_id, created_at),
  INDEX idx_deleted_at (deleted_at)
);

CREATE TABLE photo_analysis_result (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  image_hash VARCHAR(128) NULL,
  scene_type VARCHAR(64) NULL,
  overall_score INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  result_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_session_id (session_id),
  INDEX idx_user_created_at (user_id, created_at),
  INDEX idx_scene_type (scene_type),
  INDEX idx_image_hash (image_hash),
  INDEX idx_deleted_at (deleted_at)
);
```

字段说明：

| 字段 | 类型 | 是否必填 | 说明 |
|---|---|---|---|
| `id` | varchar | 是 | UUID |
| `session_id` | varchar | 是 | 分析会话 ID |
| `user_id` | varchar | 是 | 用户 ID |
| `file_name` | varchar | 是 | 原始文件名 |
| `file_size` | bigint | 是 | 文件字节数 |
| `image_hash` | varchar | 否 | 可选感知 hash 或内容 hash |
| `scene_type` | varchar | 否 | 场景分类 |
| `overall_score` | int | 是 | 综合分 0 到 100 |
| `status` | varchar | 是 | `completed` / `partial` / `failed` |
| `result_json` | json | 是 | 完整分析结果 |
| `deleted_at` | timestamp | 否 | 软删除 |

## 8. 索引与分库分表设计

### 8.1 V0.5

无服务端数据库，无分库分表。

### 8.2 V1 云端历史

预估早期数据规模较小，不需要分库分表。

容量假设：

- 1000 名试用用户。
- 每人每月 100 张分析结果。
- 单条结果 JSON 约 20 KB。
- 月增量约 2 GB，普通 PostgreSQL / MySQL 可承载。

分表触发条件：

| 条件 | 策略 |
|---|---|
| 单表超过 5000 万行 | 按 `created_at` 月份归档或分区 |
| 单用户历史查询慢 | 增加 `(user_id, created_at)` 组合索引 |
| JSON 查询需求增加 | 将常用字段冗余到列，避免频繁 JSON 查询 |

## 9. Redis 详细设计

### 9.1 V0.5

V0.5 无 Redis。

浏览器侧使用：

| Key | 类型 | Value | TTL | 写入方 | 读取方 | 用途 |
|---|---|---|---|---|---|---|
| `photo-analysis-agent-gemini-api-key` | localStorage | Gemini API Key | 永久，直到用户切换 session 或清理 | `App.tsx` | `App.tsx` | MVP Key 复用 |

风险：

- localStorage 保存 Key 仅适合个人 MVP。
- 正式产品必须迁移服务端代理，前端不保存平台 Key。

### 9.2 V1 Serverless 可选 Redis Key

如果 V1 增加额度控制和限流，可引入 Redis。

| Key | 类型 | Value | TTL | 写入方 | 读取方 | 用途 |
|---|---|---|---|---|---|---|
| `photo:rate:{userId}:{yyyymmdd}` | String | 当日高级分析次数 | 2 天 | API | API | 每日额度 |
| `photo:idem:{idempotencyKey}` | String | request hash / result id | 24 小时 | API | API | 幂等 |
| `photo:job:{jobId}` | Hash | job status / progress | 24 小时 | Worker | API | 异步任务状态 |
| `photo:model:circuit:{provider}` | String | open / half-open | 5 分钟 | API | API | 模型熔断 |

### 9.3 Lua / 原子操作

V1 限流计数需要原子递增：

```lua
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
if current > tonumber(ARGV[2]) then
  return 0
end
return current
```

### 9.4 容量估算

| Key 类型 | 估算 |
|---|---|
| rate key | 用户数 * 2 天，10000 用户约 20000 个 key |
| idem key | 高级分析请求量 * 24 小时，日 100000 次约 100000 个 key |
| job key | 异步任务量 * 24 小时，早期可忽略 |

## 10. MQ 详细设计

### 10.1 V0.5

V0.5 无 MQ。

### 10.2 V1 可选异步高级分析

当高级分析耗时超过 10 秒或引入 PyIQA Worker 时，再考虑 MQ。

| Topic | 生产者 | 消费者 | 消息语义 | 重试 | 死信 |
|---|---|---|---|---|---|
| `photo.analysis.advanced.requested` | Serverless API | Advanced Analysis Worker | 至少一次 | 指数退避 3 次 | `photo.analysis.advanced.dlq` |
| `photo.analysis.iqa.requested` | Serverless API | PyIQA Worker | 至少一次 | 指数退避 2 次 | `photo.analysis.iqa.dlq` |

消息结构：

```json
{
  "jobId": "uuid",
  "userId": "user_123",
  "sessionId": "uuid",
  "resultId": "uuid",
  "provider": "gemini",
  "imageObjectKey": "optional-storage-key",
  "basicResult": {},
  "createdAt": "2026-05-29T12:00:00.000Z",
  "traceId": "trace-id"
}
```

消费要求：

- Consumer 必须基于 `jobId` 幂等。
- Worker 失败不删除基础分析结果。
- 死信消息保留 7 天，用于排查模型或图片异常。

## 11. 其他中间件结构

### 11.1 Web Worker

V0.5 建议将 CV 指标计算放入 Web Worker，避免大图计算阻塞 UI。

文件建议：

```text
src/workers/cvMetrics.worker.ts
```

消息协议：

```ts
type CvWorkerRequest = {
  type: "calculateCvMetrics";
  taskId: string;
  imageData: ImageData;
  width: number;
  height: number;
};

type CvWorkerResponse = {
  type: "cvMetricsDone" | "cvMetricsFailed";
  taskId: string;
  metrics?: CvMetrics;
  error?: string;
};
```

### 11.2 Browser Cache

Transformers.js 模型缓存由浏览器和库自身处理。产品需要在 UI 上提示首次下载较慢。

### 11.3 Object URL 管理

规则：

- 创建：上传成功后 `URL.createObjectURL(file)`。
- 删除：用户移除图片时 revoke。
- 卸载：页面卸载时 revoke 全部。
- 导出 JSON 不写入 Blob URL 以外的原图数据。

## 12. 接口详细设计

### 12.1 V0.5 前端内部接口清单

| 方法 | 路径 / 函数 | 用途 | 幂等 | 鉴权 |
|---|---|---|---|---|
| `normalizeImage` | `src/lib/imageNormalizer.ts` | 图片解码和缩放 | 同文件同配置结果稳定 | 无 |
| `classifyPhoto` | `src/lib/visionAnalysis.ts` | 本地模型或 Gemini 分类 | 不保证幂等，失败 fallback | Gemini 需要 Key |
| `calculateCvMetrics` | `src/lib/cvMetrics.ts` | 计算图像质量指标 | 是 | 无 |
| `extractExifSummary` | `src/lib/exifAnalysis.ts` | 解析 EXIF | 是 | 无 |
| `applyPhotoRules` | `src/lib/ruleEngine.ts` | 合成诊断和建议 | 是 | 无 |
| `analyzePhotoBasic` | `src/lib/analysisOrchestrator.ts` | 单张基础分析 | 是，除时间字段外 | 无 |
| `analyzePhotos` | `src/lib/analysisOrchestrator.ts` | 多张批量分析 | 与输入顺序相关 | 无 |

### 12.2 `AnalysisConfig`

```ts
type AnalysisMode = "basic" | "advanced";

type AnalysisConfig = {
  mode: AnalysisMode;
  localVision: {
    enabled: boolean;
    presetId: string;
    provider: "Transformers.js";
    task: "image-classification" | "zero-shot-image-classification";
    model: string;
    topK: number;
    candidateLabels: string[];
    hypothesisTemplate: string;
  };
  tools: {
    cvMetrics: boolean;
    exif: boolean;
    ruleEngine: boolean;
  };
  privacy: {
    allowCloudAnalysis: boolean;
    stripGpsInExport: boolean;
  };
  advanced?: {
    enabled: boolean;
    provider: "Gemini" | "OpenAI" | "Qwen";
    model: string;
    temperature: number;
    responseJson: boolean;
  };
};
```

### 12.3 `NormalizedImage`

```ts
type NormalizedImage = {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  imageData: ImageData;
  analysisScale: number;
  mimeType: string;
};
```

默认策略：

| 参数 | 默认值 |
|---|---|
| 最大分析边长 | 1024 px |
| 最小分析边长 | 256 px |
| Canvas 色彩空间 | 浏览器默认 |
| 透明背景 | 合成到白色背景后分析 |

### 12.4 `CvMetrics`

```ts
type CvMetrics = {
  exposure: {
    meanLuma: number;
    shadowRatio: number;
    highlightRatio: number;
    dynamicRange: number;
  };
  contrast: {
    rmsContrast: number;
    localContrastProxy: number;
  };
  sharpness: {
    edgeDensity: number;
    laplacianVarianceProxy: number;
  };
  color: {
    saturationMean: number;
    saturationStd: number;
    colorHarmonyProxy: number;
    dominantColorCount: number;
  };
  composition: {
    centerWeight: number;
    ruleOfThirdsProxy: number;
    negativeSpaceRatio: number;
  };
};
```

### 12.5 `ExifSummary`

```ts
type ExifSummary = {
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  focalLengthMm?: number;
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  exposureCompensation?: number;
  takenAt?: string;
  orientation?: number;
  hasGps: boolean;
  gpsRemovedInExport: boolean;
};
```

### 12.6 `PhotoAnalysisV2Result`

```ts
type SignalSource = "vision" | "cv" | "exif" | "rule" | "advanced";

type IssueSeverity = "high" | "medium" | "low";

type AnalysisIssue = {
  id: string;
  dimension: AnalysisDimensionKey;
  severity: IssueSeverity;
  title: string;
  evidence: string[];
  suggestions: string[];
  source: SignalSource[];
};

type Recommendation = {
  id: string;
  category: "shooting" | "postProcessing" | "composition" | "publishing";
  priority: IssueSeverity;
  title: string;
  steps: string[];
  expectedEffect: string;
};

type DimensionInsight = {
  key: AnalysisDimensionKey;
  title: string;
  score: number;
  confidence: number;
  currentState: string[];
  strengths: string[];
  issues: AnalysisIssue[];
  recommendations: Recommendation[];
  evidence: string[];
};

type PhotoAnalysisV2Result = {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  status: "completed" | "partial" | "failed";
  mode: "basic" | "advanced";
  scene: {
    sceneType: string;
    labels: VisionLabel[];
  };
  scores: {
    overall: number;
    confidence: number;
  };
  dimensions: DimensionInsight[];
  topIssues: AnalysisIssue[];
  recommendations: Recommendation[];
  signals: {
    vision?: VisionAnalysis;
    cv?: CvMetrics;
    exif?: ExifSummary;
    advanced?: AdvancedAnalysis;
  };
  warnings: string[];
  exportPolicy: {
    containsApiKey: false;
    containsOriginalImage: false;
    gpsRemoved: boolean;
  };
};
```

### 12.7 V1 Serverless 高级分析接口

```http
POST /api/analyze/advanced
Content-Type: multipart/form-data
Authorization: Bearer <user-token>
Idempotency-Key: <uuid>
```

请求字段：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `image` | File | 是 | 原图或压缩图 |
| `basicResult` | JSON string | 是 | V0.5 基础分析结果 |
| `provider` | string | 是 | `gemini` / `openai` / `qwen` |
| `model` | string | 是 | 模型 ID |
| `locale` | string | 否 | 默认 `zh-CN` |

响应：

```json
{
  "requestId": "uuid",
  "status": "completed",
  "advanced": {
    "summary": "这张照片的主体识别明确，但画面边缘存在干扰。",
    "narrative": ["画面更偏旅行纪实，适合强调现场关系。"],
    "refinedIssues": [],
    "refinedRecommendations": [],
    "confidence": 0.82
  },
  "warnings": []
}
```

错误码：

| 错误码 | HTTP 状态 | 场景 | 处理建议 |
|---|---|---|---|
| `IMAGE_TOO_LARGE` | 413 | 图片超过限制 | 前端压缩或提示用户 |
| `UNSUPPORTED_IMAGE_TYPE` | 400 | 非支持图片 | 只允许 jpg/png/webp |
| `ADVANCED_PROVIDER_UNAVAILABLE` | 503 | 模型服务不可用 | 保留基础结果 |
| `RATE_LIMITED` | 429 | 超过额度 | 提示稍后重试 |
| `INVALID_BASIC_RESULT` | 400 | 基础结果格式错误 | 前端上报错误 |
| `UNAUTHORIZED` | 401 | 未登录或 token 无效 | 重新登录 |

## 13. 幂等、并发与事务设计

### 13.1 V0.5 幂等

前端基础分析不涉及服务端事务。幂等目标是避免状态错乱：

- 每张图片使用 `photo.id` 作为任务主键。
- 分析开始时生成 `analysisRunId`。
- 状态更新必须携带 `analysisRunId` 和 `photo.id`。
- 如果用户在分析中删除图片，后续该图片结果不再写入 UI。
- 如果用户重新开始分析，旧 run 的异步回调不能覆盖新 run 结果。

建议类型：

```ts
type AnalysisRun = {
  runId: string;
  startedAt: string;
  photoIds: string[];
  status: "running" | "completed" | "cancelled";
};
```

### 13.2 V0.5 并发控制

默认策略：

| 任务 | 并发 |
|---|---|
| 图片 normalizer | 2 |
| 本地模型推理 | 1 |
| CV 指标计算 | 2 或 Worker 池 |
| EXIF 解析 | 4 |
| 高级云端分析 | 1 |

原因：

- 浏览器本地模型推理通常占用较多 CPU / WASM / WebGPU 资源。
- 大图 Canvas 计算过多并发会卡 UI。
- EXIF 解析轻量，可适度并发。

### 13.3 V1 事务边界

如果引入云端历史：

- 创建分析会话和基础结果保存为一个事务。
- 高级分析结果更新为独立事务。
- 高级分析失败不回滚基础结果。
- 删除历史使用软删除。

事务边界：

```text
create session + insert basic result
  -> commit
  -> async advanced analysis
  -> update result_json.advanced
  -> commit
```

### 13.4 V1 幂等

- 前端每次高级分析请求生成 `Idempotency-Key`。
- 后端保存 `idempotencyKey -> resultId / requestHash`。
- 相同 key + 相同 requestHash 返回同一结果。
- 相同 key + 不同 requestHash 返回 `IDEMPOTENCY_CONFLICT`。

## 14. 异常、重试与恢复设计

### 14.1 本地基础分析

| 模块 | 异常 | 重试 | 恢复 |
|---|---|---|---|
| Image Normalizer | 解码失败 | 不自动重试 | 标记该图失败 |
| Local Vision | 模型加载失败 | 用户手动重试 | 返回 fallback vision |
| CV Metrics | Worker 崩溃 | 自动重试 1 次 | 返回部分指标 |
| EXIF | 解析失败 | 不重试 | 返回空 EXIF |
| Rule Engine | Schema 错误 | 不重试 | 标记 failed，输出错误 |

### 14.2 高级分析

| 场景 | 策略 |
|---|---|
| Key 缺失 | 不发请求，提示配置 |
| 401 / 403 | 不重试，提示 Key 或权限错误 |
| 429 | 指数退避最多 1 次，仍失败则保留基础结果 |
| 5xx | 重试 1 次，失败降级 |
| JSON 解析失败 | 使用文本摘要 fallback，不覆盖结构化指标 |

### 14.3 结果恢复

V0.5 没有持久任务恢复。页面刷新后结果丢失，用户可重新分析。

V1 如果启用 IndexedDB：

- 分析完成后写入 IndexedDB。
- 页面刷新后可恢复历史结果列表。
- 正在运行中的任务刷新后标记为 `interrupted`，用户手动重试。

## 15. 配置项设计

### 15.1 前端配置

| 配置项 | 默认值 | 说明 | 是否支持动态调整 |
|---|---|---|---|
| `analysis.mode` | `basic` | 默认基础分析 | 是 |
| `localVision.enabled` | `true` | 启用本地模型 | 是 |
| `localVision.presetId` | `clip-scene-zero-shot` | 建议 V0.5 默认本地模型 | 是 |
| `localVision.topK` | `5` | 标签数量 | 是 |
| `tools.cvMetrics` | `true` | 启用 CV 指标 | 是 |
| `tools.exif` | `true` | 启用 EXIF | 是 |
| `tools.ruleEngine` | `true` | 启用规则引擎 | 否，核心能力 |
| `privacy.allowCloudAnalysis` | `false` | 是否允许云端高级分析 | 是 |
| `privacy.stripGpsInExport` | `true` | 导出时移除 GPS | 是 |
| `advanced.provider` | `Gemini` | 高级分析候选 | 是 |
| `advanced.temperature` | `0.2` | 输出稳定性 | 是 |

### 15.2 文件限制

| 配置项 | 默认值 |
|---|---|
| 支持类型 | jpg、jpeg、png、webp |
| 单文件最大大小 | 20 MB |
| 单次最大图片数 | 20 张 |
| 分析最大边长 | 1024 px |
| 缩略图最大边长 | 480 px |

### 15.3 V1 服务端配置

| 配置项 | 默认值 | 说明 | 是否支持动态调整 |
|---|---|---|---|
| `ADVANCED_PROVIDER` | `gemini` | 默认高级模型提供方 | 是 |
| `MAX_IMAGE_BYTES` | `10485760` | 高级分析上传限制 | 是 |
| `DAILY_ADVANCED_LIMIT` | `50` | 每日高级分析额度 | 是 |
| `MODEL_TIMEOUT_MS` | `30000` | 模型超时 | 是 |
| `STORE_ORIGINAL_IMAGE` | `false` | 是否保存原图 | 是 |

## 16. 可观测性设计

### 16.1 V0.5 前端指标

V0.5 不接入外部监控，先在本地记录可调试事件，后续可接入埋点。

事件：

| 事件名 | 字段 |
|---|---|
| `photo_uploaded` | count、totalBytes、types |
| `analysis_started` | runId、photoCount、mode、enabledTools |
| `image_normalized` | photoId、durationMs、originalSize、analysisSize |
| `vision_completed` | photoId、provider、model、status、durationMs |
| `cv_completed` | photoId、durationMs、metricCompleteness |
| `exif_completed` | photoId、durationMs、hasExif、hasGps |
| `rules_completed` | photoId、durationMs、issueCount |
| `analysis_completed` | runId、durationMs、successCount、failedCount |
| `analysis_failed` | runId、photoId、module、errorCode |
| `json_exported` | resultId、mode、stripGps |

### 16.2 日志

日志原则：

- 不打印 API Key。
- 不打印原图 base64。
- 不打印 GPS 原始坐标，除非用户显式调试。
- 错误日志保留模块名、错误码、耗时、模型 ID。

### 16.3 告警

V0.5 无服务端告警。

V1 告警：

| 指标 | 阈值 | 告警 |
|---|---|---|
| 高级分析 5xx | 5 分钟 > 5% | 模型服务异常 |
| 高级分析 p95 | > 30 秒 | 性能告警 |
| JSON 解析失败率 | > 3% | Prompt / Schema 异常 |
| 429 占比 | > 10% | 额度不足 |
| Worker 死信 | > 0 | 人工排查 |

## 17. 测试设计

### 17.1 功能用例矩阵

| 用例 | 前置条件 | 操作 | 期望 |
|---|---|---|---|
| 上传单张 jpg | 无 | 选择 jpg | 进入待分析队列 |
| 上传多张图片 | 无 | 选择 jpg/png/webp | 队列数量正确 |
| 上传非图片 | 无 | 选择 txt/pdf | 跳过并提示 |
| 删除图片 | 队列有图片 | 点击删除 | 队列移除，结果同步移除 |
| 基础分析无 Key | 不填 Key | 选择基础模式分析 | 返回基础结果 |
| 本地模型失败 | 模拟 pipeline 抛错 | 开始分析 | 返回 fallback，不中断 |
| CV 指标失败 | 模拟 worker 抛错 | 开始分析 | 结果 partial，有 warning |
| EXIF 缺失 | 上传无 EXIF 图片 | 分析 | 不报错，显示未读取 |
| 高级分析 Key 缺失 | 高级模式无 Key | 开始高级分析 | 阻止高级请求，基础分析可用 |
| 高级分析失败 | API 返回 500 | 开始分析 | 基础结果可用，显示高级失败 |
| JSON 下载 | 有结果 | 点击下载 | JSON 不含 apiKey |

### 17.2 CV 指标测试样本

| 样本 | 预期 |
|---|---|
| 纯黑图 | meanLuma 低，shadowRatio 高 |
| 纯白图 | meanLuma 高，highlightRatio 高 |
| 灰阶渐变 | dynamicRange 高，saturation 低 |
| 高饱和色块 | saturationMean 高 |
| 模糊图 | edgeDensity / sharpness 低 |
| 清晰线条图 | edgeDensity / sharpness 高 |

### 17.3 规则引擎测试

| 输入条件 | 期望问题 | 期望建议 |
|---|---|---|
| highlightRatio 高 | 高光溢出风险 | 降低曝光或保护高光 |
| shadowRatio 高且主体暗 | 暗部细节不足 | 补光或提升阴影 |
| sharpness 低 | 清晰度不足 | 提高快门或稳定拍摄 |
| saturationMean 过高 | 色彩过饱和 | 降低饱和度和局部色彩 |
| ISO 高且暗部多 | 噪点风险 | 降低 ISO 或增加光线 |
| 快门慢且场景为人像 | 运动模糊风险 | 提高快门速度 |

### 17.4 接口测试

V0.5 主要测试内部函数：

- `normalizeImage(file, options)`
- `calculateCvMetrics(normalizedImage)`
- `extractExifSummary(file)`
- `applyPhotoRules(signals)`
- `analyzePhotoBasic(photo, config)`

V1 需要 API 测试：

- 参数缺失返回 400。
- 图片过大返回 413。
- 未授权返回 401。
- 幂等 key 重复返回相同结果。
- Provider 失败返回可降级错误。

### 17.5 并发测试

| 场景 | 期望 |
|---|---|
| 连续点击开始分析 | 只启动一次 run |
| 分析中删除图片 | 不写入已删除图片结果 |
| 分析中再次上传图片 | 新图不进入当前 run，或明确进入下一 run |
| 20 张图片批量分析 | UI 不冻结，进度可见 |
| 模型首次下载 | 有状态提示 |

### 17.6 幂等测试

| 场景 | 期望 |
|---|---|
| 同一 run 的旧回调晚到 | 不覆盖新 run |
| 同一高级分析 Idempotency-Key 重试 | 返回同一结果 |
| 不同请求复用同一 Idempotency-Key | 返回冲突 |

### 17.7 故障注入测试

| 注入点 | 方法 | 期望 |
|---|---|---|
| Transformers.js pipeline | mock throw | fallback vision |
| FileReader | mock error | 图片失败 |
| Canvas getImageData | mock throw | CV warning |
| EXIF parser | mock throw | EXIF empty |
| Gemini fetch | mock 500 / invalid JSON | 高级失败，基础可用 |

### 17.8 回归测试范围

- 上传和删除。
- 模型 preset 切换。
- 基础分析结果渲染。
- Gemini MVP 分析。
- 术语气泡。
- JSON 下载。
- 移动端布局。

## 18. 压测与容量评估

### 18.1 V0.5 浏览器容量目标

| 指标 | 目标 |
|---|---|
| 单次上传数量 | 20 张以内 |
| 单图大小 | 20 MB 以内 |
| 单图基础分析耗时 | 二次运行 3 秒内，首次模型下载除外 |
| UI 阻塞 | 主线程长任务尽量低于 100 ms |
| 内存 | 20 张 1024 px 分析图不导致页面崩溃 |

### 18.2 前端性能优化点

1. Transformers.js 和高级分析代码动态 import。
2. CV 计算放入 Web Worker。
3. 图片分析前缩放到最大边长 1024 px。
4. 批量图片限制并发。
5. 分析完成后释放中间 Canvas / ImageData 引用。
6. 当前构建主 chunk 偏大，需要分包。

### 18.3 V1 服务端容量

| 模块 | 目标 |
|---|---|
| Serverless API | p95 < 2 秒，不含模型调用 |
| 高级模型调用 | p95 < 30 秒 |
| PyIQA Worker | 单图 < 10 秒作为 PoC 目标 |
| 高级分析并发 | 早期按 5 到 20 并发控制 |

## 19. 上线与回滚方案

### 19.1 V0.5 上线步骤

1. 新增 V2 类型和 result mapper，保持现有 UI 可兼容。
2. 新增 image normalizer、CV metrics、EXIF adapter、rule engine。
3. 将 `mockAnalysis.ts` 的编排职责迁移到 `analysisOrchestrator.ts`。
4. 将默认模式调整为基础分析。
5. 增加问题优先级和建议分类 UI。
6. 增加基础测试样本和单元测试。
7. 执行 `npm run build`。
8. 部署静态站点。

### 19.2 V0.5 回滚策略

| 变更 | 回滚方式 |
|---|---|
| V2 结果 Schema | 保留 V1 mapper，可切回现有 `PhotoAnalysisResult` |
| CV Metrics | 配置开关关闭 |
| EXIF Adapter | 配置开关关闭 |
| Rule Engine | 保留旧规则 fallback |
| 高级模式调整 | 保留当前 Gemini 前端直连 MVP 能力 |

### 19.3 V1 上线步骤

1. 新增 Serverless API，但默认不开启。
2. 前端保留 Gemini 直连作为开发调试模式，生产隐藏。
3. 小流量启用高级分析代理。
4. 观察错误率、耗时、成本。
5. 稳定后禁用前端直连 Key。

### 19.4 V1 回滚策略

- Serverless 异常时前端自动回退基础分析。
- Provider 异常时切换备选模型或关闭高级开关。
- 数据库异常时暂停历史保存，不影响实时基础分析。

## 20. 风险清单与待确认问题

### 20.1 风险清单

| 风险 | 等级 | 影响 | 应对 |
|---|---|---|---|
| 基础指标不够专业 | 高 | 用户质疑分析质量 | 明确来源，引入样本评测，V1 PoC PyIQA |
| 本地模型体积大 | 中 | 首次加载慢 | 动态加载、缓存提示、默认轻量 preset |
| 规则建议模板化 | 中 | 用户觉得空泛 | 按 CV / EXIF / 场景组合生成证据化建议 |
| 大图导致卡顿 | 中 | 体验下降 | 图片缩放、Worker、并发限制 |
| Gemini Key 暴露 | 高 | 不适合正式上线 | V1 代理化，生产禁用前端直连 |
| EXIF GPS 隐私 | 高 | 隐私泄露 | 默认导出脱敏，明确提示 |
| 多源信号冲突 | 中 | 结论不一致 | Rule Engine 中设计冲突优先级 |
| 高级模型幻觉 | 中 | 建议不可靠 | 高级结果不得覆盖工具指标，只做解释补充 |

### 20.2 待确认问题

| 问题 | 影响 | 建议确认时间 |
|---|---|---|
| V0.5 默认本地模型选 ViT 还是 CLIP | 首屏和分析质量 | 开发前 |
| 是否引入 `exifr` 依赖 | EXIF 能力完整度 | 开发前 |
| CV 指标是否先不上 Worker | 开发复杂度和性能 | 阶段 1 |
| 问题优先级展示形式 | UI 信息架构 | 阶段 2 |
| 是否保留前端 Gemini 直连 | MVP 便利性 vs 安全 | V0.5 发布前 |
| V1 是否需要本地历史 IndexedDB | 数据模型和交互 | V1 规划前 |

## 21. 两名资深开发和测试负责人修订结论

### 21.1 资深开发 A 结论

优先落地数据模型、状态机和规则引擎。V0.5 不应引入数据库事务复杂度，应把重点放在本地任务状态隔离、结果 Schema 稳定性和规则可测试性上。

采纳点：

- 新增 `PhotoAnalysisV2Result`。
- 所有建议必须携带证据来源。
- 高级分析只能增强，不能覆盖基础指标。

### 21.2 资深开发 B 结论

服务拆分应保持轻量。V0.5 不需要 Serverless、Redis、MQ；但接口、幂等、限流和异步 Worker 的设计要提前留好，避免 V1 推倒重来。

采纳点：

- V0.5 以前端内部接口为主。
- V1 只在高级分析和历史记录明确时引入后端。
- Web Worker 是前端性能优先项，不属于服务端中间件。

### 21.3 测试负责人结论

测试不能只验证“有结果”，必须验证“结果来源、降级、隐私和边界样本”。尤其要覆盖无 Key、模型失败、大图、无 EXIF、JSON 导出脱敏。

采纳点：

- 增加 CV 人造样本测试。
- 增加高级分析失败降级测试。
- JSON 导出必须断言不含 API Key 和原图 base64。

## 22. 开发任务拆分

### 阶段 1：基础类型与编排

| 任务 | 文件 | 验收 |
|---|---|---|
| 新增 V2 类型 | `src/types/analysisV2.ts` | 类型可编译 |
| 新增 result mapper | `src/lib/resultMapper.ts` | 兼容现有 UI |
| 新增 orchestrator | `src/lib/analysisOrchestrator.ts` | 可替代 `mockAnalysis.ts` 编排 |
| 默认基础模式 | `src/lib/modelPresets.ts` | 无 Key 可直接分析 |

### 阶段 2：工具信号

| 任务 | 文件 | 验收 |
|---|---|---|
| 图片归一化 | `src/lib/imageNormalizer.ts` | 大图缩放，透明图处理 |
| CV 指标 | `src/lib/cvMetrics.ts` | 人造样本指标符合预期 |
| EXIF 解析 | `src/lib/exifAnalysis.ts` | 有 / 无 EXIF 都稳定 |
| 工具开关 | `ModelConfigPanel.tsx` | 可开关 CV / EXIF |

### 阶段 3：规则与结果 UI

| 任务 | 文件 | 验收 |
|---|---|---|
| 规则引擎 | `src/lib/ruleEngine.ts` | 高中低优先级可测试 |
| 问题列表 | `src/components/IssuePriorityList.tsx` | 显示证据和优先级 |
| 建议分组 | `src/components/RecommendationList.tsx` | 拍摄 / 后期 / 发布 |
| 工具信号面板 | `src/components/ToolSignalPanel.tsx` | 展示 CV / EXIF 摘要 |

### 阶段 4：高级分析与安全收口

| 任务 | 文件 | 验收 |
|---|---|---|
| 高级分析 adapter | `src/lib/advancedAnalysis.ts` | 失败不影响基础结果 |
| 云端授权提示 | UI 组件 | 用户明确知道会上传 |
| JSON 脱敏 | `src/lib/exportResult.ts` | 不含 Key / GPS 默认脱敏 |
| V1 proxy 设计预留 | `/api/analyze/advanced` | 文档和类型对齐 |

## 23. 最终结论

V0.5 详细设计建议采用“前端基础分析引擎优先”的落地路线：

- 先重构分析编排和结果 Schema。
- 再接入 CV、EXIF、规则引擎，形成不依赖大模型的建议能力。
- 大模型保留为高级增强，V1 通过 Serverless 代理解决 Key、安全、限流和可观测性。
- 不在当前阶段引入数据库、Redis、MQ，避免过度工程化。

这条路线最符合当前产品目标：先把照片质量分析和优化建议做扎实，而不是过早追求自动改图或复杂后端。
