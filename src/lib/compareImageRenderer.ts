import type { PhotoComparePlan } from "../types/analysisV2";

export type RenderedCompareDetail = {
  dataUrl: string;
  width: number;
  height: number;
  title: string;
  kind: "before" | "after";
};

export type RenderedCompareImage = {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
  before: RenderedCompareDetail;
  after: RenderedCompareDetail;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Adjustment = {
  brightness: number;
  contrast: number;
  saturation: number;
};

const palette = {
  ink: "#111111",
  paper: "#FDFAE7",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF1FF",
  line: "rgba(30, 43, 250, 0.18)",
  cobalt: "#1E2BFA",
  teal: "#0F766E",
  coral: "#DC2626",
  muted: "rgba(17, 17, 17, 0.58)",
};

function loadImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片读取失败，无法生成对比图。"));
    image.src = sourceUrl;
  });
}

function parseAspectRatio(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parts = value
    .split("/")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part) && part > 0);

  if (parts.length !== 2) return fallback;
  return parts[0] / parts[1];
}

function containRect(container: Rect, aspectRatio: number): Rect {
  const containerRatio = container.width / container.height;

  if (containerRatio > aspectRatio) {
    const width = container.height * aspectRatio;
    return {
      x: container.x + (container.width - width) / 2,
      y: container.y,
      width,
      height: container.height,
    };
  }

  const height = container.width / aspectRatio;
  return {
    x: container.x,
    y: container.y + (container.height - height) / 2,
    width: container.width,
    height,
  };
}

function sourceCropForAspect(image: HTMLImageElement, aspectRatio: number): Rect {
  const imageRatio = image.naturalWidth / image.naturalHeight;

  if (imageRatio > aspectRatio) {
    const width = image.naturalHeight * aspectRatio;
    return {
      x: (image.naturalWidth - width) / 2,
      y: 0,
      width,
      height: image.naturalHeight,
    };
  }

  const height = image.naturalWidth / aspectRatio;
  return {
    x: 0,
    y: (image.naturalHeight - height) / 2,
    width: image.naturalWidth,
    height,
  };
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, rect: Rect, radius: number) {
  const x2 = rect.x + rect.width;
  const y2 = rect.y + rect.height;

  ctx.beginPath();
  ctx.moveTo(rect.x + radius, rect.y);
  ctx.lineTo(x2 - radius, rect.y);
  ctx.quadraticCurveTo(x2, rect.y, x2, rect.y + radius);
  ctx.lineTo(x2, y2 - radius);
  ctx.quadraticCurveTo(x2, y2, x2 - radius, y2);
  ctx.lineTo(rect.x + radius, y2);
  ctx.quadraticCurveTo(rect.x, y2, rect.x, y2 - radius);
  ctx.lineTo(rect.x, rect.y + radius);
  ctx.quadraticCurveTo(rect.x, rect.y, rect.x + radius, rect.y);
  ctx.closePath();
}

function fillRoundedRect(ctx: CanvasRenderingContext2D, rect: Rect, radius: number, fillStyle: string) {
  ctx.save();
  drawRoundedRect(ctx, rect, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function strokeRoundedRect(ctx: CanvasRenderingContext2D, rect: Rect, radius: number, strokeStyle: string) {
  ctx.save();
  drawRoundedRect(ctx, rect, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function clipRoundedRect(ctx: CanvasRenderingContext2D, rect: Rect, radius: number) {
  drawRoundedRect(ctx, rect, radius);
  ctx.clip();
}

function drawContainImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, panel: Rect) {
  const target = containRect(panel, image.naturalWidth / image.naturalHeight);
  ctx.drawImage(image, target.x, target.y, target.width, target.height);
  return target;
}

function drawCroppedImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, panel: Rect, aspectRatio: number) {
  const target = containRect(panel, aspectRatio);
  const source = sourceCropForAspect(image, aspectRatio);

  ctx.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    target.x,
    target.y,
    target.width,
    target.height,
  );

  return target;
}

function filterNumber(filter: string | undefined, name: string, fallback: number) {
  if (!filter || filter === "none") return fallback;
  const match = new RegExp(`${name}\\(([^)]+)\\)`).exec(filter);
  if (!match) return fallback;
  const value = Number(match[1].trim());
  return Number.isFinite(value) ? value : fallback;
}

function parseAdjustment(filter: string | undefined): Adjustment {
  return {
    brightness: filterNumber(filter, "brightness", 1),
    contrast: filterNumber(filter, "contrast", 1),
    saturation: filterNumber(filter, "saturate", 1),
  };
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function adjustPixels(imageData: ImageData, adjustment: Adjustment) {
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    let red = data[index] * adjustment.brightness;
    let green = data[index + 1] * adjustment.brightness;
    let blue = data[index + 2] * adjustment.brightness;

    red = (red - 128) * adjustment.contrast + 128;
    green = (green - 128) * adjustment.contrast + 128;
    blue = (blue - 128) * adjustment.contrast + 128;

    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    red = luma + (red - luma) * adjustment.saturation;
    green = luma + (green - luma) * adjustment.saturation;
    blue = luma + (blue - luma) * adjustment.saturation;

    data[index] = clampByte(red);
    data[index + 1] = clampByte(green);
    data[index + 2] = clampByte(blue);
  }

  return imageData;
}

function drawAdjustedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  target: Rect,
  adjustment: Adjustment,
) {
  const width = Math.max(1, Math.round(target.width));
  const height = Math.max(1, Math.round(target.height));
  const buffer = document.createElement("canvas");
  const bufferCtx = buffer.getContext("2d");

  if (!bufferCtx) return;

  buffer.width = width;
  buffer.height = height;
  bufferCtx.drawImage(image, 0, 0, width, height);

  try {
    const imageData = bufferCtx.getImageData(0, 0, width, height);
    bufferCtx.putImageData(adjustPixels(imageData, adjustment), 0, 0);
  } catch {
    bufferCtx.filter = `brightness(${adjustment.brightness}) contrast(${adjustment.contrast}) saturate(${adjustment.saturation})`;
    bufferCtx.clearRect(0, 0, width, height);
    bufferCtx.drawImage(image, 0, 0, width, height);
    bufferCtx.filter = "none";
  }

  ctx.drawImage(buffer, target.x, target.y, target.width, target.height);
}

