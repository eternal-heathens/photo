# 照片质量分析模型与工具调研

## 1. 调研结论

当前项目不应只寻找“一个更强的照片分析模型”，也不应在前期强依赖大模型。更合适的路线是：基础能力由小模型、IQA 工具、传统 CV、EXIF 和规则引擎完成；大模型作为可选高级配置，用于复杂语义、叙事分析和建议润色。

```text
多模态大模型
  作为可选增强，负责语义理解、摄影语言解释、复杂叙事分析、建议润色

IQA / 美学评分模型
  作为基础能力，负责清晰度、噪点、压缩、曝光、整体质量等量化参考

传统 CV / 元数据规则
  作为基础能力，负责模糊、过曝、欠曝、对比度、EXIF、比例和裁切辅助判断

交互层
  负责把结果组织成：当前情况 -> 存在问题 -> 如何改进
```

推荐路线：V0.5 先建立基础分析引擎，不配置大模型 Key 也能完成“当前情况、存在问题、如何改进”；V1 再把 Gemini / OpenAI / Qwen 这类多模态模型做成可选高级分析；V2 才考虑自部署开源 VLM 或专业模型微调。

## 2. 候选模型与工具

| 类型 | 候选 | 适合能力 | 不适合能力 | 集成建议 |
|---|---|---|---|---|
| 浏览器本地模型 | Transformers.js + CLIP / ViT | 免费、隐私友好、主体/场景标签 | 无法单独可靠判断摄影质量 | P0 保留为基础主体/场景识别 |
| 传统 CV | OpenCV / Canvas / Sharp | 模糊、曝光、对比度、直方图、比例、边缘检测 | 无法理解摄影意图 | P0 优先接入轻量规则 |
| 元数据工具 | EXIF 解析 | 快门、光圈、ISO、焦距、拍摄时间 | 上传图可能无 EXIF | P0/P1 用于生成更具体的拍摄建议 |
| 美学评分 | LAION aesthetic predictor | 轻量美学分，可用于排序和筛片 | 分数无法解释具体问题 | P1 可做批量筛选辅助，不单独作为结论 |
| IQA 工具 | PyIQA | 集成 MUSIQ、MANIQA、CLIPIQA、LIQE、TOPIQ、NIMA 等画质/美学模型 | 不会生成自然语言建议 | P1 后端服务，输出量化指标给规则或大模型解释 |
| 云端多模态模型 | Gemini Vision | 场景理解、构图/光影/色彩解释、结构化 JSON、建议生成 | 客观画质分不稳定，成本和 Key 管理需要控制 | P1 可选高级分析，应走 Serverless 代理 |
| 云端多模态模型 | OpenAI Vision 模型 | 图像理解、文字推理、结构化诊断、复杂提示词遵循 | 不是专门摄影评分模型，成本需评估 | P1 作为高级分析备选 |
| 开源多模态模型 | Qwen2.5-VL / Qwen-VL 系列 | 图像理解、视觉定位、中文能力、可自部署 | 显存和推理服务成本高 | P2 PoC，适合后端部署 |
| 开源多模态模型 | InternVL 系列 | 开源 VLM，适合图像问答和多图理解 | 仍需工程部署和评测 | P2 PoC，作为 Qwen 对照 |

## 3. 推荐分析维度与模型分工

| 分析维度 | 最佳信息来源 | 输出形式 |
|---|---|---|
| 构图与画面组织 | VLM + 视觉定位 + 简单裁切规则 | 当前构图描述、边缘干扰、主体位置、建议移动方向 |
| 光线与曝光 | VLM + 直方图 + EXIF | 高光/暗部问题、曝光补偿、测光建议 |
| 色彩与白平衡 | VLM + 色彩统计 | 色偏、冷暖关系、主色、后期方向 |
| 清晰度与技术质量 | IQA + Laplacian blur + EXIF | 跑焦/手抖/噪点/压缩判断 |
| 主体与层次 | VLM + 检测/分割 | 主体识别度、背景干扰、层次建议 |
| 景深与镜头语言 | VLM + EXIF | 光圈、焦段、透视、距离建议 |
| 情绪与叙事 | VLM | 画面意图、故事线、瞬间选择 |
| 后期优化空间 | VLM + 技术指标 | 裁切、曝光、色彩、局部蒙版建议 |
| 发布适配 | 规则 + VLM | 社媒比例、封面可读性、缩略图主体识别 |

