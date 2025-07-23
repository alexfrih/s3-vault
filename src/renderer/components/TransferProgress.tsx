import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Download, Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useTransfers } from '../contexts/TransferContext';
import { formatBytes, cn } from '../lib/utils';

export function TransferProgress() {
  const { transfers, removeTransfer, clearCompleted } = useTransfers();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Show/hide based on transfers
  useEffect(() => {
    const hasActiveTransfers = transfers.some(t => 
      t.status === 'pending' || t.status === 'active'
    );
    setIsVisible(transfers.length > 0);
    
    // Auto-minimize when all transfers are complete
    if (!hasActiveTransfers && transfers.length > 0) {
      setTimeout(() => setIsMinimized(true), 2000);
    }
  }, [transfers]);

  if (!isVisible) return null;

  const activeTransfers = transfers.filter(t => t.status === 'active' || t.status === 'pending');
  const completedTransfers = transfers.filter(t => t.status === 'completed');

  const getIcon = (transfer: typeof transfers[0]) => {
    if (transfer.status === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (transfer.status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    if (transfer.status === 'active') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    return transfer.type === 'upload' ? 
      <Upload className="w-4 h-4 text-zinc-500" /> : 
      <Download className="w-4 h-4 text-zinc-500" />;
  };

  const getProgressColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'failed') return 'bg-red-500';
    return 'bg-blue-500';
  };

  const calculateSpeed = (transfer: typeof transfers[0]) => {
    if (transfer.status !== 'active' || !transfer.fileSize) return '';
    const elapsed = (Date.now() - transfer.startTime) / 1000; // seconds
    const bytesTransferred = (transfer.fileSize * transfer.progress) / 100;
    const speed = bytesTransferred / elapsed;
    return `${formatBytes(speed)}/s`;
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-lg border border-zinc-200 z-50">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900">
            Transfers ({activeTransfers.length} active)
          </h3>
          {completedTransfers.length > 0 && (
            <button
              onClick={clearCompleted}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              Clear completed
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-zinc-100 rounded"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-zinc-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transfer list */}
      {!isMinimized && (
        <div className="max-h-96 overflow-y-auto">
          {transfers.map(transfer => (
            <div key={transfer.id} className="p-4 border-b border-zinc-100 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {getIcon(transfer)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {transfer.fileName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {transfer.type === 'upload' ? 'Uploading' : 'Downloading'}
                      {transfer.fileSize && ` • ${formatBytes(transfer.fileSize)}`}
                      {transfer.status === 'active' && ` • ${calculateSpeed(transfer)}`}
                    </p>
                  </div>
                </div>
                {(transfer.status === 'completed' || transfer.status === 'failed') && (
                  <button
                    onClick={() => removeTransfer(transfer.id)}
                    className="p-1 hover:bg-zinc-100 rounded ml-2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {(transfer.status === 'active' || transfer.status === 'pending') && (
                <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      getProgressColor(transfer.status)
                    )}
                    style={{ width: `${transfer.progress}%` }}
                  />
                </div>
              )}

              {/* Error message */}
              {transfer.error && (
                <p className="text-xs text-red-500 mt-1">{transfer.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary when minimized */}
      {isMinimized && activeTransfers.length > 0 && (
        <div className="p-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-sm text-zinc-600">
            {activeTransfers.length} transfer{activeTransfers.length > 1 ? 's' : ''} in progress
          </span>
        </div>
      )}
    </div>
  );
}