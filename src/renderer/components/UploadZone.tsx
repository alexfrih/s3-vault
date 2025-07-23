import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, Loader2, FolderPlus } from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { CreateFolderModal } from "./CreateFolderModal";
import { useToast } from "../contexts/ToastContext";
import { useTransfers } from "../contexts/TransferContext";

interface UploadZoneProps {
  children: React.ReactNode;
  onUpload: () => void;
}

export function UploadZone({ children, onUpload }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const { showToast } = useToast();
  const { addTransfer } = useTransfers();

  const uploadMutation = useMutation({
    mutationFn: async ({ key, data, file }: { key: string; data: Uint8Array; file?: File }) => {
      // Use progress for files larger than 5MB
      const useProgress = file && file.size > 5 * 1024 * 1024;
      
      if (useProgress) {
        const transferId = addTransfer({
          type: 'upload',
          fileName: file.name,
          fileSize: file.size,
          progress: 0,
          status: 'pending'
        });
        
        try {
          await api.uploadFileWithProgress(key, data, transferId);
        } catch (error) {
          showToast("Upload failed", "error");
          throw error;
        }
      } else {
        await api.uploadFile(key, data);
      }
    },
    onSuccess: () => {
      onUpload();
      showToast("File uploaded successfully", "success");
    },
    onError: () => {
      showToast("Failed to upload file", "error");
    },
  });

  const handleFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        uploadMutation.mutate({ key: file.name, data, file });
      };
      reader.readAsArrayBuffer(file);
    }
  }, [uploadMutation, addTransfer]);

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
    try {
      // In Electron, the file dialog and upload are handled together
      // We'll let the API handle the file selection
      await api.uploadFile('', new Uint8Array());
      onUpload();
    } catch (error) {
      if (error instanceof Error && error.message !== 'No file selected') {
        console.error('Upload failed:', error);
      }
    }
  };
  
  const handleCreateFolder = async (folderName: string) => {
    try {
      await api.createFolder(folderName);
      onUpload(); // Refresh the list
      showToast("Folder created successfully", "success");
    } catch (error) {
      console.error('Failed to create folder:', error);
      showToast("Failed to create folder", "error");
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed transition-colors",
        isDragging ? "border-zinc-400 bg-zinc-50" : "border-zinc-200"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex flex-col">
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Files</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span>New Folder</span>
              </button>
              <button
                onClick={handleSelectFiles}
                disabled={uploadMutation.isPending}
                className="flex items-center space-x-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
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
        </div>

        <div className="p-6">
          {children}
        </div>

        {isDragging && (
          <div className="absolute inset-0 bg-zinc-900 bg-opacity-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <Upload className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-zinc-900">Drop files to upload</p>
            </div>
          </div>
        )}
      </div>
      
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={handleCreateFolder}
      />
    </div>
  );
}