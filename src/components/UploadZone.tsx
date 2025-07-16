import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

interface UploadZoneProps {
  children: React.ReactNode;
  onUpload: () => void;
}

export function UploadZone({ children, onUpload }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({ key, data }: { key: string; data: Uint8Array }) => {
      await api.uploadFile(key, data);
    },
    onSuccess: onUpload,
  });

  const handleFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        uploadMutation.mutate({ key: file.name, data });
      };
      reader.readAsArrayBuffer(file);
    }
  }, [uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSelectFiles = async () => {
    const selected = await open({
      multiple: true,
    });

    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      
      for (const path of paths) {
        const data = await readFile(path);
        const filename = path.split("/").pop() || path;
        uploadMutation.mutate({ key: filename, data: new Uint8Array(data) });
      }
    }
  };

  return (
    <div
      className={cn(
        "h-full rounded-lg border-2 border-dashed transition-colors",
        isDragging ? "border-gray-400 bg-gray-50" : "border-gray-200"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Files</h2>
            <button
              onClick={handleSelectFiles}
              disabled={uploadMutation.isPending}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Files</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>

        {isDragging && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-900">Drop files to upload</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}