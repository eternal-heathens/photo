# 摄影作品专业分析 Agent

纯前端 MVP：React + TypeScript + Vite + Tailwind CSS。

## 功能

- 拖拽或点击上传单张 / 多张照片
- 限制 jpg、jpeg、png、webp
- 展示缩略图、文件名、文件大小，并支持单张删除
- 使用 Transformers.js 在浏览器本地运行真实图片识别模型
- 支持在页面中切换模型 preset，并配置 topK、候选标签、Prompt 模板
- 默认使用“极速基础分析”，不等待模型下载，不配置大模型 Key 也可生成分析建议
- 支持三种模式：极速基础、本地识别、高级点评
- 支持 CV 指标分析：曝光、对比度、清晰度、色彩和构图代理指标
- 支持轻量 EXIF 读取：相机、镜头、ISO、光圈、快门、焦距、拍摄时间和 GPS 脱敏标识
- 支持规则引擎输出当前情况、存在问题、如何改进和问题优先级
- 支持 Gemini 高级图片分析配置：API Key、模型 ID、温度、JSON 输出、Key 保存方式
- 分析与建议中的摄影名词会自动显示知识气泡，包含解释和资料链接
- 基于本地模型、CV、EXIF 和规则生成结构化摄影分析结果，并保留失败回退
- 展示综合评分、置信度、优先问题、优化建议、维度分析和工具信号
- 展示拍摄侧建议、后期侧建议、导出策略和原始 JSON
- 支持单张结果 JSON 下载

## 本地运行

```bash
npm install
npm run dev
```

## 接入真实 AI API

当前已经接入 `@huggingface/transformers`，并预留 Gemini 云端多模态分析。

- 模型 preset：`src/lib/modelPresets.ts`
- 页面配置模块：`src/components/ModelConfigPanel.tsx`
- 推理入口：`src/lib/visionAnalysis.ts`
- 基础分析编排：`src/lib/analysisOrchestrator.ts`
- 图片归一化：`src/lib/imageNormalizer.ts`
- CV 指标：`src/lib/cvMetrics.ts`
- EXIF 解析：`src/lib/exifAnalysis.ts`
- 规则引擎：`src/lib/ruleEngine.ts`
- Gemini REST 调用：`src/lib/geminiAnalysis.ts`
- 摄影术语库：`src/lib/photographyGlossary.ts`
- 术语气泡组件：`src/components/TermBubble.tsx`

Gemini API Key 不会写入下载 JSON。选择“保存到本机浏览器”时会写入 `localStorage`，否则只保留在当前页面会话中。

正式产品建议将 Gemini API Key 放到后端或 Serverless 代理中，避免纯前端网络请求暴露 Key。
