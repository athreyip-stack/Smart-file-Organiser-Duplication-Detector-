import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { scanService } from '../services/scanService';

const ScanContext = createContext(null);

export function ScanProvider({ children }) {
  const [currentScan, setCurrentScan] = useState(null);
  const [scansList, setScansList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [error, setError] = useState(null);

  const refreshScans = useCallback(async (targetScanId = null) => {
    try {
      setLoading(true);
      const history = await scanService.getScanHistory(30);
      setScansList(history);

      if (history.length > 0) {
        if (targetScanId) {
          const match = history.find((s) => s.id === targetScanId);
          if (match) {
            setCurrentScan(match);
            return;
          }
        }
        
        // If targetScanId not provided or not found, update to latest or keep existing if still in history
        setCurrentScan((prev) => {
          if (!prev) return history[0];
          const updated = history.find((s) => s.id === prev.id);
          return updated || history[0];
        });
      } else {
        setCurrentScan(null);
      }
    } catch (err) {
      console.error('Failed to load scan history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshScans();
  }, []);

  const selectScan = (scanId) => {
    const scan = scansList.find((s) => s.id === scanId);
    if (scan) {
      setCurrentScan(scan);
    }
  };

  const startScan = async (folderPath, options = {}) => {
    setIsScanning(true);
    setError(null);
    setScanProgress({
      status: 'SCANNING_FILES',
      current_folder: folderPath,
      files_scanned: 0,
      total_bytes_scanned: 0,
      duplicates_found: 0,
      is_complete: false,
    });

    try {
      const result = await scanService.startScan(
        folderPath,
        options.recursive ?? true,
        options.max_depth ?? -1,
        options.excluded_dirs
      );
      setScanProgress(result);

      if (result.scan_id) {
        const fullScan = await scanService.getScanById(result.scan_id);
        setCurrentScan(fullScan);
        await refreshScans(result.scan_id);
      } else {
        await refreshScans();
      }

      setIsScanning(false);
      return result;
    } catch (err) {
      setError(err.message || 'Scan failed');
      setIsScanning(false);
      throw err;
    }
  };

  return (
    <ScanContext.Provider
      value={{
        currentScan,
        scansList,
        loading,
        isScanning,
        scanProgress,
        error,
        selectScan,
        startScan,
        refreshScans,
        setCurrentScan,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScan must be used within a ScanProvider');
  }
  return context;
}
