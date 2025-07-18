import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Folder, Trash2, Loader2, ChevronRight, Download, Edit2 } from "lucide-react";
import { api, S3Folder } from "../lib/api";
import { cn } from "../lib/utils";
import { useToast } from "../contexts/ToastContext";
import { RenameModal } from "./RenameModal";

interface FolderListProps {
  folders: S3Folder[];
  onNavigate: (path: string) => void;
}

export function FolderList({ folders, onNavigate }: FolderListProps) {
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [downloadingFolders, setDownloadingFolders] = useState<Set<string>>(new Set());
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<S3Folder | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: api.deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      showToast("Folder deleted successfully", "success");
    },
    onError: () => {
      showToast("Failed to delete folder", "error");
    }
  });
  
  const handleDownloadFolder = async (prefix: string, folderName: string) => {
    setDownloadingFolders(prev => new Set(prev).add(prefix));
    try {
      await api.downloadFolder(prefix, folderName);
      showToast(`Downloaded ${folderName}.zip`, "success");
    } catch (error) {
      showToast("Failed to download folder", "error");
    } finally {
      setDownloadingFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(prefix);
        return newSet;
      });
    }
  };
  
  const renameMutation = useMutation({
    mutationFn: ({ oldPrefix, newName }: { oldPrefix: string; newName: string }) => 
      api.renameFolder(oldPrefix, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      showToast("Folder renamed successfully", "success");
      setRenameModalOpen(false);
      setFolderToRename(null);
    },
    onError: () => {
      showToast("Failed to rename folder", "error");
    }
  });

  const toggleSelect = (prefix: string) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(prefix)) {
      newSelected.delete(prefix);
    } else {
      newSelected.add(prefix);
    }
    setSelectedFolders(newSelected);
  };

  const getFolderName = (prefix: string) => {
    const currentPath = api.getCurrentPath();
    const relativePath = prefix.slice(currentPath.length);
    return relativePath.endsWith('/') ? relativePath.slice(0, -1) : relativePath;
  };

  if (folders.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
        {folders.map((folder) => (
          <div
            key={folder.prefix}
            className={cn(
              "flex items-center p-4 hover:bg-gray-50 transition-colors",
              selectedFolders.has(folder.prefix) && "bg-gray-50"
            )}
          >
            <input
              type="checkbox"
              checked={selectedFolders.has(folder.prefix)}
              onChange={() => toggleSelect(folder.prefix)}
              className="mr-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
            />
            
            <Folder className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
            
            <button
              onClick={() => onNavigate(folder.prefix)}
              className="flex-1 min-w-0 flex items-center hover:text-blue-600 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900 truncate">
                {getFolderName(folder.prefix)}
              </p>
              <ChevronRight className="w-4 h-4 ml-2 text-gray-400" />
            </button>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => handleDownloadFolder(folder.prefix, getFolderName(folder.prefix))}
                disabled={downloadingFolders.has(folder.prefix)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Download folder as ZIP"
              >
                {downloadingFolders.has(folder.prefix) ? (
                  <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => {
                  setFolderToRename(folder);
                  setRenameModalOpen(true);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Rename folder"
              >
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete folder ${getFolderName(folder.prefix)} and all its contents?`)) {
                    deleteMutation.mutate(folder.prefix);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Delete folder"
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
      
      {folderToRename && (
        <RenameModal
          isOpen={renameModalOpen}
          onClose={() => {
            setRenameModalOpen(false);
            setFolderToRename(null);
          }}
          onRename={(newName) => {
            renameMutation.mutate({ oldPrefix: folderToRename.prefix, newName });
          }}
          currentName={getFolderName(folderToRename.prefix)}
          title="Rename Folder"
        />
      )}
    </div>
  );
}