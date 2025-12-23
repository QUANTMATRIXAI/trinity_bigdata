import { useState, useEffect, useCallback } from "react";
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Search, BarChart3, 
  Table, Layers, MoreVertical, ArrowUpAZ, ArrowDownZA, 
  PieChart, LineChart, AreaChart, Download, RefreshCw, CheckSquare
} from "lucide-react";
import { 
  BarChart, Bar, LineChart as ReLineChart, Line, AreaChart as ReAreaChart, 
  Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell 
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = "http://localhost:8100";
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalysisDashboard({ filename, onBack }) {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("grid"); // 'grid', 'visualize', 'pivot'

  // Grid State
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState(null);
  const [sortDesc, setSortDesc] = useState(false);
  
  // UI State
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [jumpPage, setJumpPage] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([]); // Store fetched categories
  const [catLoading, setCatLoading] = useState(false);

  // Visualization State
  const [vizX, setVizX] = useState(""); 
  const [vizY, setVizY] = useState(""); 
  const [vizOp, setVizOp] = useState("count"); 
  const [vizData, setVizData] = useState(null);
  const [chartType, setChartType] = useState("bar");

  // Group By State
  const [groupCol, setGroupCol] = useState(""); 
  const [targetCol, setTargetCol] = useState(""); 
  const [groupOp, setGroupOp] = useState("sum");
  const [groupData, setGroupData] = useState(null);

  // --- API CALLS ---

  const fetchGridData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/analysis/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, page, page_size: 20, sort_by: sortBy, sort_desc: sortDesc, filters })
      });
      const result = await res.json();
      if (result.status === "success") {
        setData(result.data);
        setColumns(result.columns);
        setTotalPages(result.total_pages);
        
        // Auto-fill dropdowns if empty
        if (!vizX && result.columns.length > 0) {
            setVizX(result.columns[0]);
            setVizY(result.columns[0]);
            setGroupCol(result.columns[0]);
            setTargetCol(result.columns[0]);
        }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [filename, page, sortBy, sortDesc, filters, vizX]);

  // Fetch Categories for Dropdown
  const fetchCategories = async (col) => {
      setCatLoading(true);
      setCategoryOptions([]);
      try {
          const res = await fetch(`${BACKEND_URL}/api/analysis/unique-values?filename=${filename}&column=${col}`);
          const result = await res.json();
          if (result.status === "success") {
              setCategoryOptions(result.values);
          }
      } catch(err) { console.error(err); }
      setCatLoading(false);
  };

  const handleDropdownClick = (col) => {
      if (activeDropdown === col) {
          setActiveDropdown(null); // Close
      } else {
          setActiveDropdown(col); // Open
          fetchCategories(col); // Load data
      }
  };

  const applyCategoryFilter = (col, val) => {
      setFilters(prev => ({...prev, [col]: val}));
      setPage(1);
      setActiveDropdown(null);
  };

  // Run Visualization Analysis
  const runVizAnalysis = async () => {
    if (!vizX || !vizY) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/analysis/aggregate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, group_by_col: vizX, operation: vizOp, target_col: vizY })
      });
      const result = await res.json();
      if (result.status === "success") setVizData(result);
    } catch (err) { console.error(err); }
  };

  // Run Group By Analysis
  const runGroupAnalysis = async () => {
    if (!groupCol || !targetCol) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/analysis/aggregate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, group_by_col: groupCol, operation: groupOp, target_col: targetCol })
      });
      const result = await res.json();
      if (result.status === "success") setGroupData(result);
    } catch (err) { console.error(err); }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => { fetchGridData(); }, 500);
    return () => clearTimeout(delayDebounce);
  }, [fetchGridData]);

  // --- RENDERERS ---

  const renderGrid = () => (
    <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30 shadow-2xl relative">
        
        {/* JUMP TO PAGE (Floating) */}
        <div className="absolute top-0 right-0 z-20 p-2 bg-zinc-900/90 backdrop-blur border-b border-l border-zinc-800 rounded-bl-xl flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">JUMP TO:</span>
            <input 
                type="number" 
                value={jumpPage} 
                onChange={(e) => setJumpPage(e.target.value)} 
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        const p = parseInt(jumpPage);
                        if (p >= 1 && p <= totalPages) setPage(p);
                        setJumpPage("");
                    }
                }}
                placeholder="#"
                className="w-12 bg-zinc-950 border border-zinc-800 rounded px-1 text-center text-xs text-zinc-200 focus:border-blue-500 outline-none"
            />
        </div>

        <div className="overflow-x-auto min-h-[600px]">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-zinc-400 uppercase bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
                    <tr>
                        {columns.map((col) => (
                            <th key={col} className="px-4 py-3 min-w-[200px] font-medium border-r border-zinc-800/50 group relative">
                                <div className="flex flex-col gap-2">
                                    
                                    {/* Header Title + Menu */}
                                    <div className="flex items-center justify-between">
                                        <div 
                                            className="flex items-center gap-1 cursor-pointer hover:text-white truncate"
                                            onClick={() => { setSortBy(col); setSortDesc(!sortDesc); }} 
                                            title="Click to Sort"
                                        >
                                            <span className={sortBy === col ? 'text-blue-500 font-bold' : ''}>{col}</span>
                                            {sortBy === col && (sortDesc ? <ArrowDownZA size={12} className="text-blue-500"/> : <ArrowUpAZ size={12} className="text-blue-500"/>)}
                                        </div>

                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDropdownClick(col); }}
                                            className={`p-1 rounded hover:bg-zinc-800 ${activeDropdown === col ? 'text-blue-500 bg-zinc-800' : 'text-zinc-600'}`}
                                        >
                                            <MoreVertical size={14} />
                                        </button>
                                    </div>

                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1.5 text-zinc-600 w-3 h-3" />
                                        <input 
                                            type="text" 
                                            placeholder={`Filter ${col}...`}
                                            value={filters[col] || ""}
                                            onChange={(e) => { 
                                                const val = e.target.value; 
                                                setFilters(prev => ({...prev, [col]: val})); 
                                                setPage(1); 
                                            }} 
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 pl-7 py-1 text-xs text-zinc-200 focus:border-blue-500/50 outline-none transition-all focus:ring-1 focus:ring-blue-500/20" 
                                        />
                                    </div>

                                    {/* DROPDOWN MENU */}
                                    {activeDropdown === col && (
                                        <div 
                                            className="absolute top-full right-0 mt-1 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 flex flex-col p-1"
                                            onClick={(e) => e.stopPropagation()} 
                                        >
                                            <div className="text-[10px] font-bold text-zinc-500 px-2 py-1 uppercase tracking-wider">Sorting</div>
                                            <button onClick={() => { setSortBy(col); setSortDesc(false); setActiveDropdown(null); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-xs text-zinc-300 text-left"><ArrowUpAZ size={14} /> Sort Ascending</button>
                                            <button onClick={() => { setSortBy(col); setSortDesc(true); setActiveDropdown(null); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-xs text-zinc-300 text-left"><ArrowDownZA size={14} /> Sort Descending</button>
                                            
                                            <div className="my-1 border-t border-zinc-800"></div>
                                            
                                            <div className="text-[10px] font-bold text-zinc-500 px-2 py-1 uppercase tracking-wider">Quick Filters</div>
                                            
                                            {/* Categories List */}
                                            <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                                {catLoading ? (
                                                    <div className="px-2 py-2 text-xs text-zinc-500 text-center">Loading...</div>
                                                ) : categoryOptions.length > 0 ? (
                                                    categoryOptions.map((val) => (
                                                        <button 
                                                            key={val} 
                                                            onClick={() => applyCategoryFilter(col, val)}
                                                            className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-zinc-800 rounded text-xs text-zinc-300 text-left truncate"
                                                        >
                                                            <CheckSquare size={12} className={filters[col] === val ? "text-blue-500" : "text-zinc-600"} />
                                                            {val}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-2 py-2 text-xs text-zinc-500">No categories found</div>
                                                )}
                                            </div>

                                            {/* Clear Filter */}
                                            {filters[col] && (
                                                <button 
                                                    onClick={() => applyCategoryFilter(col, "")}
                                                    className="mt-1 px-2 py-1.5 bg-red-900/20 text-red-400 hover:bg-red-900/30 rounded text-xs text-center"
                                                >
                                                    Clear Filter
                                                </button>
                                            )}

                                        </div>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                    {loading ? <tr><td colSpan={columns.length} className="px-6 py-20 text-center animate-pulse text-zinc-500">Loading stream...</td></tr> : 
                     data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/30 transition-colors group">
                            {columns.map(col => (
                                <td key={col} className="px-4 py-2.5 text-zinc-300 border-r border-zinc-800/20 text-xs font-mono group-hover:text-white">
                                    {row[col]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderVisualizer = () => {
    if (!vizData) return <div className="h-96 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20"><BarChart3 size={48} className="mb-4 opacity-50"/> Select variables above to plot graph.</div>;
    const { data: chartData, x_key, y_key } = vizData;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl relative">
            <div className="absolute top-6 right-6 flex gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1 z-10">
                {[ {id: 'bar', icon: BarChart3}, {id: 'line', icon: LineChart}, {id: 'area', icon: AreaChart}, {id: 'pie', icon: PieChart} ].map(type => (
                    <button key={type.id} onClick={() => setChartType(type.id)} className={`p-2 rounded transition-colors ${chartType === type.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <type.icon size={16}/>
                    </button>
                ))}
            </div>
            <h3 className="text-zinc-300 font-medium mb-8 pl-2 border-l-4 border-blue-500">Graph: {vizOp.toUpperCase()} of {vizY} vs {vizX}</h3>
            <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey={x_key} stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip cursor={{fill: '#27272a', opacity: 0.4}} contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff'}} />
                            <Bar dataKey={y_key} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    ) : chartType === 'line' ? (
                        <ReLineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey={x_key} stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff'}} />
                            <Line type="monotone" dataKey={y_key} stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
                        </ReLineChart>
                    ) : chartType === 'area' ? (
                        <ReAreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey={x_key} stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff'}} />
                            <Area type="monotone" dataKey={y_key} stroke="#10b981" fillOpacity={0.3} fill="#10b981" />
                        </ReAreaChart>
                    ) : (
                        <RePieChart>
                            <Pie data={chartData} dataKey={y_key} nameKey={x_key} cx="50%" cy="50%" outerRadius={160} label>
                                {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff'}} />
                        </RePieChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
  };

  const renderGroupTable = () => {
    if (!groupData) return <div className="h-96 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20"><Table size={48} className="mb-4 opacity-50"/> Select variables above to generate table.</div>;
    const { data: rows, x_key, y_key } = groupData;
    
    return (
        <div className="border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
             <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-zinc-300 font-medium border-l-4 border-purple-500 pl-2">Result: {groupOp.toUpperCase()} of {targetCol} by {groupCol}</h3>
                <button className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"><Download size={14}/> Export CSV</button>
             </div>
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-400 uppercase bg-zinc-950 border-b border-zinc-800">
                    <tr>
                        <th className="px-6 py-4 font-bold text-white">{x_key} (Group)</th>
                        <th className="px-6 py-4 font-bold text-blue-400 text-right">{y_key} (Calculated Value)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/30">
                    {rows.map((row, i) => (
                        <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="px-6 py-3 text-zinc-300 font-medium">{row[x_key]}</td>
                            <td className="px-6 py-3 text-zinc-300 text-right font-mono">{row[y_key]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
  };

  const ControlBar = ({ label1, val1, setVal1, label2, val2, setVal2, op, setOp, onRun }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-4 shadow-lg mb-6">
        <div className="flex flex-wrap gap-4 items-end">
            <div>
                <label className="text-xs text-zinc-500 font-bold tracking-wider mb-2 block uppercase">{label1}</label>
                <select value={val1} onChange={e => setVal1(e.target.value)} className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-lg p-2.5 w-48 focus:border-blue-500 outline-none">
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div>
                <label className="text-xs text-zinc-500 font-bold tracking-wider mb-2 block uppercase">Operation</label>
                <div className="flex bg-zinc-950 rounded-lg border border-zinc-700 p-1">
                    {['count', 'sum', 'avg', 'min', 'max'].map(o => (
                        <button key={o} onClick={() => setOp(o)} className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${op === o ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                            {o}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="text-xs text-zinc-500 font-bold tracking-wider mb-2 block uppercase">{label2}</label>
                <select value={val2} onChange={e => setVal2(e.target.value)} className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-lg p-2.5 w-48 focus:border-blue-500 outline-none">
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <button onClick={onRun} className="ml-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                Run Analysis ⚡
            </button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="h-16 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
            <div>
                <h1 className="font-bold text-lg tracking-tight">Analytics Studio</h1>
                <p className="text-xs text-zinc-500">{filename ? filename.split('_')[0] : "No File"}</p>
            </div>
        </div>
        
        {/* TABS */}
        <div className="absolute left-1/2 -translate-x-1/2 flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {[ {id: 'grid', label: 'Data Preview', icon: Table}, {id: 'visualize', label: 'Data Visualization', icon: BarChart3}, {id: 'pivot', label: 'Group By Table', icon: Layers} ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <tab.icon size={16} /> {tab.label}
                </button>
            ))}
        </div>

        {/* PAGINATION */}
        <div className="w-[200px] flex justify-end gap-2">
            {activeTab === 'grid' && (
                <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 disabled:opacity-30"><ChevronLeft size={16} /></button>
                    <span className="text-xs font-mono text-zinc-400 px-2">{page} / {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
            )}
            <button onClick={() => { setData([]); fetchGridData(); }} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white" title="Refresh Data"><RefreshCw size={16}/></button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-auto p-8 max-w-[1600px] mx-auto w-full">
        <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                
                {activeTab === 'grid' && renderGrid()}

                {activeTab === 'visualize' && (
                    <div className="max-w-6xl mx-auto">
                        <ControlBar 
                            label1="Variable 1 (X-Axis)" val1={vizX} setVal1={setVizX}
                            label2="Variable 2 (Y-Axis)" val2={vizY} setVal2={setVizY}
                            op={vizOp} setOp={setVizOp}
                            onRun={runVizAnalysis}
                        />
                        {renderVisualizer()}
                    </div>
                )}

                {activeTab === 'pivot' && (
                    <div className="max-w-6xl mx-auto">
                        <ControlBar 
                            label1="Variable 1 (Group By)" val1={groupCol} setVal1={setGroupCol}
                            label2="Variable 2 (Calculate)" val2={targetCol} setVal2={setTargetCol}
                            op={groupOp} setOp={setGroupOp}
                            onRun={runGroupAnalysis}
                        />
                        {renderGroupTable()}
                    </div>
                )}

            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}