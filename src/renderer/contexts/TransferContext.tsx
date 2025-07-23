import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Transfer {
  id: string;
  type: 'upload' | 'download';
  fileName: string;
  fileSize?: number;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  error?: string;
  startTime: number;
}

interface TransferContextType {
  transfers: Transfer[];
  addTransfer: (transfer: Omit<Transfer, 'id' | 'startTime'>) => string;
  updateTransfer: (id: string, updates: Partial<Transfer>) => void;
  removeTransfer: (id: string) => void;
  clearCompleted: () => void;
}

const TransferContext = createContext<TransferContextType | undefined>(undefined);

export function TransferProvider({ children }: { children: ReactNode }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const addTransfer = useCallback((transfer: Omit<Transfer, 'id' | 'startTime'>) => {
    const id = `${transfer.type}-${Date.now()}-${Math.random()}`;
    const newTransfer: Transfer = {
      ...transfer,
      id,
      startTime: Date.now(),
    };
    
    setTransfers(prev => [...prev, newTransfer]);
    return id;
  }, []);

  const updateTransfer = useCallback((id: string, updates: Partial<Transfer>) => {
    setTransfers(prev => 
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
  }, []);

  const removeTransfer = useCallback((id: string) => {
    setTransfers(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTransfers(prev => prev.filter(t => t.status !== 'completed'));
  }, []);

  return (
    <TransferContext.Provider value={{
      transfers,
      addTransfer,
      updateTransfer,
      removeTransfer,
      clearCompleted,
    }}>
      {children}
    </TransferContext.Provider>
  );
}

export function useTransfers() {
  const context = useContext(TransferContext);
  if (!context) {
    throw new Error('useTransfers must be used within a TransferProvider');
  }
  return context;
}