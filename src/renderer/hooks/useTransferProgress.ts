import { useEffect } from 'react';
import { useTransfers } from '../contexts/TransferContext';

export function useTransferProgress() {
  const { updateTransfer } = useTransfers();

  useEffect(() => {
    const handleProgress = (_event: any, data: { id: string; progress: number; fileSize?: number }) => {
      updateTransfer(data.id, {
        progress: data.progress,
        fileSize: data.fileSize,
        status: data.progress === 100 ? 'completed' : 'active'
      });
    };

    window.electronAPI.onTransferProgress(handleProgress);

    // Cleanup
    return () => {
      // Note: Electron doesn't provide removeListener for contextBridge
      // The listener will be cleaned up when the component unmounts
    };
  }, [updateTransfer]);
}