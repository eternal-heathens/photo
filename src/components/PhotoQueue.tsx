import { Trash2 } from "lucide-react";
import type { UploadedPhoto } from "../types/photo";
import { formatFileSize } from "../lib/utils";

type PhotoQueueProps = {
  photos: UploadedPhoto[];
  onRemovePhoto: (id: string) => void;
};

export function PhotoQueue({ photos, onRemovePhoto }: PhotoQueueProps) {
  if (!photos.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">待分析照片</h2>
        <span className="text-sm text-ink/60">{photos.length} 张</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {photos.map((photo) => (
          <article
            key={photo.id}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-line bg-forest-alt/75 p-3"
          >
            <img
              className="h-16 w-16 rounded-md object-cover"
              src={photo.previewUrl}
              alt={photo.fileName}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{photo.fileName}</p>
              <p className="text-xs text-ink/60">{formatFileSize(photo.size)}</p>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-ink/70 transition hover:border-coral hover:bg-coral/10 hover:text-coral focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 focus:ring-offset-paper"
              aria-label={`删除 ${photo.fileName}`}
              onClick={() => onRemovePhoto(photo.id)}
              title="删除"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
