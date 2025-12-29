import { useState } from "react";
import AnalysisDashboard from "./AnalysisDashboard";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios"; 

const BACKEND_URL = "http://localhost:8100";

function App() {
  const [file, setFile] = useState(null);
  const [activeFile, setActiveFile] = useState(null); 
  
  // Progress States
  const [uploadProgress, setUploadProgress] = useState(0); 
  const [convertProgress, setConvertProgress] = useState(0); 
  const [status, setStatus] = useState("idle"); // idle, uploading, scanning, converting, success, error
  const [errorMsg, setErrorMsg] = useState("");

  const [viewMode, setViewMode] = useState("upload");
  const [analysisFile, setAnalysisFile] = useState(null);

  // 1. Upload Logic
  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setUploadProgress(0);
    setErrorMsg("");

    try {
        // Step A: Get Presigned URL
        const urlRes = await axios.post(`${BACKEND_URL}/api/datasets/upload-url?filename=${encodeURIComponent(file.name)}`);
        const { upload_url, object_key } = urlRes.data;
      
        // Step B: Upload to MinIO with Progress
        await axios.put(upload_url, file, {
            headers: { "Content-Type": file.type },
            onUploadProgress: (progressEvent) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percent);
            }
        });

        // Step C: Scan File
        setStatus("scanning");
        const scanRes = await axios.get(`${BACKEND_URL}/api/datasets/scan?object_key=${encodeURIComponent(object_key)}`);
        
        if (scanRes.data.status === "success") {
            // 🟢 UPDATED LOGIC: If it's a CSV, it might not have "sheets", or backend returns ["Sheet1"]
            // If it's a CSV, we can optionally auto-start conversion or let them click "Sheet1"
            // For consistency, we treat it exactly like Excel with 1 sheet.
            setActiveFile({ filename: object_key, sheets: scanRes.data.sheets });
            setStatus("idle"); 
        } else {
            throw new Error(scanRes.data.message);
        }

    } catch (err) {
        console.error(err);
        setStatus("error");
        setErrorMsg("Upload failed. Please try again.");
    }
  };

  // 2. Convert Logic
  const handleConvert = async (sheetName) => {
    if (!activeFile) return;
    setStatus("converting");
    setConvertProgress(0);

    // Simulated progress for conversion
    const interval = setInterval(() => {
        setConvertProgress((old) => {
            if (old >= 90) return 90;
            return old + 5; 
        });
    }, 500);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/datasets/convert`, {
          object_key: activeFile.filename, 
          sheet_name: sheetName 
      });
      
      clearInterval(interval);
      setConvertProgress(100); 

      if (res.data.status === "success") {
        setTimeout(() => {
            setStatus("success");
            setAnalysisFile(res.data.processed_file);
        }, 500);
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
       clearInterval(interval);
       setStatus("error");
       setErrorMsg("Conversion failed.");
    }
  };

  if (viewMode === "analysis") {
    return <AnalysisDashboard filename={analysisFile} onBack={() => { setViewMode("upload"); setStatus("idle"); setFile(null); setActiveFile(null); }} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 font-sans antialiased text-zinc-100">
      
      {/* CENTRALLY ALIGNED, MINIMAL CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>

        {/* Header */}
        <div className="text-center mb-8">
            <h1 className="text-xl font-bold tracking-tight mb-1">Data Ingestion</h1>
            <p className="text-xs text-zinc-500">Secure Parquet Conversion Pipeline</p>
        </div>

        <AnimatePresence mode="wait">
            
            {/* VIEW 1: IDLE / FILE SELECT */}
            {!activeFile && status !== "uploading" && status !== "scanning" && (
                <motion.div key="select" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                    <div className="relative group">
                        {/* 🟢 UPDATED: Changed accept to allow CSV files */}
                        <input 
                            type="file" 
                            id="fileInput" 
                            accept=".xlsx, .xls, .csv" 
                            onChange={(e) => setFile(e.target.files[0])} 
                            className="hidden" 
                        />
                        <label htmlFor="fileInput" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-800 rounded-2xl cursor-pointer hover:border-blue-500/50 hover:bg-zinc-800/30 transition-all">
                            {file ? (
                                <div className="text-center px-4">
                                    <FileSpreadsheet className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-zinc-200 truncate max-w-[200px]">{file.name}</p>
                                    <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <UploadCloud className="w-8 h-8 text-zinc-600 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
                                    <p className="text-sm text-zinc-400">Click to browse or drag file</p>
                                    {/* 🟢 UPDATED: Added CSV to label text */}
                                    <p className="text-xs text-zinc-600 mt-1">Supports .xlsx, .xls, .csv</p>
                                </div>
                            )}
                        </label>
                    </div>
                    <button 
                        onClick={handleUpload} 
                        disabled={!file}
                        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${file ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                    >
                        Upload & Scan
                    </button>
                </motion.div>
            )}

            {/* VIEW 2: UPLOADING PROGRESS */}
            {status === "uploading" && (
                <motion.div key="uploading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-center py-8">
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-4">
                        <motion.div 
                            className="h-full bg-blue-500" 
                            initial={{width: 0}} 
                            animate={{width: `${uploadProgress}%`}} 
                        />
                    </div>
                    <p className="text-2xl font-bold text-white">{uploadProgress}%</p>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Uploading to Cloud</p>
                </motion.div>
            )}

             {/* VIEW 3: SCANNING SPINNER */}
             {status === "scanning" && (
                <motion.div key="scanning" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-center py-8">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-zinc-300">Scanning File Structure...</p>
                </motion.div>
            )}

            {/* VIEW 4: SHEET SELECTION (ACTIVE FILE CARD) */}
            {activeFile && status === "idle" && (
                <motion.div key="sheets" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-zinc-200 truncate">{activeFile.filename}</h3>
                            <p className="text-xs text-zinc-500">Ready for Conversion</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider pl-1">
                            {/* 🟢 UPDATED: Show different text if CSV (optional but nice) */}
                            {activeFile.filename.endsWith('.csv') ? 'Confirm Processing' : 'Select Sheet'}
                        </p>
                        <div className="max-h-40 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                            {activeFile.sheets.map((sheet) => (
                                <button 
                                    key={sheet} 
                                    onClick={() => handleConvert(sheet)}
                                    className="w-full flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors group text-left"
                                >
                                    <span className="text-sm text-zinc-300">
                                        {/* 🟢 UPDATED: If CSV, maybe rename "Sheet1" to "Process File" for better UX, or keep as is. Keeping as is for safety. */}
                                        {sheet === "Sheet1" && activeFile.filename.endsWith('.csv') ? "Process CSV Data" : sheet}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400" />
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* VIEW 5: CONVERTING PROGRESS */}
            {status === "converting" && (
                <motion.div key="converting" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-center py-8">
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-4">
                        <motion.div 
                            className="h-full bg-purple-500" 
                            initial={{width: 0}} 
                            animate={{width: `${convertProgress}%`}} 
                        />
                    </div>
                    <p className="text-2xl font-bold text-white">{convertProgress}%</p>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Converting to Parquet</p>
                </motion.div>
            )}

            {/* VIEW 6: SUCCESS */}
            {status === "success" && (
                <motion.div key="success" initial={{opacity:0}} animate={{opacity:1}} className="text-center py-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-1">Conversion Complete</h2>
                    <p className="text-xs text-zinc-500 mb-6">Parquet file generated successfully.</p>
                    <button 
                        onClick={() => setViewMode("analysis")}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all"
                    >
                        Launch Analytics Studio 🚀
                    </button>
                </motion.div>
            )}

            {/* ERROR STATE */}
            {status === "error" && (
                <motion.div key="error" className="text-center py-6">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
                    <p className="text-sm text-red-400 mb-4">{errorMsg}</p>
                    <button onClick={() => setStatus("idle")} className="text-xs text-zinc-500 hover:text-white underline">Try Again</button>
                </motion.div>
            )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default App;