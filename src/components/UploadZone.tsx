import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";
import type { UploadedPhoto } from "../types/photo";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_FILE_BYTES, createPhotoId, formatFileSize } from "../lib/utils";

type UploadZoneProps = {
  onAddPhotos: (photos: UploadedPhoto[]) => void;
  onInvalidFiles: (names: string[]) => void;
};

export function UploadZone({ onAddPhotos, onInvalidFiles }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const files = Array.from(fileList);
    const invalidFiles = files
      .filter((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_FILE_BYTES)
      .map((file) => {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return `${file.name}（格式不支持）`;
        return `${file.name}（超过 ${formatFileSize(MAX_IMAGE_FILE_BYTES)}）`;
      });
    const validFiles = files.filter(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_FILE_BYTES,
    );

    if (invalidFiles.length) {
      onInvalidFiles(invalidFiles);
    }

    if (validFiles.length) {
      onAddPhotos(
        validFiles.map((file) => ({
          id: createPhotoId(file),
          file,
          fileName: file.name,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
        })),
      );
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <section
      className={`rounded-lg border border-dashed p-6 transition ${
        isDragging
          ? "border-cobalt bg-cobalt/10"
          : "border-line bg-forest-alt/75 hover:border-cobalt hover:bg-cobalt/10"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        multiple
        onChange={handleInputChange}
      />
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-cream text-dark-ink">
          <UploadCloud className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-ink">上传照片</h2>
          <p className="max-w-2xl text-sm leading-6 text-ink/60">
            拖拽图片到此处，或点击选择文件；支持 jpg、jpeg、png、webp，支持多张图片。
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-cobalt px-4 py-2 text-sm font-semibold text-paper transition hover:bg-cobalt/90 focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 focus:ring-offset-paper"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          选择图片
        </button>
      </div>
    </section>
  );
}
