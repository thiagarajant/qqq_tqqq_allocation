import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, Database, Upload, AlertTriangle, CheckCircle, XCircle, Loader2, FolderOpen, Play, Pause, RotateCcw } from 'lucide-react'

interface AdminAction {
  id: string
  type: 'delete' | 'populate' | 'refresh'
  status: 'pending' | 'running' | 'success' | 'error'
  message: string
  timestamp: Date
  details?: any
}

interface StockData {
  symbol: string;
  records: {
    date: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number;
    volume: number | null;
  }[];
}

// Upload metadata for resumability
interface UploadMetadata {
  id: string;
  folderName: string;
  totalFiles: number;
  totalRecords: number;
  processedFiles: number;
  processedRecords: number;
  failedFiles: string[];
  completedFiles: string[];
  startTime: Date;
  lastUpdateTime: Date;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'error';
  currentFileIndex: number;
}

// File processing result
interface FileProcessResult {
  symbol: string;
  records: number;
  success: boolean;
  error?: string;
}

// Streaming upload state
interface StreamingUploadState {
  metadata: UploadMetadata | null;
  isUploading: boolean;
  isPaused: boolean;
  currentFile: string | null;
  progress: number;
  speed: number; // records per second
}

// Helper function to clean symbol name (remove .US suffix)
const cleanSymbolName = (symbol: string): string => {
  return symbol.replace(/\.US$/i, '');
};