function drawPanelFrame(ctx: CanvasRenderingContext2D, rect: Rect, title: string, accent: string) {
  fillRoundedRect(ctx, rect, 8, palette.surface);
  strokeRoundedRect(ctx, rect, 8, palette.line);

  const label: Rect = {
    x: rect.x + 18,
    y: rect.y + 16,
    width: Math.max(94, title.length * 16 + 28),
    height: 34,
  };

  fillRoundedRect(ctx, label, 6, accent);
  ctx.fillStyle = palette.surface;
  ctx.font = "700 18px 'Noto Sans SC', 'Inter', sans-serif";
  ctx.fillText(title, label.x + 14, label.y + 23);
}

function drawGrid(ctx: CanvasRenderingContext2D, rect: Rect) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 2;

  for (let index = 1; index <= 2; index += 1) {
    const x = rect.x + (rect.width / 3) * index;
    const y = rect.y + (rect.height / 3) * index;
    ctx.beginPath();
    ctx.moveTo(x, rect.y);
    ctx.lineTo(x, rect.y + rect.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rect.x, y);
    ctx.lineTo(rect.x + rect.width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawOverlayLabels(ctx: CanvasRenderingContext2D, labels: string[] | undefined, rect: Rect) {
  if (!labels?.length) return;

  ctx.save();
  ctx.font = "700 17px 'Noto Sans SC', 'Inter', sans-serif";

  labels.slice(0, 3).forEach((label, index) => {
    const textWidth = ctx.measureText(label).width;
    const labelRect: Rect = {
      x: rect.x + 18,
      y: rect.y + rect.height - 22 - (labels.slice(0, 3).length - index) * 36,
      width: textWidth + 24,
      height: 28,
    };
    fillRoundedRect(ctx, labelRect, 6, "rgba(255, 255, 255, 0.9)");
    ctx.fillStyle = palette.ink;
    ctx.fillText(label, labelRect.x + 12, labelRect.y + 20);
  });

  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let currentLine = "";

  Array.from(text).forEach((char) => {
    const nextLine = `${currentLine}${char}`;
    if (ctx.measureText(nextLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
      return;
    }
    currentLine = nextLine;
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
) {
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function drawParameterCard(ctx: CanvasRenderingContext2D, plan: PhotoComparePlan, rect: Rect) {
  fillRoundedRect(ctx, rect, 8, palette.surfaceAlt);
  strokeRoundedRect(ctx, rect, 8, palette.line);

  ctx.fillStyle = palette.ink;
  ctx.font = "800 28px 'Noto Sans SC', 'Inter', sans-serif";
  drawWrappedText(ctx, plan.title, rect.x + 28, rect.y + 58, rect.width - 56, 34, 2);

  ctx.fillStyle = palette.muted;
  ctx.font = "500 18px 'Noto Sans SC', 'Inter', sans-serif";
  drawWrappedText(ctx, plan.summary, rect.x + 28, rect.y + 122, rect.width - 56, 28, 3);

  let cursorY = rect.y + 232;
  plan.preview.parameters?.slice(0, 4).forEach((item) => {
    const row: Rect = {
      x: rect.x + 28,
      y: cursorY,
      width: rect.width - 56,
      height: 58,
    };
    fillRoundedRect(ctx, row, 6, palette.surface);
    ctx.fillStyle = palette.muted;
    ctx.font = "700 15px 'Noto Sans SC', 'Inter', sans-serif";
    ctx.fillText(item.label, row.x + 18, row.y + 24);
    ctx.fillStyle = palette.ink;
    ctx.font = "800 19px 'Noto Sans SC', 'Inter', sans-serif";
    ctx.fillText(item.value, row.x + 18, row.y + 46);
    cursorY += 72;
  });
}

function drawOriginalVisual(ctx: CanvasRenderingContext2D, image: HTMLImageElement, rect: Rect) {
  ctx.save();
  clipRoundedRect(ctx, rect, 6);
  fillRoundedRect(ctx, rect, 6, palette.surfaceAlt);
  drawContainImage(ctx, image, rect);
  ctx.restore();
}

function drawSuggestedVisual(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  plan: PhotoComparePlan,
  rect: Rect,
  preferredAspect: number,
) {
  if (plan.operation === "parameter-card") {
    drawParameterCard(ctx, plan, rect);
    return;
  }

  ctx.save();
  clipRoundedRect(ctx, rect, 6);
  fillRoundedRect(ctx, rect, 6, palette.surfaceAlt);

  if (plan.operation === "crop") {
    const croppedRect = drawCroppedImage(ctx, image, rect, preferredAspect);
    drawGrid(ctx, croppedRect);
    drawOverlayLabels(ctx, plan.preview.overlayLabels, croppedRect);
  } else {
    const imageTarget = containRect(rect, image.naturalWidth / image.naturalHeight);
    drawAdjustedImage(ctx, image, imageTarget, parseAdjustment(plan.preview.cssFilter));
    if (plan.operation === "annotation") drawGrid(ctx, imageTarget);
    drawOverlayLabels(ctx, plan.preview.overlayLabels, imageTarget);
  }

  ctx.restore();
}

function drawFooter(ctx: CanvasRenderingContext2D, plan: PhotoComparePlan, rect: Rect) {
  fillRoundedRect(ctx, rect, 8, "rgba(255, 255, 255, 0.74)");
  ctx.fillStyle = palette.ink;
  ctx.font = "800 20px 'Noto Sans SC', 'Inter', sans-serif";
  ctx.fillText("处理说明", rect.x + 22, rect.y + 32);

  ctx.fillStyle = palette.muted;
  ctx.font = "500 18px 'Noto Sans SC', 'Inter', sans-serif";
  drawWrappedText(ctx, plan.summary, rect.x + 22, rect.y + 64, rect.width - 44, 28, 2);

  if (plan.safetyNotes.length) {
    ctx.fillStyle = palette.coral;
    ctx.font = "700 16px 'Noto Sans SC', 'Inter', sans-serif";
    drawWrappedText(ctx, `注意：${plan.safetyNotes[0]}`, rect.x + 22, rect.y + rect.height - 22, rect.width - 44, 24, 1);
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[^\w\u4e00-\u9fa5-]+/g, "-") || "photo";
}

function drawDetailHeader(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  width: number,
  margin: number,
) {
  ctx.fillStyle = palette.ink;
  ctx.font = "800 38px 'Noto Sans SC', 'Inter', sans-serif";
  ctx.fillText(title, margin, margin + 40);

  ctx.fillStyle = palette.muted;
  ctx.font = "600 20px 'Noto Sans SC', 'Inter', sans-serif";
  drawWrappedText(ctx, subtitle, margin, margin + 78, width - margin * 2, 28, 1);
}

function renderDetailImage(
  image: HTMLImageElement,
  fileName: string,
  plan: PhotoComparePlan,
  kind: RenderedCompareDetail["kind"],
  preferredAspect: number,
): RenderedCompareDetail {
  const width = 1200;
  const margin = 44;
  const headerHeight = 112;
  const contentWidth = width - margin * 2;
  const sourceAspect = image.naturalWidth / image.naturalHeight;
  const contentAspect = kind === "after" && plan.operation === "crop" ? preferredAspect : sourceAspect;
  const boundedAspect = Math.max(0.75, Math.min(contentAspect, 1.65));
  const contentHeight = plan.operation === "parameter-card" && kind === "after"
    ? 760
    : Math.round(Math.min(860, Math.max(560, contentWidth / boundedAspect)));
  const height = margin + headerHeight + contentHeight + margin;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("当前浏览器不支持 Canvas 渲染。");
  }

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);

  const title = kind === "before" ? "原图单独预览" : "建议图单独预览";
  const subtitle = kind === "before" ? fileName : `${fileName} · ${plan.title}`;
  drawDetailHeader(ctx, title, subtitle, width, margin);

  const contentRect: Rect = {
    x: margin,
    y: margin + headerHeight,
    width: contentWidth,
    height: contentHeight,
  };

  fillRoundedRect(ctx, contentRect, 8, palette.surface);
  strokeRoundedRect(ctx, contentRect, 8, palette.line);

  const inset = 18;
  const visualRect: Rect = {
    x: contentRect.x + inset,
    y: contentRect.y + inset,
    width: contentRect.width - inset * 2,
    height: contentRect.height - inset * 2,
  };

  if (kind === "before") {
    drawOriginalVisual(ctx, image, visualRect);
  } else {
    drawSuggestedVisual(ctx, image, plan, visualRect, preferredAspect);
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width,
    height,
    title,
    kind,
  };
}

export async function renderCompareImage(
  sourceUrl: string,
  fileName: string,
  plan: PhotoComparePlan,
): Promise<RenderedCompareImage> {
  const image = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("当前浏览器不支持 Canvas 渲染。");
  }

  const width = 1600;
  const margin = 48;
  const headerHeight = 118;
  const gap = 32;
  const panelWidth = (width - margin * 2 - gap) / 2;
  const preferredAspect = parseAspectRatio(plan.preview.aspectRatio, image.naturalWidth / image.naturalHeight);
  const before = renderDetailImage(image, fileName, plan, "before", preferredAspect);
  const after = renderDetailImage(image, fileName, plan, "after", preferredAspect);
  const panelHeight = Math.round(Math.min(660, Math.max(500, panelWidth / Math.max(0.82, Math.min(preferredAspect, 1.55)))));
  const footerHeight = 126;
  const height = margin + headerHeight + panelHeight + gap + footerHeight + margin;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.ink;
  ctx.font = "800 38px 'Noto Sans SC', 'Inter', sans-serif";
  ctx.fillText("照片优化对比图", margin, margin + 44);

  ctx.fillStyle = palette.muted;
  ctx.font = "600 20px 'Noto Sans SC', 'Inter', sans-serif";
  drawWrappedText(ctx, `${fileName} · ${plan.title}`, margin, margin + 82, width - margin * 2 - 260, 28, 1);

  ctx.textAlign = "right";
  ctx.fillStyle = palette.cobalt;
  ctx.font = "800 22px 'Inter', 'Noto Sans SC', sans-serif";
  ctx.fillText(`置信度 ${plan.confidence}`, width - margin, margin + 48);
  ctx.textAlign = "left";

  const beforePanel: Rect = {
    x: margin,
    y: margin + headerHeight,
    width: panelWidth,
    height: panelHeight,
  };
  const afterPanel: Rect = {
    x: margin + panelWidth + gap,
    y: margin + headerHeight,
    width: panelWidth,
    height: panelHeight,
  };

  drawPanelFrame(ctx, beforePanel, "原图", palette.ink);
  drawPanelFrame(ctx, afterPanel, "建议图", palette.cobalt);

  const imageInset = 22;
  const beforeImageRect: Rect = {
    x: beforePanel.x + imageInset,
    y: beforePanel.y + 64,
    width: beforePanel.width - imageInset * 2,
    height: beforePanel.height - 86,
  };
  const afterImageRect: Rect = {
    x: afterPanel.x + imageInset,
    y: afterPanel.y + 64,
    width: afterPanel.width - imageInset * 2,
    height: afterPanel.height - 86,
  };

  drawOriginalVisual(ctx, image, beforeImageRect);
  drawSuggestedVisual(ctx, image, plan, afterImageRect, preferredAspect);

  const footerRect: Rect = {
    x: margin,
    y: margin + headerHeight + panelHeight + gap,
    width: width - margin * 2,
    height: footerHeight,
  };
  drawFooter(ctx, plan, footerRect);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width,
    height,
    fileName: `${sanitizeFileName(fileName)}-${plan.id}-compare.png`,
    before,
    after,
  };
}

export function downloadRenderedCompareImage(renderedImage: RenderedCompareImage) {
  const anchor = document.createElement("a");
  anchor.href = renderedImage.dataUrl;
  anchor.download = renderedImage.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function downloadRenderedCompareDetailImage(
  renderedImage: RenderedCompareImage,
  detail: RenderedCompareDetail,
) {
  const anchor = document.createElement("a");
  const suffix = detail.kind === "before" ? "original" : "suggested";
  anchor.href = detail.dataUrl;
  anchor.download = renderedImage.fileName.replace(/-compare\.png$/, `-${suffix}.png`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
