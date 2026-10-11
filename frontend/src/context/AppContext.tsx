import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatasetMetadata } from '../types';
import { apiService } from '../services/api';

interface AppContextType {
  datasets: DatasetMetadata[];
  selectedDataset: DatasetMetadata | null;
  selectedTarget: string;
  setSelectedDataset: (d: DatasetMetadata | null) => void;
  setSelectedTarget: (col: string) => void;
  refreshDatasets: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DatasetMetadata | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const refreshDatasets = async () => {
    try {
      const data = await apiService.getDatasets();
      setDatasets(data);
      if (data.length > 0 && !selectedDataset) {
        setSelectedDataset(data[0]);
        setSelectedTarget(data[0].target_col);
      }
    } catch (err) {
      console.error('Failed to load datasets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDatasets();
  }, []);

  useEffect(() => {
    if (selectedDataset && (!selectedTarget || !selectedDataset.numeric_cols.includes(selectedTarget))) {
      setSelectedTarget(selectedDataset.target_col || selectedDataset.numeric_cols[0] || '');
    }
  }, [selectedDataset]);

  return (
    <AppContext.Provider value={{
      datasets,
      selectedDataset,
      selectedTarget,
      setSelectedDataset,
      setSelectedTarget,
      refreshDatasets,
      loading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
