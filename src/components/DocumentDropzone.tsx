import { useRef, useState, type DragEvent } from "react";
import { FileText, Trash2, UploadCloud } from "lucide-react";
import type { ClientDocument } from "../types";
import { formatBytes, formatDate, uid } from "../lib/format";

interface DocumentDropzoneProps {
  documents: ClientDocument[];
  onAdd: (docs: ClientDocument[]) => void;
  onRemove?: (id: string) => void;
}

/**
 * Drag-and-drop (or click) area for uploading multiple client documents.
 * Files are recorded as metadata; wiring to real object storage (S3 / GCS)
 * is a backend concern handled at integration time.
 */
export function DocumentDropzone({ documents, onAdd, onRemove }: DocumentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const docs: ClientDocument[] = Array.from(fileList).map((f) => ({
      id: uid("doc"),
      name: f.name,
      size: f.size,
      type: f.type || "application/octet-stream",
      uploadedAt: new Date().toISOString().slice(0, 10),
    }));
    onAdd(docs);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragging
            ? "border-brand-500 bg-brand-50"
            : "border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/40"
        }`}
      >
        <UploadCloud className="mb-2 text-brand-500" size={28} />
        <p className="text-sm font-medium text-gray-700">
          Drop documents here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Upload multiple files — contracts, briefs, specs, etc.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {documents.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={16} className="shrink-0 text-gray-400" />
                <span className="truncate text-sm text-gray-700">{d.name}</span>
              </div>
              <div className="flex items-center gap-3 pl-3">
                <span className="whitespace-nowrap text-xs text-gray-400">
                  {formatBytes(d.size)} · {formatDate(d.uploadedAt)}
                </span>
                {onRemove && (
                  <button
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => onRemove(d.id)}
                    aria-label={`Remove ${d.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
