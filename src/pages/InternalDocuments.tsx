import { useMemo, useState } from "react";
import {
  FileText,
  Trash2,
  Download,
  FolderClosed,
  Settings,
  Plus,
  Pencil,
} from "lucide-react";
import type { DocFolder, InternalDocFolder, InternalDocument } from "../types";
import { useStore } from "../store/AppStore";
import { useAuth } from "../store/AuthStore";
import { PageHeader } from "../components/PageHeader";
import { DocumentDropzone } from "../components/DocumentDropzone";
import { StatCard } from "../components/StatCard";
import { Modal } from "../components/Modal";
import { formatBytes, formatDate, uid } from "../lib/format";
import { isSupabaseConfigured } from "../lib/supabase";
import { getInternalDocumentUrl, uploadInternalDocuments } from "../lib/api";

export function InternalDocuments() {
  const { state, dispatch } = useStore();
  const { user, isAdmin } = useAuth();
  const folders = state.docFolders;
  const [folder, setFolder] = useState<InternalDocFolder>(
    folders[0]?.id ?? "general"
  );
  const [editFolders, setEditFolders] = useState(false);

  const docs = state.internalDocuments;
  // Fall back to the first folder if the selected one was removed.
  const activeFolder =
    folders.find((f) => f.id === folder) ?? folders[0];
  const activeId = activeFolder?.id ?? "general";
  const inFolder = useMemo(
    () => docs.filter((d) => d.folder === activeId),
    [docs, activeId]
  );

  const totalSize = docs.reduce((s, d) => s + d.size, 0);

  async function handleAdd(files: File[]) {
    const uploadedBy = user?.email ?? "unknown";
    let newDocs: InternalDocument[];
    if (isSupabaseConfigured) {
      newDocs = await uploadInternalDocuments(files, activeId, uploadedBy);
    } else {
      newDocs = files.map((f) => ({
        id: uid("idoc"),
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        folder: activeId,
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
        <StatCard label="Folders" value={String(folders.length)} tone="default" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Folder rail */}
        <div className="card h-fit p-2">
          <nav className="space-y-0.5">
            {folders.map((f) => {
              const count = docs.filter((d) => d.folder === f.id).length;
              const active = activeId === f.id;
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
                  <span className="flex items-center gap-2 truncate">
                    <FolderClosed size={16} className="shrink-0" /> {f.name}
                  </span>
                  <span className="text-xs text-gray-400">{count}</span>
                </button>
              );
            })}
          </nav>
          {isAdmin && (
            <button
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
              onClick={() => setEditFolders(true)}
            >
              <Settings size={15} /> Edit folders
            </button>
          )}
        </div>

        {/* Folder contents */}
        <div className="lg:col-span-3">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Upload to {activeFolder?.name ?? "folder"}
            </h2>
            <DocumentDropzone documents={[]} onAdd={handleAdd} />
          </div>

          <div className="card mt-6">
            <div className="border-b border-gray-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                {activeFolder?.name ?? "Folder"} documents ({inFolder.length})
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
                      {/* Move to another folder */}
                      <select
                        className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs"
                        value={d.folder}
                        title="Move to another folder"
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next !== d.folder) {
                            dispatch({
                              type: "MOVE_INTERNAL_DOC",
                              id: d.id,
                              folder: next,
                            });
                          }
                        }}
                      >
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
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
                        className="text-gray-400 hover:text-brand-600"
                        title="Rename / label"
                        onClick={() => {
                          const next = window.prompt(
                            "Label for this document:",
                            d.name
                          );
                          if (next && next.trim() && next.trim() !== d.name) {
                            dispatch({
                              type: "RENAME_INTERNAL_DOC",
                              id: d.id,
                              name: next.trim(),
                            });
                          }
                        }}
                      >
                        <Pencil size={16} />
                      </button>
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

      {editFolders && (
        <FolderManagerModal onClose={() => setEditFolders(false)} />
      )}
    </div>
  );
}

function FolderManagerModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [folders, setFolders] = useState<DocFolder[]>(state.docFolders);

  const countFor = (id: string) =>
    state.internalDocuments.filter((d) => d.folder === id).length;

  return (
    <Modal
      open
      title="Edit folders"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              dispatch({
                type: "SET_DOC_FOLDERS",
                folders: folders.filter((f) => f.name.trim()),
              });
              onClose();
            }}
          >
            Save folders
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-gray-500">
        Rename a folder by editing its name, add new ones, or remove empty
        folders.
      </p>
      <div className="space-y-2">
        {folders.map((f) => {
          const count = countFor(f.id);
          return (
            <div key={f.id} className="flex items-center gap-2">
              <FolderClosed size={16} className="shrink-0 text-gray-400" />
              <input
                className="input flex-1"
                value={f.name}
                placeholder="Folder name"
                onChange={(e) =>
                  setFolders((fs) =>
                    fs.map((x) =>
                      x.id === f.id ? { ...x, name: e.target.value } : x
                    )
                  )
                }
              />
              <span className="w-16 text-right text-xs text-gray-400">
                {count} doc{count === 1 ? "" : "s"}
              </span>
              <button
                className="text-gray-400 hover:text-red-500 disabled:opacity-30"
                disabled={count > 0}
                title={
                  count > 0
                    ? "Move or delete its documents first"
                    : "Delete folder"
                }
                onClick={() =>
                  setFolders((fs) => fs.filter((x) => x.id !== f.id))
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        className="btn-secondary mt-3"
        onClick={() =>
          setFolders((fs) => [...fs, { id: uid("fld"), name: "" }])
        }
      >
        <Plus size={15} /> Add folder
      </button>
    </Modal>
  );
}
