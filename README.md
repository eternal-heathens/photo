# 摄影作品专业分析 Agent

纯前端 MVP：React + TypeScript + Vite + Tailwind CSS。

## 功能

- 拖拽或点击上传单张 / 多张照片
- 限制 jpg、jpeg、png、webp
- 展示缩略图、文件名、文件大小，并支持单张删除
- 使用 Transformers.js 在浏览器本地运行真实图片识别模型
- 支持在页面中切换模型 preset，并配置 topK、候选标签、Prompt 模板
- 支持 Gemini 高维图片分析配置：API Key、模型 ID、温度、JSON 输出、Key 保存方式
- 分析与建议中的摄影名词会自动显示知识气泡，包含解释和资料链接
- 基于识别标签生成结构化摄影分析结果，并保留失败回退
- 展示综合评分、构图分析、光影分析、色彩分析、技巧标签
- 展示拍摄优化建议、后期处理建议、原始 JSON
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
- Gemini REST 调用：`src/lib/geminiAnalysis.ts`
- 摄影术语库：`src/lib/photographyGlossary.ts`
- 术语气泡组件：`src/components/TermBubble.tsx`

Gemini API Key 不会写入下载 JSON。选择“保存到本机浏览器”时会写入 `localStorage`，否则只保留在当前页面会话中。

正式产品建议将 Gemini API Key 放到后端或 Serverless 代理中，避免纯前端网络请求暴露 Key。
