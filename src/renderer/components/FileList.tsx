import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, Trash2, FileIcon, RefreshCw, Loader2, Edit2, DownloadCloud } from "lucide-react";
import { api, S3File } from "../lib/api";
import { formatBytes, formatDate, cn } from "../lib/utils";
import { useToast } from "../contexts/ToastContext";
import { useTransfers } from "../contexts/TransferContext";
import { RenameModal } from "./RenameModal";

interface FileListProps {
  files: S3File[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function FileList({ files, isLoading, onRefresh }: FileListProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<S3File | null>(null);
  const { showToast } = useToast();
  const { addTransfer } = useTransfers();
  const selectAllRef = useRef<HTMLInputElement>(null);

  const downloadMutation = useMutation({
    mutationFn: async ({ file }: { file: S3File }) => {
      const transferId = addTransfer({
        type: 'download',
        fileName: file.key.split('/').pop() || file.key,
        fileSize: file.size,
        progress: 0,
        status: 'pending'
      });
      
      try {
        const completed = await api.downloadFileWithProgress(file.key, transferId);
        if (!completed) {
          // User canceled
          showToast("Download canceled", "info");
        }
      } catch (error) {
        showToast("Download failed", "error");
        throw error;
      }
    },
  });
  
  const downloadMultipleMutation = useMutation({
    mutationFn: async (selectedFiles: S3File[]) => {
      // Create transfer entries for each file
      const transferIds = selectedFiles.map(file => 
        addTransfer({
          type: 'download',
          fileName: file.key.split('/').pop() || file.key,
          fileSize: file.size,
          progress: 0,
          status: 'pending'
        })
      );
      
      try {
        const completed = await api.downloadFiles(
          selectedFiles.map(f => f.key),
          transferIds
        );
        
        if (!completed) {
          showToast("Download canceled", "info");
        } else {
          showToast(`Downloaded ${selectedFiles.length} files`, "success");
        }
      } catch (error) {
        showToast("Download failed", "error");
        throw error;
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteFile,
    onSuccess: () => {
      onRefresh();
      showToast("File deleted successfully", "success");
    },
    onError: () => {
      showToast("Failed to delete file", "error");
    },
  });
  
  const renameMutation = useMutation({
    mutationFn: ({ oldKey, newName }: { oldKey: string; newName: string }) => 
      api.renameFile(oldKey, newName),
    onSuccess: () => {
      onRefresh();
      showToast("File renamed successfully", "success");
      setRenameModalOpen(false);
      setFileToRename(null);
    },
    onError: () => {
      showToast("Failed to rename file", "error");
    }
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

  // Handle indeterminate state for select all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = 
        selectedFiles.size > 0 && selectedFiles.size < files.length;
    }
  }, [selectedFiles.size, files.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Files</h2>
          <button
            onClick={() => {
              onRefresh();
              showToast("Files refreshed", "success");
            }}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-zinc-600" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
          <FileIcon className="w-12 h-12 mb-4 text-zinc-300" />
          <p className="text-lg font-medium">No files found</p>
          <p className="text-sm mt-1">Upload files to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200">
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={files.length > 0 && selectedFiles.size === files.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedFiles(new Set(files.map(f => f.key)));
              } else {
                setSelectedFiles(new Set());
              }
            }}
            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            title="Select all files"
          />
          <h2 className="font-semibold text-zinc-900">
            {files.length} {files.length === 1 ? "file" : "files"}
            {selectedFiles.size > 0 && (
              <span className="ml-2 text-sm text-zinc-500">
                ({selectedFiles.size} selected)
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {selectedFiles.size > 0 && (
            <button
              onClick={() => {
                const selectedFileObjects = files.filter(f => selectedFiles.has(f.key));
                downloadMultipleMutation.mutate(selectedFileObjects);
                setSelectedFiles(new Set());
              }}
              disabled={downloadMultipleMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Download selected files"
            >
              {downloadMultipleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <DownloadCloud className="w-4 h-4" />
              )}
              <span className="text-sm">Download Selected</span>
            </button>
          )}
          <button
            onClick={() => {
              onRefresh();
              showToast("Files refreshed", "success");
            }}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-zinc-600" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {files.map((file) => (
          <div
            key={file.key}
            className={cn(
              "flex items-center p-4 hover:bg-zinc-50 transition-colors",
              selectedFiles.has(file.key) && "bg-zinc-50"
            )}
          >
            <input
              type="checkbox"
              checked={selectedFiles.has(file.key)}
              onChange={() => toggleSelect(file.key)}
              className="mr-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
            
            <FileIcon className="w-5 h-5 text-zinc-500 mr-3 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {file.key.split('/').pop() || file.key}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {formatBytes(file.size)} • {formatDate(file.last_modified)}
              </p>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => {
                  downloadMutation.mutate({ file });
                }}
                disabled={downloadMutation.isPending}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50"
                title="Download"
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-zinc-600" />
                )}
              </button>
              
              <button
                onClick={() => {
                  setFileToRename(file);
                  setRenameModalOpen(true);
                }}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Rename"
              >
                <Edit2 className="w-4 h-4 text-zinc-600" />
              </button>
              
              <button
                onClick={() => {
                  if (confirm(`Delete ${file.key}?`)) {
                    deleteMutation.mutate(file.key);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50"
                title="Delete"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-zinc-600" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {fileToRename && (
        <RenameModal
          isOpen={renameModalOpen}
          onClose={() => {
            setRenameModalOpen(false);
            setFileToRename(null);
          }}
          onRename={(newName) => {
            renameMutation.mutate({ oldKey: fileToRename.key, newName });
          }}
          currentName={fileToRename.key.split('/').pop() || fileToRename.key}
          title="Rename File"
        />
      )}
    </div>
  );
}