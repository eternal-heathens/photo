export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function createPhotoId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(2)} MB`;
}

export function downloadJson(fileName: string, payload: unknown) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${fileName.replace(/\.[^.]+$/, "") || "photo"}-analysis.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
