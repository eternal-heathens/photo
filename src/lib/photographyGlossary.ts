export type PhotographyGlossaryEntry = {
  term: string;
  explanation: string;
  note: string;
  links: Array<{
    label: string;
    url: string;
  }>;
};

export const PHOTOGRAPHY_GLOSSARY: PhotographyGlossaryEntry[] = [
  {
    term: "三分法",
    explanation: "把画面横竖各分成三等份，将主体放在分割线或交点附近，用来建立基础平衡。",
    note: "适合作为快速构图参考，但不需要机械套用。",
    links: [
      {
        label: "Adobe：Rule of thirds",
        url: "https://www.adobe.com/creativecloud/photography/technique/rule-of-thirds.html",
      },
      {
        label: "Wikipedia：Rule of thirds",
        url: "https://en.wikipedia.org/wiki/Rule_of_thirds",
      },
    ],
  },
  {
    term: "浅景深",
    explanation: "只有较窄距离范围保持清晰，前景或背景虚化，常用于突出主体。",
    note: "通常由大光圈、长焦距、近距离拍摄共同影响。",
    links: [
      {
        label: "Wikipedia：Depth of field",
        url: "https://en.wikipedia.org/wiki/Depth_of_field",
      },
      {
        label: "Adobe：Composition basics",
        url: "https://www.adobe.com/creativecloud/photography/technique/composition.html",
      },
    ],
  },
  {
    term: "景深",
    explanation: "画面中从近到远被认为足够清晰的距离范围。",
    note: "景深越浅，主体分离越明显；景深越深，环境信息越完整。",
    links: [
      {
        label: "Wikipedia：Depth of field",
        url: "https://en.wikipedia.org/wiki/Depth_of_field",
      },
    ],
  },
  {
    term: "引导线",
    explanation: "利用道路、栏杆、建筑边缘、光影线条等把视线引向主体。",
    note: "线条最好有明确方向，并服务于主体而不是把视线带出画面。",
    links: [
      {
        label: "Adobe：Composition",
        url: "https://www.adobe.com/creativecloud/photography/technique/composition.html",
      },
      {
        label: "REI：Photo composition tips",
        url: "https://www.rei.com/learn/expert-advice/photo-composition-seven-tips-to-take-better-photos.html",
      },
    ],
  },
  {
    term: "负空间",
    explanation: "主体周围相对空白或低信息量的区域，用来强化主体、制造呼吸感。",
    note: "负空间不是空洞，关键是它要帮助主体更清楚。",
    links: [
      {
        label: "Wikipedia：Negative space",
        url: "https://en.wikipedia.org/wiki/Negative_space",
      },
      {
        label: "Adobe：Rule of thirds",
        url: "https://www.adobe.com/creativecloud/photography/technique/rule-of-thirds.html",
      },
    ],
  },
  {
    term: "对称构图",
    explanation: "让画面左右、上下或中心轴附近形成稳定对应关系，常用于建筑、倒影、秩序感场景。",
    note: "对称构图要注意水平垂直与边缘细节，否则很容易显得不稳。",
    links: [
      {
        label: "Adobe：Composition",
        url: "https://www.adobe.com/creativecloud/photography/technique/composition.html",
      },
    ],
  },
  {
    term: "框架构图",
    explanation: "用门窗、树枝、建筑结构等元素围合主体，增强层次和观看焦点。",
    note: "框架元素要避免太抢眼，以免遮住主体表达。",
    links: [
      {
        label: "Adobe：Composition",
        url: "https://www.adobe.com/creativecloud/photography/technique/composition.html",
      },
    ],
  },
  {
    term: "主体隔离",
    explanation: "通过虚化、明暗、色彩、位置或大小差异，让主体从环境中被清楚识别。",
    note: "隔离不等于抹掉背景，环境仍可保留叙事信息。",
    links: [
      {
        label: "Adobe：Composition",
        url: "https://www.adobe.com/creativecloud/photography/technique/composition.html",
      },
    ],
  },
  {
    term: "视觉动线",
    explanation: "观看者视线在画面中移动的路径，通常由主体、线条、明暗和色彩共同决定。",
    note: "好的动线会把视线带向重点，而不是在无关区域停留。",
    links: [
      {
        label: "REI：Composition tips",
        url: "https://www.rei.com/learn/expert-advice/photo-composition-seven-tips-to-take-better-photos.html",
      },
    ],
  },
  {
    term: "画面重心",
    explanation: "画面视觉重量的集中位置，受主体大小、亮度、色彩和位置影响。",
    note: "重心稳定不代表居中，而是视觉重量关系合理。",
    links: [
      {
        label: "Adobe：Composition",
        url: "https://www.adobe.com/creativecloud/photography/technique/composition.html",
      },
    ],
  },
  {
    term: "曝光补偿",
    explanation: "在自动曝光基础上主动加亮或压暗，让相机测光更符合创作意图。",
    note: "拍雪景、逆光或大面积暗背景时尤其常用。",
    links: [
      {
        label: "Wikipedia：Exposure compensation",
        url: "https://en.wikipedia.org/wiki/Exposure_compensation",
      },
      {
        label: "Wikipedia：Exposure",
        url: "https://en.wikipedia.org/wiki/Exposure_(photography)",
      },
    ],
  },
  {
    term: "点测光",
    explanation: "只测量画面中很小区域的亮度，用于保护关键主体或高光。",
    note: "适合反差强的场景，但需要明确你要以哪里作为曝光基准。",
    links: [
      {
        label: "Wikipedia：Metering mode",
        url: "https://en.wikipedia.org/wiki/Metering_mode",
      },
    ],
  },
  {
    term: "高光",
    explanation: "画面中最亮的区域，过曝时容易丢失纹理和层次。",
    note: "数字摄影里高光一旦完全溢出，后期很难恢复。",
    links: [
      {
        label: "Wikipedia：Exposure",
        url: "https://en.wikipedia.org/wiki/Exposure_(photography)",
      },
    ],
  },
  {
    term: "暗部",
    explanation: "画面中较暗的区域，承担阴影、轮廓和氛围信息。",
    note: "暗部提亮过度可能产生噪点或灰雾感。",
    links: [
      {
        label: "Wikipedia：Exposure",
        url: "https://en.wikipedia.org/wiki/Exposure_(photography)",
      },
    ],
  },
  {
    term: "阴影",
    explanation: "受光较少的区域，常用于塑造立体感、空间关系和情绪。",
    note: "阴影不一定要全部提亮，保留深度有时更有力量。",
    links: [
      {
        label: "Wikipedia：Exposure",
        url: "https://en.wikipedia.org/wiki/Exposure_(photography)",
      },
    ],
  },
  {
    term: "逆光",
    explanation: "光源位于主体背后或侧后方，会形成轮廓光、透明感或剪影。",
    note: "逆光拍摄要特别注意主体曝光和高光溢出。",
    links: [
      {
        label: "Wikipedia：Backlighting",
        url: "https://en.wikipedia.org/wiki/Backlighting_(lighting_design)",
      },
    ],
  },
  {
    term: "色温",
    explanation: "描述光源冷暖倾向的指标，低色温偏暖，高色温偏冷。",
    note: "统一色温可以减少杂色，混合光则可能带来复杂氛围。",
    links: [
      {
        label: "Wikipedia：Color temperature",
        url: "https://en.wikipedia.org/wiki/Color_temperature",
      },
    ],
  },
  {
    term: "饱和度",
    explanation: "色彩的鲜艳程度。饱和度越高，颜色越浓；越低，越接近灰。",
    note: "高饱和色块会抢视觉重量，适合有意控制数量。",
    links: [
      {
        label: "Wikipedia：Colorfulness",
        url: "https://en.wikipedia.org/wiki/Colorfulness",
      },
    ],
  },
  {
    term: "色彩对比",
    explanation: "利用冷暖、明暗、互补色或饱和度差异拉开视觉层级。",
    note: "色彩对比越强，越要控制主体和背景的主次关系。",
    links: [
      {
        label: "Adobe：Composition",
        url: "https://www.adobe.com/creativecloud/photography/technique/composition.html",
      },
    ],
  },
  {
    term: "裁切",
    explanation: "通过重新取景删除无效边缘，改变画面比例、重心和叙事重点。",
    note: "裁切会损失像素，建议先解决构图，再用裁切微调。",
    links: [
      {
        label: "Adobe：Rule of thirds",
        url: "https://www.adobe.com/creativecloud/photography/technique/rule-of-thirds.html",
      },
    ],
  },
  {
    term: "局部蒙版",
    explanation: "后期中只选择画面某个区域进行亮度、颜色、锐度等调整。",
    note: "适合强化主体，但边缘过渡要自然。",
    links: [
      {
        label: "Adobe：Lightroom masks",
        url: "https://helpx.adobe.com/lightroom-cc/using/masking.html",
      },
    ],
  },
  {
    term: "明度",
    explanation: "颜色或区域的明暗程度，是画面层次和视觉重点的重要因素。",
    note: "主体明度略高于背景时，通常更容易被看见。",
    links: [
      {
        label: "Wikipedia：Lightness",
        url: "https://en.wikipedia.org/wiki/Lightness",
      },
    ],
  },
  {
    term: "锐度",
    explanation: "边缘清晰度和细节对比感，影响照片看起来是否清楚有质感。",
    note: "锐化过度会出现白边和生硬纹理。",
    links: [
      {
        label: "Wikipedia：Image sharpness",
        url: "https://en.wikipedia.org/wiki/Sharpness",
      },
    ],
  },
  {
    term: "局部特写",
    explanation: "靠近主体局部拍摄，用细节、纹理或形态来表达重点。",
    note: "局部特写需要明确最值得观看的细节。",
    links: [
      {
        label: "Adobe：Composition",
        url: "https://www.adobe.com/creativecloud/photography/technique/composition.html",
      },
    ],
  },
  {
    term: "低角度",
    explanation: "从较低机位向上拍摄，可增强主体体量、力量感或空间压迫感。",
    note: "低角度容易带来透视变形，适合有意强化主体气势。",
    links: [
      {
        label: "REI：Composition tips",
        url: "https://www.rei.com/learn/expert-advice/photo-composition-seven-tips-to-take-better-photos.html",
      },
    ],
  },
  {
    term: "构图",
    explanation: "组织画面元素的位置、比例、方向和关系，让观看重点更清楚。",
    note: "构图服务于表达，不只是套规则。",
    links: [
      {
        label: "Adobe：Composition basics",
        url: "https://www.adobe.com/creativecloud/photography/technique/composition.html",
      },
    ],
  },
  {
    term: "光影",
    explanation: "光线方向、强度、明暗反差和阴影形态共同形成的视觉效果。",
    note: "光影决定体积感、氛围和画面情绪。",
    links: [
      {
        label: "Wikipedia：Lighting",
        url: "https://en.wikipedia.org/wiki/Lighting",
      },
    ],
  },
  {
    term: "色彩",
    explanation: "画面中颜色的冷暖、纯度、明暗和相互关系。",
    note: "色彩不仅是好看，也会影响主体层级和情绪。",
    links: [
      {
        label: "Wikipedia：Colorfulness",
        url: "https://en.wikipedia.org/wiki/Colorfulness",
      },
    ],
  },
];

export const SORTED_GLOSSARY = [...PHOTOGRAPHY_GLOSSARY].sort(
  (a, b) => b.term.length - a.term.length,
);

export function findGlossaryEntry(term: string) {
  return PHOTOGRAPHY_GLOSSARY.find((entry) => entry.term === term);
}
