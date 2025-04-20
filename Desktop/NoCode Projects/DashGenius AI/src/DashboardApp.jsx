import React, { useState, useEffect, useMemo } from "react";
import DragDropUpload from "./components/DragDropUpload";
import KPICard from "./components/KPICard";
import { Chart, TimeScale } from "chart.js";
import Confetti from "react-confetti";
import "chartjs-adapter-date-fns";
import "./sheetcraft.css";
import { uploadAndAnalyzeFile, generateChartConfigs, sendQueryToBackend } from "./aiService";

// --- Theme Toggle Helper ---
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);
  return [theme, setTheme];
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
      {theme === "dark" ? (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 0112.21 3a7 7 0 100 14 9 9 0 009-4.21z" /></svg>
      ) : (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.95 6.95l-1.41-1.41M6.46 6.46L5.05 5.05m12.02 0l-1.41 1.41M6.46 17.54l-1.41 1.41" /></svg>
      )}
    </button>
  );
}

// --- Main App ---
function DashboardApp() {
  const [theme, setTheme] = useTheme();
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState(null);
  const [userQuery, setUserQuery] = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [customTheme, setCustomTheme] = useState('glass');

  // --- State for multi-file support and query history ---
  const [uploadedFiles, setUploadedFiles] = useState([]); // [{ name, previewRows, aiResult, queries: [{q, a}] }]
  const [activeFileIdx, setActiveFileIdx] = useState(0);

  React.useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.className = "dark bg-gray-950";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.className = "light bg-gray-100";
    }
  }, [theme]);

  // Drag & drop upload handler
  const handleFileAccepted = async (file) => {
    setError("");
    setAiResult(null);
    setQueryResult(null);
    setUploading(true);
    setFileName(file?.name || "");
    try {
      const { ai, previewRows } = await uploadAndAnalyzeFile(file);
      const newFile = {
        name: file.name,
        previewRows,
        aiResult: ai,
        queries: []
      };
      setUploadedFiles((prev) => [...prev, newFile]);
      setActiveFileIdx(uploadedFiles.length); // Switch to new file
      setPreviewRows(previewRows);
      setAiResult(ai);
      // --- DEBUG LOG ---
      console.log("AI Result:", ai);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setAiLoading(false);
    }
  };

  // Switch active file
  const handleSwitchFile = (idx) => {
    setActiveFileIdx(idx);
    const file = uploadedFiles[idx];
    setFileName(file.name);
    setPreviewRows(file.previewRows);
    setAiResult(file.aiResult);
    setQueryResult(null);
    setUserQuery("");
  };

  // User query handler (extension: can be implemented as a separate endpoint)
  const handleQuery = async () => {
    if (!userQuery) return;
    setAiLoading(true);
    setQueryResult(null);
    setError("");
    try {
      const { queryResponse } = await sendQueryToBackend(userQuery);
      setQueryResult(queryResponse);
      // Save to query history for this file
      setUploadedFiles((prev) => prev.map((f, i) => i === activeFileIdx ? { ...f, queries: [...f.queries, { q: userQuery, a: queryResponse }] } : f));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handlePowerBIExport = () => {
    if (!aiResult?.daxSuggestions) return;
    const content = JSON.stringify(aiResult.daxSuggestions, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    saveAs(blob, `${fileName.replace(/\.[^.]+$/, "")}_powerbi_export.json`);
  };

  const handleExportPreview = () => {
    if (!previewRows || previewRows.length === 0) return;
    const csv = Papa.unparse(previewRows);
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, `${fileName.replace(/\.[^.]+$/, "")}_preview.csv`);
  };

  const chartConfigs = aiResult?.visualizationRecommendations
    ? generateChartConfigs(aiResult.visualizationRecommendations)
    : [];

  // Dynamically determine tile size based on metric type
  const getCardClass = (type) => {
    // KPI cards: span 1 col, charts: span 2 cols on desktop
    if (type === 'kpi') return "col-span-1 row-span-1";
    if (type === 'large-chart') return "col-span-2 row-span-2";
    return "col-span-2 row-span-1"; // default for charts
  };

  const showInsight = (insight) => {
    setModalContent(insight);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const LoadingBar = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
      <div className="w-64 h-4 bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 rounded-full overflow-hidden shadow-lg animate-pulse relative">
        <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-blue-300 via-blue-100 to-blue-300 opacity-70 animate-slide" style={{animation: 'slide 1.2s infinite linear'}}></div>
      </div>
      <div className="mt-4 text-blue-200 font-semibold text-lg tracking-wide">Analyzing your data...</div>
      <style>{`@keyframes slide { 0% { left: -33%; } 100% { left: 100%; } } .animate-slide { animation: slide 1.2s infinite linear; }`}</style>
    </div>
  );

  const InteractiveCard = ({ children, onClick, className = "" }) => (
    <div
      className={`transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:ring-4 hover:ring-blue-400/30 cursor-pointer ${className}`}
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick && onClick(e)}
      aria-pressed="false"
    >
      {children}
    </div>
  );

  const renderInsights = () => (
    aiResult?.insights && aiResult.insights.length > 0 ? (
      <div className="flex flex-wrap gap-3 mt-4 mb-2">
        {aiResult.insights.map((insight, idx) => (
          <span
            key={idx}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white font-medium shadow cursor-pointer hover:scale-105 transition text-sm"
            onClick={() => showInsight(insight)}
          >
            💡 {insight.length > 70 ? insight.slice(0, 67) + '...' : insight}
          </span>
        ))}
      </div>
    ) : null
  );

  const triggerConfetti = () => {
    setConfettiKey(prev => prev + 1);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2200);
  };

  const milestoneKPI = (kpi) => {
    if (!kpi || typeof kpi !== 'object') return false;
    // Example: trigger for value > 10,000 or change > 10%
    return (parseFloat(kpi.value) > 10000 || Math.abs(parseFloat(kpi.change)) > 10);
  };

  const AnimatedChart = (props) => (
    <div className="transition-transform duration-700 ease-out animate-fadeInUp">
      <Chart {...props} />
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px);} to { opacity: 1; transform: none;} } .animate-fadeInUp { animation: fadeInUp 0.8s cubic-bezier(.23,1.01,.32,1) both;}`}</style>
    </div>
  );

  const themeOptions = [
    { label: 'Glass', value: 'glass' },
    { label: 'Dark', value: 'dark' },
    { label: 'Light', value: 'light' },
  ];

  const themeClass = customTheme === 'glass' ? 'backdrop-blur bg-white/10 border border-white/10 shadow-lg' : customTheme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white' : 'bg-gradient-to-br from-blue-50 via-blue-100 to-white text-gray-900';

  // --- Utility: Can Craft Dashboard ---
  const canCraftDashboard = useMemo(() => {
    return !!(aiResult && aiResult.keyMetrics && aiResult.keyMetrics.length > 0 && aiResult.visualizationRecommendations && aiResult.visualizationRecommendations.length > 0);
  }, [aiResult]);

  const kpiCards = aiResult?.keyMetrics && aiResult.keyMetrics.length > 0 ? (
    aiResult.keyMetrics.map((kpi, idx) =>
      <InteractiveCard key={idx} className={`dashboard-card h-full min-h-[180px] flex flex-col justify-between ${getCardClass('kpi')} ${themeClass}`}
        onClick={() => {
          showInsight(`KPI: ${typeof kpi === 'object' ? kpi.title : kpi}`);
          if (milestoneKPI(kpi)) triggerConfetti();
        }}>
        <KPICard {...(typeof kpi === 'object' ? kpi : { title: kpi, value: 'N/A', change: 0, changeLabel: 'No value' })} />
      </InteractiveCard>
    )
  ) : null;

  // Patch: Map 'horizontalBar' to 'bar' type for Chart.js v4+
  function patchChartType(type) {
    if (type === 'horizontalBar') return 'bar';
    return type;
  }

  const charts = chartConfigs.length > 0 ? (
    chartConfigs.map((cfg, idx) => (
      <InteractiveCard className={`dashboard-card h-full min-h-[220px] flex flex-col justify-between ${getCardClass((idx === 0 && chartConfigs.length > 2) ? 'large-chart' : 'chart')} ${themeClass}`} key={idx}
        onClick={() => showInsight(cfg.options?.plugins?.title?.text || `Chart ${idx + 1}`)}>
        <AnimatedChart type={patchChartType(cfg.type)} data={cfg.data} options={cfg.options} />
      </InteractiveCard>
    ))
  ) : null;

  const renderThemeToggle = () => (
    <div className="flex gap-2 items-center mb-4">
      <span className="text-xs font-semibold text-gray-400">Theme:</span>
      {themeOptions.map(opt => (
        <button key={opt.value} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all duration-200 ${customTheme === opt.value ? 'bg-blue-500 text-white border-blue-500' : 'bg-transparent border-gray-400 text-gray-400 hover:bg-gray-100 hover:text-blue-700'}`} onClick={() => setCustomTheme(opt.value)}>{opt.label}</button>
      ))}
    </div>
  );

  const handleCraftDashboard = () => {
    if (canCraftDashboard) {
      setDashboardVisible(true);
    } else {
      setError("No dashboard generated. Please upload a supported file and wait for analysis to complete.");
    }
  };

  // --- Enhanced Data Preview Table ---
  const renderEnhancedPreview = ({ rows }) => {
    if (!rows || rows.length === 0) return <div className="text-gray-400 p-5">No data preview available.</div>;
    const columns = Object.keys(rows[0] || {});
    return (
      <div className="preview-table w-full text-sm">
        <div className="preview-header flex bg-gray-800 text-white font-semibold rounded-t-xl">
          {columns.map(col => (
            <div key={col} className="preview-cell py-2 px-4 border-r border-gray-700 last:border-none">{col}</div>
          ))}
        </div>
        <div className="preview-body">
          {rows.slice(0, 15).map((row, idx) => (
            <div key={idx} className="preview-row flex border-b border-gray-700 last:border-none">
              {columns.map(col => (
                <div key={col} className="preview-cell py-2 px-4 truncate max-w-xs">{row[col]}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- HEADER ---
  const Header = (
    <header className="navbar">
      <div className="logo flex items-center gap-2 text-2xl font-extrabold">
        <div className="logo-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
        DashGenius <span>AI</span>
      </div>
      <nav className="nav-links">
        <a href="#features" className="nav-link">Features</a>
        <a href="#templates" className="nav-link">Templates</a>
        <a href="#pricing" className="nav-link">Pricing</a>
        <a href="#blog" className="nav-link">Blog</a>
      </nav>
      <ThemeToggle theme={theme} setTheme={setTheme} />
    </header>
  );

  // --- HERO ---
  const Hero = (
    <section className="hero">
      <div className="tagline">SPREADSHEETS REIMAGINED</div>
      <h1 className="headline">Transform words into dashboards in seconds</h1>
      <p className="description">Simply upload your data and let DashGenius AI generate beautiful, actionable dashboards and insights in seconds.</p>
    </section>
  );

  return (
    <div className={`sheetcraft-root ${theme}`}> {/* sheetcraft-root for global theme and background */}
      {Header}
      {Hero}
      <div className="container">
        {/* --- Main Fluid One-Pager Layout --- */}
        <div className="w-full min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-2 md:px-0">
          <div className="max-w-6xl w-full flex flex-col gap-8 py-10">
            {/* Header & Hero (if no data) */}
            {(!previewRows || previewRows.length === 0) && !aiResult && (
              <div className="flex flex-col items-center justify-center py-8">
                <DragDropUpload onFileAccepted={handleFileAccepted} uploading={uploading} error={error} />
                <div className="mt-6 text-blue-200 text-lg">Upload a CSV or Excel file to get started.</div>
              </div>
            )}

            {/* Data Preview (fluid card) */}
            {previewRows && (
              <div className="bg-[#1e293b] rounded-2xl shadow-2xl border border-blue-900/40 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold tracking-tight text-blue-200 drop-shadow-lg">Data Preview</h2>
                  <button
                    className="btn-primary px-5 py-2 rounded-xl text-base font-semibold shadow-lg hover:scale-105 transition-transform"
                    onClick={handleCraftDashboard}
                    disabled={!canCraftDashboard || uploading || aiLoading}
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'><path d='M12 4v16m8-8H4m8 0h8'/></svg>
                      Craft Dashboard
                    </span>
                  </button>
                </div>
                <div className="rounded-xl overflow-auto border border-blue-900/20 shadow-xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
                  {renderEnhancedPreview({ rows: previewRows })}
                </div>
              </div>
            )}

            {/* Dashboard (fluid grid) */}
            {dashboardVisible && aiResult && canCraftDashboard && (
              <div className="dashboard-fade visible w-full">
                <div className="dashboard-layout grid auto-rows-[260px] grid-cols-1 md:grid-cols-4 gap-6 items-stretch w-full min-h-[60vh]">
                  {kpiCards}
                  {charts}
                </div>
              </div>
            )}

            {/* Insights & Chat (fluid below dashboard) */}
            {(aiResult && (aiResult.insights?.length > 0 || aiResult.keyMetrics?.length > 0)) && (
              <div className="flex flex-col gap-6 mt-8">
                {renderInsights()}
                {/* Chat Section (query input & result) */}
                <div className="chat-section mt-6">
                  <div className="chat-input flex items-center bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] rounded-xl p-3 shadow border border-blue-900/20">
                    <input
                      type="text"
                      className="flex-1 bg-transparent outline-none text-base text-blue-100 placeholder-blue-400 px-2"
                      placeholder="Ask a question about your data..."
                      value={userQuery}
                      onChange={e => setUserQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleQuery(); }}
                    />
                    <button
                      className="ml-3 btn-primary px-4 py-2 rounded-lg text-base font-semibold shadow hover:scale-110 transition-transform"
                      onClick={handleQuery}
                      disabled={!userQuery || uploading || aiLoading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>
                    </button>
                  </div>
                  {queryResult && (
                    <div className="mt-5 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 rounded-xl p-5 shadow-lg text-white border border-blue-900/30">
                      <div className="font-semibold text-lg mb-1 flex items-center gap-2">
                        <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='2'><path d='M12 20v-6m0 0V4m0 10H4m8 0h8' /></svg>
                        Answer
                      </div>
                      <div className="text-base whitespace-pre-line leading-relaxed">{queryResult}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Show error if present */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-700 text-white px-6 py-3 rounded-xl shadow-xl font-semibold text-lg animate-pulse border-2 border-red-400">
          {error}
        </div>
      )}
      {/* Move Theme Toggle and Insights Below Dashboard */}
      <div className="flex flex-col gap-4 mt-8">
        {/* {renderThemeToggle()} -- Theme toggle removed as per user request */}
        {renderInsights()}
      </div>
      {showConfetti && <Confetti key={confettiKey} width={window.innerWidth} height={window.innerHeight} numberOfPieces={350} gravity={0.25} recycle={false} />}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 shadow-2xl max-w-lg w-full text-gray-900 relative animate-fadeIn">
            <button onClick={closeModal} className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <div className="text-lg font-semibold mb-3">Insight</div>
            <div className="text-base whitespace-pre-line">{modalContent}</div>
          </div>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95);} to { opacity: 1; transform: scale(1);} } .animate-fadeIn { animation: fadeIn 0.3s ease; }`}</style>
        </div>
      )}
    </div>
  );
}

export default DashboardApp;
