import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";
import type { UploadedPhoto } from "../types/photo";
import { ACCEPTED_IMAGE_TYPES, createPhotoId } from "../lib/utils";

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
    const validFiles = files.filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type));
    const invalidFiles = files.filter((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type));

    if (invalidFiles.length) {
      onInvalidFiles(invalidFiles.map((file) => file.name));
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
          ? "border-teal bg-teal/10"
          : "border-line bg-white hover:border-cobalt hover:bg-cobalt/5"
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
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-cobalt text-white">
          <UploadCloud className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-ink">上传照片</h2>
          <p className="max-w-2xl text-sm leading-6 text-ink/65">
            拖拽图片到此处，或点击选择文件；支持 jpg、jpeg、png、webp，支持多张图片。
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink/90 focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          选择图片
        </button>
      </div>
    </section>
  );
}
