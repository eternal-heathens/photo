import type { NormalizedImage } from "../types/analysisV2";

type NormalizeImageOptions = {
  maxEdge?: number;
  background?: string;
};

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片解码失败"));
    };
    image.src = url;
  });
}

export async function normalizeImage(
  file: File,
  { maxEdge = 1024, background = "#ffffff" }: NormalizeImageOptions = {},
): Promise<NormalizedImage> {
  const image = await loadImage(file);
  const originalWidth = image.naturalWidth;
  const originalHeight = image.naturalHeight;

  if (!originalWidth || !originalHeight) {
    throw new Error("图片尺寸无效");
  }

  const analysisScale = Math.min(1, maxEdge / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * analysisScale));
  const height = Math.max(1, Math.round(originalHeight * analysisScale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("浏览器不支持 Canvas 图像分析");
  }

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return {
    width,
    height,
    originalWidth,
    originalHeight,
    imageData: context.getImageData(0, 0, width, height),
    analysisScale,
    mimeType: file.type || "image/jpeg",
  };
}
