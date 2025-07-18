import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Folder, Trash2, Loader2, ChevronRight } from "lucide-react";
import { api, S3Folder } from "../lib/api";
import { cn } from "../lib/utils";

interface FolderListProps {
  folders: S3Folder[];
  onNavigate: (path: string) => void;
}

export function FolderList({ folders, onNavigate }: FolderListProps) {
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: api.deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
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
    </div>
  );
}