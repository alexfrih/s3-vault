import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, Trash2, FileIcon, RefreshCw, Loader2 } from "lucide-react";
import { api, S3File } from "../lib/api";
import { formatBytes, formatDate, cn } from "../lib/utils";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

interface FileListProps {
  files: S3File[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function FileList({ files, isLoading, onRefresh }: FileListProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const downloadMutation = useMutation({
    mutationFn: async (key: string) => {
      const data = await api.downloadFile(key);
      const filename = key.split("/").pop() || key;
      
      const path = await save({
        defaultPath: filename,
        filters: [{ name: "All Files", extensions: ["*"] }],
      });
      
      if (path) {
        await writeFile(path, data);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteFile,
    onSuccess: onRefresh,
  });

  const toggleSelect = (key: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedFiles(newSelected);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FileIcon className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No files found</p>
        <p className="text-sm mt-1">Upload files to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">
          {files.length} {files.length === 1 ? "file" : "files"}
        </h2>
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="divide-y divide-gray-200">
        {files.map((file) => (
          <div
            key={file.key}
            className={cn(
              "flex items-center p-4 hover:bg-gray-50 transition-colors",
              selectedFiles.has(file.key) && "bg-gray-50"
            )}
          >
            <input
              type="checkbox"
              checked={selectedFiles.has(file.key)}
              onChange={() => toggleSelect(file.key)}
              className="mr-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
            />
            
            <FileIcon className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.key}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatBytes(file.size)} • {formatDate(file.last_modified)}
              </p>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => downloadMutation.mutate(file.key)}
                disabled={downloadMutation.isPending}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Download"
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-gray-600" />
                )}
              </button>
              
              <button
                onClick={() => {
                  if (confirm(`Delete ${file.key}?`)) {
                    deleteMutation.mutate(file.key);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Delete"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}