## 4. 推荐产品输出结构

建议最终分析 JSON 不再只输出 `composition / lighting / color`，而是升级为以下结构：

```json
{
  "summary": {
    "overallScore": 82,
    "sceneType": "街拍",
    "bestUse": "社媒发布 / 学习复盘",
    "topIssue": "主体与背景有重叠，观看重点不够集中",
    "nextBestAction": "优先通过裁切和局部明度提升突出主体"
  },
  "dimensions": [
    {
      "id": "composition",
      "name": "构图与画面组织",
      "score": 78,
      "currentState": ["主体位于画面偏右，左侧留白较多"],
      "issues": [
        {
          "priority": "high",
          "evidence": "主体头部附近存在高对比背景线条",
          "impact": "削弱主体识别度"
        }
      ],
      "improvements": [
        {
          "type": "shooting",
          "action": "拍摄时向左移动半步，让背景线条避开人物头部"
        },
        {
          "type": "post",
          "action": "裁掉左侧 10%-15% 无效空间，并轻微提亮主体"
        }
      ]
    }
  ]
}
```

## 5. 接入优先级

P0：基础分析引擎，不强依赖大模型。

- Transformers.js / CLIP / ViT 负责主体、场景、基础标签。
- CV 指标负责亮度、对比度、模糊、尺寸、比例、基础色彩统计。
- EXIF 负责快门、光圈、ISO、焦距、拍摄时间等可用信息。
- 规则引擎把指标转为“当前情况、存在问题、如何改进”。
- 结果页增加顶部摘要、首要问题和建议分组。

P1：可选高级分析和专业质量工具。

- Gemini / OpenAI / Qwen API 明确作为高级分析选项，不阻塞基础结果。
- 大模型 prompt 明确要求输出“当前情况、存在问题、如何改进”，并解释基础指标。
- JSON Schema 扩展为多维数组，而不是固定三维字段。
- 引入 PyIQA 后端 PoC，先跑 3 到 5 个指标，不急着展示全部分数。

P2：模型对比、自部署和评分标定。

- 对 Gemini、OpenAI、Qwen2.5-VL、InternVL 做同一批照片的横向评测。
- 评测标准不是“回答看起来聪明”，而是“当前情况准确率、问题命中率、建议可执行率、用户采纳率”。
- 如果云端成本或隐私成为主要问题，再考虑 Qwen / InternVL 自部署。

## 6. PoC 评测方案

样本集：

- 人像、街拍、风光、静物、建筑、食物、夜景各 20 张。
- 每类包含好图、中等图、明显问题图。
- 每张人工标注 3 类信息：当前情况、主要问题、建议动作。

评测指标：

| 指标 | 说明 |
|---|---|
| 当前情况准确率 | 是否正确识别主体、场景、光线、基本构图 |
| 问题命中率 | 是否命中人工标注的主要问题 |
| 建议可执行率 | 建议是否能直接转成拍摄或后期动作 |
| 误导率 | 是否给出错误、过度自信或不适用建议 |
| 交互可读性 | 用户能否快速找到首要问题 |

## 7. 初步取舍

短期采用：

- Transformers.js 保留为免费兜底。
- 传统 CV 指标先补“模糊、曝光、比例、尺寸”。
- EXIF 解析补充拍摄参数建议。
- 规则引擎先生成基础建议。

中期评估：

- Gemini / OpenAI / Qwen API 任选 1 到 2 个做高质量结构化建议。
- PyIQA 作为专业质量评分补充。
- Qwen2.5-VL / InternVL 做自部署可行性 PoC。

暂不采用：

- 直接接 PhotoFramer 做改图生成。
- 直接用单一美学分决定照片好坏。
- 在没有人工样本集前训练自有摄影评分模型。

## 8. 参考资料

- OpenAI Vision docs: https://platform.openai.com/docs/guides/images-vision
- Gemini Vision docs: https://ai.google.dev/gemini-api/docs/vision
- Qwen2.5-VL blog: https://qwenlm.github.io/blog/qwen2.5-vl/
- InternVL GitHub: https://github.com/OpenGVLab/InternVL
- Transformers.js docs: https://huggingface.co/docs/transformers.js/index
- PyIQA GitHub: https://github.com/chaofengc/IQA-PyTorch
- LAION aesthetic predictor: https://github.com/christophschuhmann/improved-aesthetic-predictor
