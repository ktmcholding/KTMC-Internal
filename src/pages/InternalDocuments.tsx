import { useMemo, useState } from "react";
import { FileText, Trash2, Download, FolderClosed } from "lucide-react";
import {
  INTERNAL_DOC_FOLDERS,
  type InternalDocFolder,
  type InternalDocument,
} from "../types";
import { useStore } from "../store/AppStore";
import { useAuth } from "../store/AuthStore";
import { PageHeader } from "../components/PageHeader";
import { DocumentDropzone } from "../components/DocumentDropzone";
import { StatCard } from "../components/StatCard";
import { formatBytes, formatDate, uid } from "../lib/format";
import { isSupabaseConfigured } from "../lib/supabase";
import { getInternalDocumentUrl, uploadInternalDocuments } from "../lib/api";

export function InternalDocuments() {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const [folder, setFolder] = useState<InternalDocFolder>("general");

  const docs = state.internalDocuments;
  const inFolder = useMemo(
    () => docs.filter((d) => d.folder === folder),
    [docs, folder]
  );

  const totalSize = docs.reduce((s, d) => s + d.size, 0);

  async function handleAdd(files: File[]) {
    const uploadedBy = user?.email ?? "unknown";
    let newDocs: InternalDocument[];
    if (isSupabaseConfigured) {
      newDocs = await uploadInternalDocuments(files, folder, uploadedBy);
    } else {
      newDocs = files.map((f) => ({
        id: uid("idoc"),
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        folder,
        notes: "",
        uploadedAt: new Date().toISOString().slice(0, 10),
        uploadedBy,
      }));
    }
    dispatch({ type: "ADD_INTERNAL_DOCS", documents: newDocs });
  }

  return (
    <div>
      <PageHeader
        title="Internal Documents"
        subtitle="Company-wide vault for important KTMC documents — handbooks, templates, policies and more."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Documents" value={String(docs.length)} tone="brand" />
        <StatCard label="Total size" value={formatBytes(totalSize)} tone="default" />
        <StatCard
          label="Folders"
          value={String(INTERNAL_DOC_FOLDERS.length)}
          tone="default"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Folder rail */}
        <div className="card h-fit p-2">
          <nav className="space-y-0.5">
            {INTERNAL_DOC_FOLDERS.map((f) => {
              const count = docs.filter((d) => d.folder === f.id).length;
              const active = folder === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFolder(f.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FolderClosed size={16} /> {f.label}
                  </span>
                  <span className="text-xs text-gray-400">{count}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Folder contents */}
        <div className="lg:col-span-3">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Upload to{" "}
              {INTERNAL_DOC_FOLDERS.find((f) => f.id === folder)?.label}
            </h2>
            <DocumentDropzone
              documents={[]}
              onAdd={handleAdd}
            />
          </div>

          <div className="card mt-6">
            <div className="border-b border-gray-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                {INTERNAL_DOC_FOLDERS.find((f) => f.id === folder)?.label} documents (
                {inFolder.length})
              </h2>
            </div>
            {inFolder.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-400">
                No documents in this folder yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {inFolder.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText size={18} className="shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {d.name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {formatBytes(d.size)} · {formatDate(d.uploadedAt)} ·{" "}
                          {d.uploadedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-3">
                      {isSupabaseConfigured && d.path && (
                        <button
                          className="btn-ghost p-2"
                          title="Download"
                          onClick={async () => {
                            const url = await getInternalDocumentUrl(d.path!);
                            if (url) window.open(url, "_blank");
                          }}
                        >
                          <Download size={16} />
                        </button>
                      )}
                      <button
                        className="text-gray-400 hover:text-red-500"
                        title="Delete"
                        onClick={() =>
                          dispatch({
                            type: "DELETE_INTERNAL_DOC",
                            id: d.id,
                            path: d.path,
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
