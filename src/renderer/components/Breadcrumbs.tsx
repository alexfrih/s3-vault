import { ChevronRight, Home } from "lucide-react";
import { api } from "../lib/api";

interface BreadcrumbsProps {
  onNavigate: (path: string) => void;
}

export function Breadcrumbs({ onNavigate }: BreadcrumbsProps) {
  const currentPath = api.getCurrentPath();
  const parts = currentPath.split('/').filter(Boolean);

  return (
    <div className="flex items-center space-x-1 text-sm mb-4">
      <button
        onClick={() => onNavigate('')}
        className="flex items-center hover:text-zinc-700 transition-colors"
      >
        <Home className="w-4 h-4 mr-1" />
        <span>Root</span>
      </button>
      
      {parts.map((part, index) => {
        const path = parts.slice(0, index + 1).join('/') + '/';
        return (
          <div key={path} className="flex items-center">
            <ChevronRight className="w-4 h-4 text-zinc-400 mx-1" />
            <button
              onClick={() => onNavigate(path)}
              className="hover:text-zinc-700 transition-colors"
            >
              {part}
            </button>
          </div>
        );
      })}
    </div>
  );
}