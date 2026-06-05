import type { CvMetrics, NormalizedImage } from "../types/analysisV2";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function rgbToHsvSaturation(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue) / 255;
  const min = Math.min(red, green, blue) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

function bucketColor(red: number, green: number, blue: number) {
  const r = Math.floor(red / 64);
  const g = Math.floor(green / 64);
  const b = Math.floor(blue / 64);
  return `${r}-${g}-${b}`;
}

function normalizeRatio(value: number, max: number) {
  if (!Number.isFinite(value) || max <= 0) return 0;
  return clamp01(value / max);
}

export function calculateCvMetrics(normalizedImage: NormalizedImage): CvMetrics {
  const { data, width, height } = normalizedImage.imageData;
  const pixelCount = width * height;
  const step = Math.max(1, Math.floor(pixelCount / 120000));
  const lumas: number[] = [];
  const saturations: number[] = [];
  const colorBuckets = new Map<string, number>();
  let lumaSum = 0;
  let lumaSquareSum = 0;
  let shadowCount = 0;
  let highlightCount = 0;
  let edgeCount = 0;
  let gradientSum = 0;
  let centerWeightedLuma = 0;
  let centerWeightTotal = 0;
  let ruleOfThirdsEnergy = 0;
  let ruleOfThirdsTotal = 0;
  let lowDetailCount = 0;
  let sampleCount = 0;
  let saturationSum = 0;
  let saturationSquareSum = 0;

  for (let index = 0; index < pixelCount; index += step) {
    const offset = index * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const luma = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    const saturation = rgbToHsvSaturation(red, green, blue);
    const x = index % width;
    const y = Math.floor(index / width);
    const nx = width > 1 ? x / (width - 1) : 0.5;
    const ny = height > 1 ? y / (height - 1) : 0.5;
    const centerDistance = Math.hypot(nx - 0.5, ny - 0.5);
    const centerWeight = clamp01(1 - centerDistance * 1.8);
    const thirdsDistance = Math.min(
      Math.abs(nx - 1 / 3),
      Math.abs(nx - 2 / 3),
      Math.abs(ny - 1 / 3),
      Math.abs(ny - 2 / 3),
    );
    const thirdsWeight = clamp01(1 - thirdsDistance * 6);

    lumas.push(luma);
    saturations.push(saturation);
    lumaSum += luma;
    lumaSquareSum += luma * luma;
    saturationSum += saturation;
    saturationSquareSum += saturation * saturation;
    centerWeightedLuma += luma * centerWeight;
    centerWeightTotal += centerWeight;
    ruleOfThirdsEnergy += luma * thirdsWeight;
    ruleOfThirdsTotal += thirdsWeight;
    sampleCount += 1;

    if (luma < 0.08) shadowCount += 1;
    if (luma > 0.92) highlightCount += 1;
    if (saturation < 0.08 && luma > 0.18 && luma < 0.82) lowDetailCount += 1;

    colorBuckets.set(bucketColor(red, green, blue), (colorBuckets.get(bucketColor(red, green, blue)) ?? 0) + 1);

    const rightOffset = x < width - 1 ? offset + 4 : offset;
    const downOffset = y < height - 1 ? offset + width * 4 : offset;
    const rightLuma =
      (0.2126 * data[rightOffset] + 0.7152 * data[rightOffset + 1] + 0.0722 * data[rightOffset + 2]) / 255;
    const downLuma =
      (0.2126 * data[downOffset] + 0.7152 * data[downOffset + 1] + 0.0722 * data[downOffset + 2]) / 255;
    const gradient = Math.abs(luma - rightLuma) + Math.abs(luma - downLuma);
    gradientSum += gradient;
    if (gradient > 0.16) edgeCount += 1;
  }

  const meanLuma = sampleCount ? lumaSum / sampleCount : 0;
  const lumaVariance = sampleCount ? lumaSquareSum / sampleCount - meanLuma * meanLuma : 0;
  const sortedLumas = [...lumas].sort((a, b) => a - b);
  const lowPercentile = sortedLumas[Math.floor(sortedLumas.length * 0.05)] ?? 0;
  const highPercentile = sortedLumas[Math.floor(sortedLumas.length * 0.95)] ?? 0;
  const saturationMean = sampleCount ? saturationSum / sampleCount : 0;
  const saturationVariance = sampleCount
    ? saturationSquareSum / sampleCount - saturationMean * saturationMean
    : 0;
  const dominantColorCount = Array.from(colorBuckets.values()).filter((count) => count / sampleCount > 0.025).length;

  return {
    exposure: {
      meanLuma: Number(meanLuma.toFixed(3)),
      shadowRatio: Number((shadowCount / sampleCount).toFixed(3)),
      highlightRatio: Number((highlightCount / sampleCount).toFixed(3)),
      dynamicRange: Number((highPercentile - lowPercentile).toFixed(3)),
    },
    contrast: {
      rmsContrast: Number(Math.sqrt(Math.max(0, lumaVariance)).toFixed(3)),
      localContrastProxy: Number(normalizeRatio(gradientSum / sampleCount, 0.35).toFixed(3)),
    },
    sharpness: {
      edgeDensity: Number((edgeCount / sampleCount).toFixed(3)),
      laplacianVarianceProxy: Number(normalizeRatio(gradientSum / sampleCount, 0.45).toFixed(3)),
    },
    color: {
      saturationMean: Number(saturationMean.toFixed(3)),
      saturationStd: Number(Math.sqrt(Math.max(0, saturationVariance)).toFixed(3)),
      colorHarmonyProxy: Number(clamp01(1 - Math.abs(saturationMean - 0.38) * 1.5).toFixed(3)),
      dominantColorCount,
    },
    composition: {
      centerWeight: Number((centerWeightedLuma / Math.max(1, centerWeightTotal)).toFixed(3)),
      ruleOfThirdsProxy: Number((ruleOfThirdsEnergy / Math.max(1, ruleOfThirdsTotal)).toFixed(3)),
      negativeSpaceRatio: Number((lowDetailCount / sampleCount).toFixed(3)),
    },
  };
}