// Extract stock data from CSV files and convert to JSON with multiprocessing
const extractStockDataFromFiles = async (files: File[], onProgress?: (progress: number) => void): Promise<StockData[]> => {
  const results: StockData[] = [];
  const errors: string[] = [];
  
  console.log(`Extracting data from ${files.length} files with multiprocessing...`);
  
  // Process files in parallel batches for better performance
  const batchSize = 20; // Process 20 files simultaneously
  const batches = [];
  
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  
  console.log(`Processing ${files.length} files in ${batches.length} batches of ${batchSize} files each`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`);
    
    // Process batch in parallel using Promise.all
    const batchPromises = batch.map(async (file) => {
      try {
        const text = await file.text();
        const lines = text.trim().split('\n');
        
        if (lines.length < 2) {
          return { error: `${file.name}: File too short (need at least header + 1 data row)` };
        }
        
        const headers = lines[0].split(',');
        
        // Find column indices
        const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
        const openIndex = headers.findIndex(h => h.toLowerCase().includes('open'));
        const highIndex = headers.findIndex(h => h.toLowerCase().includes('high'));
        const lowIndex = headers.findIndex(h => h.toLowerCase().includes('low'));
        const closeIndex = headers.findIndex(h => h.toLowerCase().includes('close'));
        const volumeIndex = headers.findIndex(h => h.toLowerCase().includes('vol'));
        
        if (dateIndex === -1 || closeIndex === -1) {
          return { error: `${file.name}: Missing required columns (date, close)` };
        }
        
        // Extract symbol from filename
        let symbol = file.name.replace(/\.[^/.]+$/, ''); // Remove file extension
        symbol = cleanSymbolName(symbol).toUpperCase();
        
        // Parse data rows
        const records = [];
        let validRows = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || line.includes('N/A')) continue;
          
          const values = line.split(',');
          if (values.length >= Math.max(dateIndex, openIndex, highIndex, lowIndex, closeIndex, volumeIndex) + 1) {
            const close = parseFloat(values[closeIndex]);
            if (!isNaN(close) && close > 0) {
              records.push({
                date: values[dateIndex],
                open: parseFloat(values[openIndex]) || null,
                high: parseFloat(values[highIndex]) || null,
                low: parseFloat(values[lowIndex]) || null,
                close: close,
                volume: parseInt(values[volumeIndex]) || null
              });
              validRows++;
            }
          }
        }
        
        if (records.length > 0) {
          console.log(`✓ Extracted ${validRows} records for ${symbol}`);
          return { success: { symbol, records } };
        } else {
          return { error: `${file.name}: No valid data rows found` };
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        return { error: `${file.name}: ${errorMsg}` };
      }
    });
    
    // Wait for all files in the batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Process batch results
    for (const result of batchResults) {
      if (result.error) {
        errors.push(result.error);
      } else if (result.success) {
        results.push(result.success);
      }
    }
    
    // Update progress
    const processedFiles = (batchIndex + 1) * batchSize;
    const progress = Math.min((processedFiles / files.length) * 100, 100);
    console.log(`Batch ${batchIndex + 1} completed. Progress: ${progress.toFixed(1)}%`);
    
    // Call progress callback if provided
    if (onProgress) {
      onProgress(progress);
    }
  }
  
  if (errors.length > 0) {
    console.warn('Extraction errors:', errors);
  }
  
  console.log(`Successfully extracted data from ${results.length} files with ${results.reduce((sum, r) => sum + r.records.length, 0)} total records`);
  return results;
};



export default function Admin() {
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [actions, setActions] = useState<AdminAction[]>([])
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showConfirmPopulate, setShowConfirmPopulate] = useState(false)
  const [databaseStats, setDatabaseStats] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Streaming upload state
  const [streamingUpload, setStreamingUpload] = useState<StreamingUploadState>({
    metadata: null,
    isUploading: false,
    isPaused: false,
    currentFile: null,
    progress: 0,
    speed: 0
  })
  
  // Upload metadata storage key
  const UPLOAD_METADATA_KEY = 'stock_market_upload_metadata'

  // Load database stats on component mount
  useEffect(() => {
    fetchDatabaseStats()
  }, [])
  


  // Add action to history
  const addAction = useCallback((type: AdminAction['type'], status: AdminAction['status'], message: string, details?: any) => {
    const action: AdminAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      status,
      message,
      timestamp: new Date(),
      details
    }
    setActions(prev => [action, ...prev.slice(0, 9)]) // Keep last 10 actions
  }, [])

  // Handle folder selection
  const handleFolderSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFolderChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      console.log('No files selected')
      return
    }

    // Prevent multiple simultaneous uploads
    if (isLoading) {
      addAction('populate', 'error', 'Please wait for the current upload to complete')
      return
    }

    console.log(`File input triggered with ${files.length} files`)
    console.log('File input attributes:', event.target.getAttribute('webkitdirectory'), event.target.getAttribute('directory'))

    // IMPORTANT: Process files BEFORE clearing the input
    const fileArray = Array.from(files || [])
    console.log('Files object:', files)
    console.log('Files length:', files?.length)
    console.log('Files type:', typeof files)
    console.log(`Processing ${fileArray.length} files from folder selection`)
    console.log('Sample files:', fileArray.slice(0, 3).map(f => ({ name: f.name, path: f.webkitRelativePath })))

    // Use a more efficient file filtering approach
    const csvFiles: File[] = []
    let folderName = 'Unknown Folder'
    
    // Get folder name from the first file
    if (fileArray.length > 0) {
      folderName = fileArray[0].webkitRelativePath?.split('/')[0] || 'Unknown Folder'
      console.log(`Folder name detected: ${folderName}`)
    }
    
    // Filter files efficiently - look for CSV files in any subdirectory
    console.log(`Starting to filter ${fileArray.length} files for CSV/TXT...`)
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      const fileName = file.name.toLowerCase()
      const filePath = file.webkitRelativePath?.toLowerCase() || ''
      
      // Only log first few files to avoid spam
      if (i < 5) {
        console.log(`File ${i + 1}: ${file.name} (path: ${file.webkitRelativePath})`)
      }
      
      // More comprehensive file detection
      const isCSV = fileName.endsWith('.csv') || filePath.includes('.csv')
      const isTXT = fileName.endsWith('.txt') || filePath.includes('.txt')
      
      if (isCSV || isTXT) {
        csvFiles.push(file)
        console.log(`✓ Added CSV/TXT file: ${file.name}`)
      }
    }
    
    console.log(`Found ${csvFiles.length} CSV/TXT files out of ${fileArray.length} total files`)
    
    if (csvFiles.length === 0) {
      console.log('No CSV files found, checking if this might be a folder selection issue...')
      
      // Check if we have any files at all
      if (fileArray.length === 0) {
        addAction('populate', 'error', 'No files found in the selected folder. Please ensure the folder contains files.')
        return
      }
      
      // Show what file types we did find
      const fileTypes = [...new Set(fileArray.map(f => {
        const name = f.name.toLowerCase()
        if (name.includes('.')) {
          return name.substring(name.lastIndexOf('.'))
        }
        return 'no-extension'
      }))]
      console.log(`Found file types: ${fileTypes.join(', ')}`)
      
      addAction('populate', 'error', `No CSV or TXT files found in the selected folder. Found ${fileArray.length} files with types: ${fileTypes.join(', ')}`)
      return
    }
    
    // Extract data and upload as JSON for better efficiency with multiprocessing
    console.log(`Extracting data from ${csvFiles.length} CSV/TXT files with multiprocessing...`)
    addAction('populate', 'pending', `Extracting data from ${csvFiles.length} files with multiprocessing...`)
    
    try {
      setIsLoading(true)
      setUploadProgress(5)
      setProcessingStatus('Extracting data from files with multiprocessing...')
      
      // Extract stock data from files with multiprocessing
      const stockData = await extractStockDataFromFiles(csvFiles, (progress) => {
        // Update progress from 5% to 25% during extraction
        const extractionProgress = 5 + (progress * 0.2); // 5% to 25%
        setUploadProgress(extractionProgress);
        setProcessingStatus(`Extracting data: ${progress.toFixed(1)}% complete`);
      })
      
      if (stockData.length === 0) {
        addAction('populate', 'error', 'No valid stock data found in the uploaded files')
        setIsLoading(false)
        return
      }
      
      setUploadProgress(30)
      setProcessingStatus('Uploading structured data...')
      addAction('populate', 'running', `Uploading ${stockData.length} symbols with ${stockData.reduce((sum, s) => sum + s.records.length, 0)} records...`)
      
      // Use streaming upload for better performance and resumability
      await startStreamingUpload(csvFiles, folderName)
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addAction('populate', 'error', `Failed to process files: ${errorMsg}`)
      setIsLoading(false)
    }
    
    // Clear the file input AFTER processing
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [isLoading])

  // Compress files in batches
  const compressFilesBatch = async (files: File[], batchSize: number = 500): Promise<File[]> => {
    try {
      const JSZip = (await import('jszip')).default
      const compressedFiles: File[] = []
      const totalBatches = Math.ceil(files.length / batchSize)
      
      console.log(`Compressing ${files.length} files in ${totalBatches} batches of ${batchSize} files each...`)
      
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        console.log(`Starting batch ${batchNumber}/${totalBatches} (${batch.length} files)...`)
        
        const zip = new JSZip()
        
        // Add files to zip with proper paths
        let filesAdded = 0
        for (const file of batch) {
          const fileName = file.webkitRelativePath || file.name
          zip.file(fileName, file)
          filesAdded++
          
          // Log progress every 100 files
          if (filesAdded % 100 === 0) {
            console.log(`Batch ${batchNumber}: Added ${filesAdded}/${batch.length} files to zip...`)
          }
        }
        
        console.log(`Batch ${batchNumber}: Generating compressed file...`)
        
        // Generate compressed file with maximum compression
        const compressedBlob = await zip.generateAsync({ 
          type: 'blob', 
          compression: 'DEFLATE',
          compressionOptions: { level: 9 }
        })
        
        const batchFile = new File([compressedBlob], `batch_${batchNumber}.zip`, { type: 'application/zip' })
        compressedFiles.push(batchFile)
        
        const originalSize = batch.reduce((sum, f) => sum + f.size, 0)
        const compressionRatio = ((originalSize - compressedBlob.size) / originalSize * 100).toFixed(1)
        
        console.log(`Batch ${batchNumber} complete. Original: ${(originalSize / 1024 / 1024).toFixed(2)}MB, Compressed: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reduction)`)
      }
      
      console.log(`All batches compressed. Total compressed files: ${compressedFiles.length}`)
      return compressedFiles
    } catch (error) {
      console.error('Batch compression error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown compression error'
      throw new Error(`Failed to compress files in batches: ${errorMessage}`)
    }
  }

  // Compress a single batch of files
  const compressSingleBatch = async (files: File[], batchNumber: number): Promise<File> => {
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      
      console.log(`Compressing batch ${batchNumber} (${files.length} files)...`)
      
      // Add files to zip with proper paths
      let filesAdded = 0
      for (const file of files) {
        const fileName = file.webkitRelativePath || file.name
        zip.file(fileName, file)
        filesAdded++
        
        // Log progress every 100 files
        if (filesAdded % 100 === 0) {
          console.log(`Batch ${batchNumber}: Added ${filesAdded}/${files.length} files to zip...`)
        }
      }
      
      console.log(`Batch ${batchNumber}: Generating compressed file...`)
      
      // Generate compressed file with maximum compression
      const compressedBlob = await zip.generateAsync({ 
        type: 'blob', 
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      })
      
      const batchFile = new File([compressedBlob], `batch_${batchNumber}.zip`, { type: 'application/zip' })
      
      const originalSize = files.reduce((sum, f) => sum + f.size, 0)
      const compressionRatio = ((originalSize - compressedBlob.size) / originalSize * 100).toFixed(1)
      
      console.log(`Batch ${batchNumber} complete. Original: ${(originalSize / 1024 / 1024).toFixed(2)}MB, Compressed: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio}% reduction)`)
      
      return batchFile
    } catch (error) {
      console.error(`Batch ${batchNumber} compression error:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown compression error'
      throw new Error(`Failed to compress batch ${batchNumber}: ${errorMessage}`)
    }
  }

  // Legacy single compression function (kept for compatibility)
  const compressFiles = async (files: File[]): Promise<File> => {
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      
      console.log(`Compressing ${files.length} files...`)
      
      // Add files to zip with proper paths
      for (const file of files) {
        const fileName = file.webkitRelativePath || file.name
        console.log(`Adding to zip: ${fileName}`)
        zip.file(fileName, file)
      }
      
      // Generate compressed file with maximum compression
      const compressedBlob = await zip.generateAsync({ 
        type: 'blob', 
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      })
      
      console.log(`Compression complete. Original size: ${files.reduce((sum, f) => sum + f.size, 0)} bytes, Compressed: ${compressedBlob.size} bytes`)
      
      return new File([compressedBlob], 'data_files.zip', { type: 'application/zip' })
    } catch (error) {
      console.error('Compression error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown compression error'
      throw new Error(`Failed to compress files: ${errorMessage}`)
    }
  }

  // Handle file upload and populate with batch processing
  const handleUploadFiles = useCallback(async (files: File[], folderName?: string) => {
    if (files.length === 0) {
      addAction('populate', 'error', 'No files selected')
      return
    }

    setIsLoading(true)
    setUploadProgress(0)
    setProcessingStatus('Starting batch upload...')
    const folderInfo = folderName ? `from folder "${folderName}"` : ''
    addAction('populate', 'running', `Compressing and uploading ${files.length} files in batches ${folderInfo}...`)

    try {
      // Determine if we should use batch processing (for large file sets)
      const useBatchProcessing = files.length > 1000
      const batchSize = 500
      
      if (useBatchProcessing) {
        addAction('populate', 'running', `Large file set detected (${files.length} files). Using batch processing with ${batchSize} files per batch...`)
        
        // Compress and upload files in batches simultaneously
        setUploadProgress(5)
        setProcessingStatus('Compressing and uploading files in batches...')
        addAction('populate', 'running', 'Compressing and uploading files in batches...')
        
        console.log(`Starting batch compression and upload for ${files.length} files in batches of ${batchSize}...`)
        addAction('populate', 'running', `Starting compression and upload: ${files.length} files in ${Math.ceil(files.length / batchSize)} batches...`)
        
        let totalSymbolsAdded = 0
        let totalRecordsAdded = 0
        let processedBatches = 0
        const totalBatches = Math.ceil(files.length / batchSize)
        
        // Process each batch: compress then immediately upload
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize)
          const batchNumber = Math.floor(i / batchSize) + 1
          
          // Update progress for compression phase
          setUploadProgress(5 + (batchNumber / totalBatches) * 15) // 5% to 20%
          setProcessingStatus(`Compressing batch ${batchNumber}/${totalBatches}...`)
          addAction('populate', 'running', `Compressing batch ${batchNumber}/${totalBatches} (${batch.length} files)...`)
          
          // Compress this batch
          const compressedBatch = await compressSingleBatch(batch, batchNumber)
          
          // Immediately upload this batch
          setUploadProgress(20 + (batchNumber / totalBatches) * 30) // 20% to 50%
          setProcessingStatus(`Uploading batch ${batchNumber}/${totalBatches}...`)
          addAction('populate', 'running', `Uploading batch ${batchNumber}/${totalBatches} (${compressedBatch.size} bytes)...`)
          
          const formData = new FormData()
          formData.append('compressedFiles', compressedBatch)
          formData.append('convertToUppercase', 'true')
          formData.append('preventDuplicates', 'false')
          formData.append('batchNumber', batchNumber.toString())
          formData.append('totalBatches', totalBatches.toString())
          
          if (folderName) {
            formData.append('folderName', folderName)
          }
          
          const response = await fetch('/api/admin/upload-and-populate', {
            method: 'POST',
            body: formData
          })
          
          let result
          try {
            result = await response.json()
          } catch (error) {
            addAction('populate', 'error', `Batch ${batchNumber}/${totalBatches} failed: Invalid response from server`)
            continue
          }
          
          if (response.ok) {
            totalSymbolsAdded += result.symbolsAdded || 0
            totalRecordsAdded += result.recordsAdded || 0
            processedBatches++
            
            addAction('populate', 'running', `Batch ${batchNumber}/${totalBatches} completed: ${result.symbolsAdded} symbols, ${result.recordsAdded} records`)
          } else {
            addAction('populate', 'error', `Batch ${batchNumber}/${totalBatches} failed: ${result.message || 'Unknown error'}`)
          }
        }
        
        setUploadProgress(50)
        setProcessingStatus('Processing completed')
        addAction('populate', 'success', `All batches completed! Total: ${totalSymbolsAdded} symbols added, ${totalRecordsAdded} records added`)
        await fetchDatabaseStats()
        
      } else {
        // Use single compression for smaller file sets
        setUploadProgress(10)
        setProcessingStatus('Compressing files...')
        addAction('populate', 'running', 'Compressing files for upload...')
        const compressedFile = await compressFiles(files)
        setUploadProgress(30)

        const formData = new FormData()
        formData.append('compressedFiles', compressedFile)
        formData.append('convertToUppercase', 'true')
        formData.append('preventDuplicates', 'false')
        
        if (folderName) {
          formData.append('folderName', folderName)
        }

        setUploadProgress(25)
        setProcessingStatus('Uploading to server...')
        addAction('populate', 'running', `Uploading ${files.length} files to server...`)
        
        const response = await fetch('/api/admin/upload-and-populate', {
          method: 'POST',
          body: formData
        })

        setUploadProgress(50)
        setProcessingStatus('Processing files and populating database...')
        addAction('populate', 'running', 'Processing files and populating database...')
        
        const estimatedTime = Math.ceil(files.length / 50) * 2
        addAction('populate', 'running', `Processing ${files.length} files in batches (estimated ${estimatedTime}s)...`)
        
        let result
        try {
          result = await response.json()
        } catch (error) {
          setProcessingStatus('Error occurred')
          addAction('populate', 'error', 'Failed to populate database: Invalid response from server')
          return
        }

        if (response.ok) {
          setUploadProgress(100)
          setProcessingStatus('Complete!')
          addAction('populate', 'success', `Database populated successfully: ${result.symbolsAdded} symbols added, ${result.recordsAdded} records added`, result)
          await fetchDatabaseStats()
        } else {
          setProcessingStatus('Error occurred')
          addAction('populate', 'error', `Failed to populate database: ${result.message || 'Unknown error'}`, result)
        }
      }
      
    } catch (error) {
      addAction('populate', 'error', `Error populating database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0)
        setProcessingStatus('')
      }, 2000)
    }
  }, [])



  // Delete database
  const handleDeleteDatabase = async () => {
    setIsLoading(true)
    addAction('delete', 'running', 'Deleting database...')

    try {
      const response = await fetch('/api/admin/delete-database', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (response.ok) {
        addAction('delete', 'success', 'Database deleted successfully', result)
        setDatabaseStats(null)
      } else {
        addAction('delete', 'error', `Failed to delete database: ${result.message}`, result)
      }
    } catch (error) {
      addAction('delete', 'error', `Error deleting database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
      setShowConfirmDelete(false)
    }
  }

  // Populate database with new data
  const handlePopulateDatabase = async () => {
    if (!selectedFolder || selectedFolder.trim() === '') {
      addAction('populate', 'error', 'Please enter a valid folder path')
      return
    }
    
    console.log('Attempting to populate database with folder:', selectedFolder)

    setIsLoading(true)
    addAction('populate', 'running', `Populating database from folder: ${selectedFolder}`)

    try {
      const requestBody = {
        folderPath: selectedFolder,
        convertToUppercase: true,
        preventDuplicates: false
      }
      
      console.log('Sending request with body:', requestBody)
      
      const response = await fetch('/api/admin/populate-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (response.ok) {
        addAction('populate', 'success', `Database populated successfully: ${result.symbolsAdded} symbols added`, result)
        await fetchDatabaseStats()
      } else {
        console.log('API Error Response:', result)
        addAction('populate', 'error', `Failed to populate database: ${result.message}`, result)
      }
    } catch (error) {
      addAction('populate', 'error', `Error populating database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
      setShowConfirmPopulate(false)
    }
  }

  // Fetch database statistics
  const fetchDatabaseStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/database-stats')
      if (response.ok) {
        const stats = await response.json()
        setDatabaseStats(stats)
      }
    } catch (error) {
      console.error('Error fetching database stats:', error)
    }
  }, [])

  // Upload structured stock data as JSON
  const uploadStructuredData = useCallback(async (stockData: StockData[], folderName: string): Promise<void> => {
    try {
      setUploadProgress(50)
      setProcessingStatus('Sending data to server...')
      
      const response = await fetch('/api/admin/upload-structured-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: stockData,
          convertToUppercase: true,
          preventDuplicates: false,
          folderName: folderName
        })
      });

      setUploadProgress(80)
      setProcessingStatus('Processing data...')

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      setUploadProgress(100)
      setProcessingStatus('Complete!')
      
      addAction('populate', 'success', 
        `Database populated successfully: ${result.symbolsAdded} symbols, ${result.recordsAdded} records added`, 
        result
      );
      
      // Refresh database stats
      await fetchDatabaseStats();
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addAction('populate', 'error', `Failed to upload structured data: ${errorMsg}`);
      throw error;
    } finally {
      setIsLoading(false);
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
        setProcessingStatus('');
      }, 2000);
    }
  }, [addAction, fetchDatabaseStats, setIsLoading, setUploadProgress, setProcessingStatus]);

  // Refresh database stats
  const handleRefreshStats = async () => {
    await fetchDatabaseStats()
  }

  // Get status icon
  const getStatusIcon = (status: AdminAction['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }

  // Get status color
  const getStatusColor = (status: AdminAction['status']) => {
    switch (status) {
      case 'running':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-yellow-600'
    }
  }

  // Load existing upload metadata on mount
  useEffect(() => {
    const savedMetadata = localStorage.getItem(UPLOAD_METADATA_KEY)
    if (savedMetadata) {
      try {
        const metadata: UploadMetadata = JSON.parse(savedMetadata)
        if (metadata.status === 'running' || metadata.status === 'paused') {
          setStreamingUpload(prev => ({
            ...prev,
            metadata,
            isUploading: metadata.status === 'running',
            isPaused: metadata.status === 'paused'
          }))
          addAction('populate', 'pending', `Found interrupted upload: ${metadata.processedFiles}/${metadata.totalFiles} files completed`)
        }
      } catch (error) {
        console.error('Error loading upload metadata:', error)
        localStorage.removeItem(UPLOAD_METADATA_KEY)
      }
    }
  }, [addAction])
  
  // Save upload metadata to localStorage
  const saveUploadMetadata = useCallback((metadata: UploadMetadata) => {
    localStorage.setItem(UPLOAD_METADATA_KEY, JSON.stringify(metadata))
  }, [])
  
  // Clear upload metadata
  const clearUploadMetadata = useCallback(() => {
    localStorage.removeItem(UPLOAD_METADATA_KEY)
    setStreamingUpload({
      metadata: null,
      isUploading: false,
      isPaused: false,
      currentFile: null,
      progress: 0,
      speed: 0
    })
  }, [])
  
  // Process a single file and return stock data (without uploading)
  const processFile = useCallback(async (file: File): Promise<{ symbol: string; records: number; success: boolean; error?: string; stockData?: StockData }> => {
    const startTime = Date.now()
    
    try {
      // Extract data from file
      const text = await file.text()
      const lines = text.trim().split('\n')
      
      if (lines.length < 2) {
        return {
          symbol: file.name.replace(/\.[^/.]+$/, ''),
          records: 0,
          success: false,
          error: 'File too short (need at least header + 1 data row)'
        }
      }
      
      const headers = lines[0].split(',')
      
      // Find column indices
      const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'))
      const openIndex = headers.findIndex(h => h.toLowerCase().includes('open'))
      const highIndex = headers.findIndex(h => h.toLowerCase().includes('high'))
      const lowIndex = headers.findIndex(h => h.toLowerCase().includes('low'))
      const closeIndex = headers.findIndex(h => h.toLowerCase().includes('close'))
      const volumeIndex = headers.findIndex(h => h.toLowerCase().includes('vol'))
      
      if (dateIndex === -1 || closeIndex === -1) {
        return {
          symbol: file.name.replace(/\.[^/.]+$/, ''),
          records: 0,
          success: false,
          error: 'Missing required columns (date, close)'
        }
      }
      
      // Extract symbol from filename
      let symbol = file.name.replace(/\.[^/.]+$/, '')
      symbol = cleanSymbolName(symbol).toUpperCase()
      
      // Parse data rows
      const records = []
      let validRows = 0
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line || line.includes('N/A')) continue
        
        const values = line.split(',')
        if (values.length >= Math.max(dateIndex, openIndex, highIndex, lowIndex, closeIndex, volumeIndex) + 1) {
          const close = parseFloat(values[closeIndex])
          if (!isNaN(close) && close > 0) {
            records.push({
              date: values[dateIndex],
              open: parseFloat(values[openIndex]) || null,
              high: parseFloat(values[highIndex]) || null,
              low: parseFloat(values[lowIndex]) || null,
              close: close,
              volume: parseInt(values[volumeIndex]) || null
            })
            validRows++
          }
        }
      }
      
      if (records.length === 0) {
        return {
          symbol,
          records: 0,
          success: false,
          error: 'No valid data rows found'
        }
      }
      
      const processingTime = Date.now() - startTime
      const speed = Math.round(records.length / (processingTime / 1000))
      
      return {
        symbol,
        records: records.length,
        success: true,
        stockData: { symbol, records }
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      return {
        symbol: file.name.replace(/\.[^/.]+$/, ''),
        records: 0,
        success: false,
        error: errorMsg
      }
    }
  }, [])
  
  // Upload structured data without fetching database stats (for performance)
  const uploadStructuredDataWithoutStats = useCallback(async (stockData: StockData[], folderName: string): Promise<void> => {
    try {
      // Add request timeout to prevent stuck requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/admin/upload-structured-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: stockData,
          convertToUppercase: true,
          preventDuplicates: false,
          folderName: folderName
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Don't fetch database stats here - just log success
      console.log(`✓ Uploaded ${result.symbolsAdded} symbols, ${result.recordsAdded} records`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('aborted')) {
        throw new Error(`Upload timeout - request took too long`);
      }
      throw new Error(`Failed to upload structured data: ${errorMsg}`);
    }
  }, [])
  
  // Start streaming upload
  const startStreamingUpload = useCallback(async (files: File[], folderName: string) => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const metadata: UploadMetadata = {
      id: uploadId,
      folderName,
      totalFiles: files.length,
      totalRecords: 0, // Will be calculated during processing
      processedFiles: 0,
      processedRecords: 0,
      failedFiles: [],
      completedFiles: [],
      startTime: new Date(),
      lastUpdateTime: new Date(),
      status: 'running',
      currentFileIndex: 0
    }
    
    setStreamingUpload({
      metadata,
      isUploading: true,
      isPaused: false,
      currentFile: null,
      progress: 0,
      speed: 0
    })
    
    saveUploadMetadata(metadata)
    addAction('populate', 'running', `Starting streaming upload: ${files.length} files`)
    
    try {
      let totalRecords = 0
      let processedFiles = 0
      let processedRecords = 0
      const failedFiles: string[] = []
      const completedFiles: string[] = []
      
      // Process files in parallel batches for better performance
      const batchSize = 200; // Increased for maximum throughput
      const batches = [];
      
      for (let i = 0; i < files.length; i += batchSize) {
        batches.push(files.slice(i, i + batchSize));
      }
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        // Check if upload was paused
        const currentMetadata = JSON.parse(localStorage.getItem(UPLOAD_METADATA_KEY) || '{}')
        if (currentMetadata.status === 'paused') {
          setStreamingUpload(prev => ({
            ...prev,
            isUploading: false,
            isPaused: true
          }))
          addAction('populate', 'pending', 'Upload paused by user')
          return
        }
        
        setProcessingStatus(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`)
        
        // Process batch in parallel (extract data only)
        const batchPromises = batch.map(async (file, fileIndex) => {
          const globalIndex = batchIndex * batchSize + fileIndex;
          
          setStreamingUpload(prev => ({
            ...prev,
            currentFile: file.name,
            progress: Math.round((globalIndex / files.length) * 100)
          }))
          
          return await processFile(file);
        });
        
        // Wait for all files in batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Collect all successful stock data for batch upload
        const batchStockData: StockData[] = []
        let batchRecords = 0
        
        // Process results
        batchResults.forEach((result, fileIndex) => {
          const file = batch[fileIndex];
          const globalIndex = batchIndex * batchSize + fileIndex;
          
          if (result.status === 'fulfilled' && result.value.success && result.value.stockData) {
            processedFiles++
            processedRecords += result.value.records
            completedFiles.push(file.name)
            totalRecords += result.value.records
            batchRecords += result.value.records
            batchStockData.push(result.value.stockData)
          } else {
            const error = result.status === 'rejected' ? result.reason : result.value.error;
            failedFiles.push(`${file.name}: ${error}`)
          }
        });
        
        // Upload batch as single JSON if we have data
        if (batchStockData.length > 0) {
          console.log(`Uploading batch ${batchIndex + 1} with ${batchStockData.length} symbols and ${batchRecords} records`)
          await uploadStructuredDataWithoutStats(batchStockData, metadata.folderName)
        }
        
        // Add delay between batches to allow database to catch up
        if (batchIndex < batches.length - 1) {
          console.log(`Batch ${batchIndex + 1} completed. Waiting 100ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Update speed calculation
        const elapsedTime = (Date.now() - metadata.startTime.getTime()) / 1000
        const speed = Math.round(processedRecords / elapsedTime)
        
        setStreamingUpload(prev => ({
          ...prev,
          speed,
          progress: Math.round((processedFiles / files.length) * 100)
        }))
        
        // Update metadata
        const updatedMetadata: UploadMetadata = {
          ...metadata,
          totalRecords,
          processedFiles,
          processedRecords,
          failedFiles,
          completedFiles,
          lastUpdateTime: new Date(),
          currentFileIndex: (batchIndex + 1) * batchSize
        }
        
        saveUploadMetadata(updatedMetadata)
        setStreamingUpload(prev => ({ ...prev, metadata: updatedMetadata }))
      }
      
      // Upload completed
      const finalMetadata: UploadMetadata = {
        ...metadata,
        totalRecords,
        processedFiles,
        processedRecords,
        failedFiles,
        completedFiles,
        lastUpdateTime: new Date(),
        status: 'completed'
      }
      
      saveUploadMetadata(finalMetadata)
      setStreamingUpload({
        metadata: finalMetadata,
        isUploading: false,
        isPaused: false,
        currentFile: null,
        progress: 100,
        speed: 0
      })
      
      addAction('populate', 'success', `Streaming upload completed: ${processedFiles}/${files.length} files, ${processedRecords} records`)
      setProcessingStatus('Upload completed successfully')
      
      // Remove duplicates in background
      addAction('populate', 'running', 'Removing duplicates from database...')
      setProcessingStatus('Removing duplicates...')
      
      try {
        const response = await fetch('/api/admin/remove-duplicates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          addAction('populate', 'success', `Duplicate removal completed: ${result.duplicatesRemoved} duplicates removed in ${result.processingTime}ms`)
          setProcessingStatus('Duplicate removal completed')
        } else {
          addAction('populate', 'error', 'Failed to remove duplicates')
          setProcessingStatus('Duplicate removal failed')
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        addAction('populate', 'error', `Duplicate removal error: ${errorMsg}`)
        setProcessingStatus('Duplicate removal error')
      }
      
      // Refresh database stats
      await fetchDatabaseStats()
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      
      const errorMetadata: UploadMetadata = {
        ...metadata,
        lastUpdateTime: new Date(),
        status: 'error'
      }
      
      saveUploadMetadata(errorMetadata)
      setStreamingUpload(prev => ({
        ...prev,
        isUploading: false,
        metadata: errorMetadata
      }))
      
      addAction('populate', 'error', `Streaming upload failed: ${errorMsg}`)
      setProcessingStatus('Upload failed')
    }
  }, [processFile, uploadStructuredDataWithoutStats, saveUploadMetadata, addAction, fetchDatabaseStats])
  
  // Pause streaming upload
  const pauseStreamingUpload = useCallback(() => {
    const metadata = streamingUpload.metadata
    if (metadata && metadata.status === 'running') {
      const pausedMetadata: UploadMetadata = {
        ...metadata,
        status: 'paused',
        lastUpdateTime: new Date()
      }
      
      saveUploadMetadata(pausedMetadata)
      setStreamingUpload(prev => ({
        ...prev,
        isUploading: false,
        isPaused: true,
        metadata: pausedMetadata
      }))
      
      addAction('populate', 'pending', 'Upload paused')
    }
  }, [streamingUpload.metadata, saveUploadMetadata, addAction])
  
  // Resume streaming upload
  const resumeStreamingUpload = useCallback(async () => {
    const metadata = streamingUpload.metadata
    if (metadata && metadata.status === 'paused') {
      // This would require storing the original file list
      // For now, we'll just mark it as completed
      addAction('populate', 'error', 'Resume functionality requires file list storage - please restart upload')
    }
  }, [streamingUpload.metadata, addAction])

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Administration</h1>
          <p className="text-gray-600">Manage database operations and data population</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Database Statistics */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Database Stats</h2>
                <button
                  onClick={handleRefreshStats}
                  disabled={isLoading}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>

              {databaseStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Symbols:</span>
                    <span className="font-semibold">{databaseStats.totalSymbols}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price Records:</span>
                    <span className="font-semibold">{databaseStats.totalPriceRecords?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-semibold text-sm">
                      {databaseStats.lastUpdated ? new Date(databaseStats.lastUpdated).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Database Size:</span>
                    <span className="font-semibold">{databaseStats.databaseSize}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No database statistics available</p>
                  <button
                    onClick={handleRefreshStats}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Load Stats
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Admin Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Database Operations</h2>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Stock Data Folder
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    placeholder="Or enter folder path manually (e.g., ./data)"
                    className="flex-1 input-field"
                  />
                  <button
                    onClick={handleFolderSelect}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2"
                    title="Select folder containing CSV/TXT files to upload"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Upload Folder
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Click "Upload Folder" to select a folder containing CSV/TXT files from your computer
                  <br />
                  Or enter a folder path if files are already in the Docker container
                  <br />
                  Files must have headers: Date, Open, High, Low, Close, Volume
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,.txt"
                  {...({ webkitdirectory: "true", directory: "true" } as any)}
                  onChange={handleFolderChange}
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mb-6">
                {selectedFolder && (
                  <div className="w-full mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Selected folder:</strong> {selectedFolder}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Make sure this folder contains CSV or TXT files with stock data
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setShowConfirmPopulate(true)}
                  disabled={isLoading || !selectedFolder}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  Populate Database
                </button>

                <button
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Database
                </button>
              </div>

                                   {/* Upload Progress */}
                     {isLoading && uploadProgress > 0 && (
                       <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                         <div className="flex items-center justify-between mb-2">
                           <h3 className="text-sm font-medium text-blue-900">Upload Progress</h3>
                           <span className="text-sm text-blue-700">{uploadProgress}%</span>
                         </div>
                         <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                           <div 
                             className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                             style={{ width: `${uploadProgress}%` }}
                           ></div>
                         </div>
                         <div className="text-xs text-blue-700">
                           {processingStatus || (
                             uploadProgress < 25 ? "Compressing files..." :
                             uploadProgress >= 25 && uploadProgress < 50 ? "Uploading to server..." :
                             uploadProgress >= 50 && uploadProgress < 100 ? "Processing files and populating database..." :
                             "Complete!"
                           )}
                         </div>
                       </div>
                     )}

                     {/* Streaming Upload Controls */}
                     {streamingUpload.metadata && (
                       <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                         <div className="flex items-center justify-between mb-3">
                           <h3 className="text-sm font-medium text-blue-900">Streaming Upload</h3>
                           <div className="flex gap-2">
                             {streamingUpload.isUploading && (
                               <button
                                 onClick={pauseStreamingUpload}
                                 className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center gap-1"
                               >
                                 <Pause className="w-3 h-3" />
                                 Pause
                               </button>
                             )}
                             {streamingUpload.isPaused && (
                               <button
                                 onClick={resumeStreamingUpload}
                                 className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
                               >
                                 <Play className="w-3 h-3" />
                                 Resume
                               </button>
                             )}
                             <button
                               onClick={clearUploadMetadata}
                               className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1"
                             >
                               <RotateCcw className="w-3 h-3" />
                               Clear
                             </button>
                           </div>
                         </div>
                         
                         <div className="space-y-2">
                           <div className="flex justify-between text-xs">
                             <span className="text-blue-700">Progress:</span>
                             <span className="text-blue-900 font-medium">
                               {streamingUpload.metadata.processedFiles}/{streamingUpload.metadata.totalFiles} files
                             </span>
                           </div>
                           
                           <div className="w-full bg-blue-200 rounded-full h-2">
                             <div 
                               className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                               style={{ width: `${streamingUpload.progress}%` }}
                             ></div>
                           </div>
                           
                           {streamingUpload.currentFile && (
                             <div className="text-xs text-blue-700">
                               Current: {streamingUpload.currentFile}
                             </div>
                           )}
                           
                           {streamingUpload.speed > 0 && (
                             <div className="text-xs text-blue-700">
                               Speed: {streamingUpload.speed} records/sec
                             </div>
                           )}
                           
                           <div className="text-xs text-blue-700">
                             Status: {streamingUpload.metadata.status}
                           </div>
                           
                           {streamingUpload.metadata.failedFiles.length > 0 && (
                             <div className="text-xs text-red-600">
                               Failed: {streamingUpload.metadata.failedFiles.length} files
                             </div>
                           )}
                         </div>
                       </div>
                     )}

                     {/* Features Info */}
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                       <h3 className="text-sm font-medium text-blue-900 mb-2">Features</h3>
                       <ul className="text-sm text-blue-800 space-y-1">
                         <li>• Simple folder upload interface</li>
                         <li>• Recursive CSV/TXT file search in subdirectories</li>
                         <li>• Automatic file compression for faster uploads</li>
                         <li>• Automatic symbol conversion to uppercase</li>
                         <li>• Automatic .US suffix removal from symbols</li>
                         <li>• Duplicate entry prevention</li>
                         <li>• Data validation and error handling</li>
                         <li>• Progress tracking and logging</li>
                         <li>• Automatic file cleanup after processing</li>
                         <li>• Performance optimized for large folders</li>
                         <li>• Support for compressed archives (ZIP)</li>
                       </ul>
                     </div>
            </div>
          </div>
        </div>

        {/* Action History */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Action History</h2>
            
            {actions.length > 0 ? (
              <div className="space-y-3">
                {actions.map((action) => (
                  <div key={action.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {getStatusIcon(action.status)}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${getStatusColor(action.status)}`}>
                        {action.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {action.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 uppercase">
                      {action.type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No actions performed yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modals */}
        {showConfirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900">Delete Database</h3>
              </div>
              <p className="text-gray-600 mb-6">
                This will permanently delete all database data. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDatabase}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmPopulate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <Upload className="w-6 h-6 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900">Populate Database</h3>
              </div>
              <p className="text-gray-600 mb-6">
                This will populate the database with data from: <strong>{selectedFolder}</strong>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmPopulate(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePopulateDatabase}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Populating...' : 'Populate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
