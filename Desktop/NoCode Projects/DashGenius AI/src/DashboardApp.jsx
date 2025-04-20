import React, { useState, useEffect } from "react";
import { Loader, Card, KPI } from "./components/CommonUI";
import DragDropUpload from "./components/DragDropUpload";
import { parseFileToJson } from "./utils/parseFileToJson";
import { uploadAndAnalyzeFile } from "./aiService";
import KPICard from "./components/KPICard";
import ChartRenderer from "./components/ChartRenderer";
import { calculateNumericSums } from "./utils/calculateSums";

// Theme toggle hook
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  useEffect(() => {
    document.body.classList.remove("dark", "light");
    document.body.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);
  return [theme, setTheme];
}

function ThemeToggle({ theme, setTheme, outlineColor }) {
  return (
    <button
      className="ml-4 p-2 rounded-lg hover:bg-blue-900/20 transition"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <svg width="22" height="22" fill="none" stroke={outlineColor} strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 0112.21 3a7 7 0 100 14 9 9 0 009-4.21z" /></svg>
      ) : (
        <svg width="22" height="22" fill="none" stroke={outlineColor} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2m11-11h-2M3 12H1m16.95 6.95l-1.41-1.41M6.46 6.46L5.05 5.05m12.02 0l-1.41 1.41M6.46 17.54l-1.41 1.41" /></svg>
      )}
    </button>
  );
}

function DashboardApp() {
  const [theme, setTheme] = useTheme();
  const [step, setStep] = useState(1); // 1: upload, 2: preview, 3: dashboard
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [fullData, setFullData] = useState([]); // Store full data for dashboard creation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);

  // Animation state for fade-in
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(true);
    return () => setAnimate(false);
  }, [step]);

  // Helper: get background color based on theme
  const bgClass = theme === "light"
    ? "bg-white"
    : "bg-[#131b2a]";

  // Helper: get theme-based classes for text and boxes
  const textClass = theme === "light" ? "text-gray-900" : "text-[#e0e6ef]";
  const subTextClass = theme === "light" ? "text-gray-600" : "text-blue-200/90";
  const cardClass = theme === "light"
    ? "bg-white border border-gray-200 shadow"
    : "dashboard-card border border-[#232946] text-[#e0e6ef]";
  const tableHeadClass = theme === "light"
    ? "bg-gray-100 text-gray-800"
    : "bg-[#232c42] text-[#e0e6ef]";
  const tableCellClass = theme === "light" ? "text-gray-900" : "text-[#e0e6ef]";
  const tableBorderClass = theme === "light" ? "border-gray-200" : "border-[#232946]";
  const preBoxClass = theme === "light"
    ? "bg-gray-50 text-gray-900 border border-gray-200"
    : "bg-[#181f2e] text-[#e0e6ef] border border-[#232946]";

  // Animation utility classes
  const animatedCardClass = "animate-fadeInUp transition-all duration-700";

  // Custom color for logo background
  const logoBg = theme === "light" ? "bg-gradient-to-tr from-teal-600 via-teal-400 to-cyan-400" : "bg-gradient-to-tr from-teal-900 via-teal-700 to-cyan-600";
  // Remove header and card background shades for a cleaner look
  const headerBg = "";
  const cardBg = "";

  // Step 1: Handle file upload and preview
  const handleFileAccepted = async (uploadedFile) => {
    setError("");
    setFile(uploadedFile);
    setLoading(true);
    try {
      const rows = await parseFileToJson(uploadedFile);
      setPreviewRows(rows.slice(0, 20)); // Show only first 20 rows for preview
      setFullData(rows); // Store full data for dashboard creation
      setStep(2);
    } catch (err) {
      setError("Failed to parse file. Please upload a valid CSV or Excel file.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create dashboard from uploaded data
  const handleCreateDashboard = async () => {
    setLoading(true);
    setError("");
    console.log('[DEBUG] handleCreateDashboard called');
    try {
      // Calculate column sums for debugging (not shown to user)
      const sums = calculateNumericSums(fullData);
      console.log("[DEBUG] Column Sums from Uploaded Data:", sums);
      // Continue with dashboard creation
      const aiDashboard = await uploadAndAnalyzeFile(file, null, fullData);
      console.log("[DEBUG] AI Dashboard Response:", aiDashboard);
      console.log('[DEBUG] Raw AI Dashboard Response:', aiDashboard);
      if (!aiDashboard) {
        setError('AI backend returned no dashboard data.');
        console.error('[ERROR] AI backend returned no dashboard data.');
        setLoading(false);
        return;
      }
      setDashboard(aiDashboard);
      console.log('[DEBUG] setDashboard called with:', aiDashboard);
      setStep(3);
      console.log('[DEBUG] setStep(3) called');
    } catch (err) {
      setError("Failed to generate dashboard. Please try again.");
      console.error('[ERROR] handleCreateDashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tagline
  const tagline = (
    <div className={`text-xs tracking-widest ${subTextClass} font-bold mt-12 mb-2 text-center animate-fadeInUp`}
         style={{letterSpacing: '0.2em'}}>
      UNLOCK INSIGHTS. IGNITE GROWTH.
    </div>
  );

  // Render step 1: Upload
  if (step === 1) {
    return (
      <div className={`${bgClass} min-h-screen flex flex-col items-center justify-center px-2 pb-16 transition-all duration-700 ${animate ? "animate-fadeInUp" : ""}`}>
        <header className="flex flex-row items-center justify-between px-8 pt-8 w-full max-w-4xl mx-auto mb-4" style={{minHeight:'72px', alignItems:'center', display:'flex', background:'none'}}>
          <div className="flex items-center gap-2 text-xl font-bold h-full" style={{textAlign: 'left', alignItems:'center', display:'flex'}}>
            <span className={`${logoBg} rounded-lg px-2 py-1 text-white shadow-md flex items-center h-full`}>Dash</span>
            <span className="text-teal-500 font-bold flex items-center h-full">Genius</span>
            <span className="text-[#232946] dark:text-white flex items-center h-full">AI</span>
          </div>
          <div className="flex items-center justify-end h-full" style={{alignItems:'center', display:'flex'}}>
            <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <ThemeToggle theme={theme} setTheme={setTheme} outlineColor={theme === 'light' ? '#232946' : '#fff'} />
            </span>
          </div>
        </header>
        <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-2 sm:px-4 md:px-8 py-4 sm:py-8 items-center">
          {tagline}
          <h1 className={`text-4xl md:text-5xl font-extrabold text-center mb-4 leading-tight mt-6 animate-fadeInUp ${textClass}`}>Upload your data to generate a dashboard</h1>
          <p className={`text-lg max-w-2xl text-center mb-8 animate-fadeInUp ${subTextClass}`}>Start by uploading your spreadsheet or dataset. Supported formats: CSV, XLSX, XLS.</p>
          <div className="w-full animate-fadeInUp text-center flex justify-center">
            <div className={`rounded-2xl shadow-lg p-8 w-full max-w-xl ${cardBg}`} style={{minHeight:'220px', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <DragDropUpload onFileAccepted={handleFileAccepted} uploading={loading} error={error} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render step 2: Preview
  if (step === 2) {
    return (
      <div className={`${bgClass} min-h-screen flex flex-col items-center justify-center px-2 pb-16 transition-all duration-700 ${animate ? "animate-fadeInUp" : ""}`}>
        <header className="flex flex-row items-center justify-between px-8 pt-8 w-full max-w-4xl mx-auto mb-4" style={{minHeight:'72px', alignItems:'center', display:'flex', background:'none'}}>
          <div className="flex items-center gap-2 text-xl font-bold h-full" style={{textAlign: 'left', alignItems:'center', display:'flex'}}>
            <span className={`${logoBg} rounded-lg px-2 py-1 text-white shadow-md flex items-center h-full`}>Dash</span>
            <span className="text-teal-500 font-bold flex items-center h-full">Genius</span>
            <span className="text-[#232946] dark:text-white flex items-center h-full">AI</span>
          </div>
          <div className="flex items-center justify-end h-full" style={{alignItems:'center', display:'flex'}}>
            <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <ThemeToggle theme={theme} setTheme={setTheme} outlineColor={theme === 'light' ? '#232946' : '#fff'} />
            </span>
          </div>
        </header>
        <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-2 sm:px-4 md:px-8 py-4 sm:py-8 items-center">
          {tagline}
          <h2 className={`text-2xl font-bold mb-2 mt-6 animate-fadeInUp text-center ${textClass}`}>Preview your data</h2>
          <p className={`mb-4 animate-fadeInUp text-center ${subTextClass}`}>Below is a preview of your uploaded file: <span className="font-semibold text-blue-400">{file.name}</span></p>
          <div className="max-w-2xl w-full mx-auto animate-fadeInUp flex flex-col items-center">
            <Card className={`overflow-x-auto dashboard-card shadow-xl p-4 rounded-2xl ${cardBg}`} style={{minHeight:'180px', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <div className="font-semibold mb-2 text-base text-center">Preview Data</div>
              <table className="min-w-full border-collapse text-center text-xs">
                <thead>
                  <tr>
                    {previewRows[0] && Object.keys(previewRows[0]).map((col) => (
                      <th key={col} className={`px-2 py-1 border-b text-left font-bold uppercase tracking-wider text-center ${tableHeadClass} ${tableBorderClass}`}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 6).map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className={`px-2 py-1 border-b text-center ${tableCellClass} ${tableBorderClass}`}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 6 && <div className="text-xs text-blue-400 mt-2 text-center">Showing first 6 rows only</div>}
            </Card>
            <div className="flex justify-center mt-6 w-full">
              <button
                className="btn-primary px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-all hover:scale-105 bg-blue-600 text-white dark:bg-blue-400 dark:text-[#232946]"
                onClick={handleCreateDashboard}
                disabled={loading}
                style={{minWidth: '220px'}}
              >
                {loading ? "Crafting Dashboard..." : "Craft Dashboard"}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render step 3: Dashboard
  return (
    <div className={`${bgClass} min-h-screen flex flex-col items-center justify-center px-2 pb-16 transition-all duration-700 ${animate ? "animate-fadeInUp" : ""}`}>
      <header className="flex flex-row items-center justify-between px-8 pt-8 w-full max-w-4xl mx-auto mb-4" style={{minHeight:'72px', alignItems:'center', display:'flex', background:'none'}}>
        <div className="flex items-center gap-2 text-xl font-bold h-full" style={{textAlign: 'left', alignItems:'center', display:'flex'}}>
          <span className={`${logoBg} rounded-lg px-2 py-1 text-white shadow-md flex items-center h-full`}>Dash</span>
          <span className="text-teal-500 font-bold flex items-center h-full">Genius</span>
          <span className="text-[#232946] dark:text-white flex items-center h-full">AI</span>
        </div>
        <div className="flex items-center justify-end h-full" style={{alignItems:'center', display:'flex'}}>
          <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <ThemeToggle theme={theme} setTheme={setTheme} outlineColor={theme === 'light' ? '#232946' : '#fff'} />
          </span>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4 sm:py-8 items-center justify-center">
        {tagline}
        <h2 className={`text-2xl font-bold mb-2 mt-10 animate-fadeInUp text-center ${textClass}`}>Your Dashboard & Insights</h2>
        <p className={`mb-6 animate-fadeInUp text-center ${subTextClass}`}>Below is your automatically generated dashboard and insights based on <span className="font-semibold text-blue-400">{file.name}</span></p>
        {loading && <Loader />}
        {step === 3 && dashboard ? (
          <div className="w-full flex flex-col gap-8 dashboard-fade visible">
            {/* KPI Cards */}
            {dashboard.ai.keyMetrics && (
              <div className="grid w-full gap-8 mb-10 items-center justify-center"
                   style={{
                     display: 'grid',
                     gridTemplateColumns: `repeat(${Math.min(dashboard.ai.keyMetrics.length, 4)}, 1fr)`,
                     gridAutoRows: '1fr',
                     width: '100%',
                     justifyItems: 'center',
                     alignItems: 'center'
                   }}>
                {dashboard.ai.keyMetrics.map((kpi, idx) => (
                  <KPICard
                    key={idx}
                    title={kpi.title}
                    value={kpi.value}
                    change={kpi.change}
                    changeLabel={kpi.changeLabel}
                    className={`kpi-card shadow-2xl p-8 rounded-2xl ${cardClass} ${animatedCardClass}`}
                  />
                ))}
              </div>
            )}
            {/* Charts */}
            {dashboard.ai.visualizationRecommendations && dashboard.ai.visualizationRecommendations.length > 0 && (
              <div className="flex flex-wrap gap-8 mb-10 w-full items-stretch justify-center">
                {dashboard.ai.visualizationRecommendations.map((viz, idx) => {
                  console.log('[DEBUG] Rendering Chart', viz);
                  console.log('[DEBUG] Chart Config:', viz.config);
                  return (
                    <Card key={idx} className={`dashboard-card shadow-2xl p-8 rounded-2xl flex flex-col justify-between items-center ${cardClass} ${animatedCardClass}`}> 
                      <div className="font-semibold mb-2 text-lg flex items-center gap-2 text-center justify-center w-full">
                        <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 animate-pulse"></span>
                        {viz.config?.options?.plugins?.title?.display && viz.config?.options?.plugins?.title?.text
                          ? viz.config.options.plugins.title.text
                          : viz.chartType?.charAt(0).toUpperCase() + viz.chartType?.slice(1) + " Chart"}
                      </div>
                      <ChartRenderer config={viz.config} className="w-full h-full" />
                    </Card>
                  );
                })}
              </div>
            )}
            {/* Insights */}
            {dashboard.ai.insights && dashboard.ai.insights.length > 0 && (
              <Card className={`dashboard-card shadow-xl p-8 rounded-2xl mb-10 items-center ${cardBg} ${animatedCardClass}`}>
                <div className="font-semibold mb-4 text-lg text-left w-full">AI Insights</div>
                <ul className="list-disc pl-8 text-base space-y-2 text-left w-full">
                  {dashboard.ai.insights.map((insight, idx) => (
                    <li key={idx} className="leading-relaxed text-left w-full">{insight}</li>
                  ))}
                </ul>
              </Card>
            )}
            {/* Preview Table */}
            {dashboard.previewRows && dashboard.previewRows.length > 0 && (
              <Card className={`overflow-x-auto dashboard-card shadow-xl p-8 rounded-2xl items-center ${cardBg} ${animatedCardClass}`} style={{minHeight:'180px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <div className="font-semibold mb-4 text-lg text-center w-full">Preview Data</div>
                <table className="min-w-full border-collapse text-center w-full">
                  <thead>
                    <tr>
                      {Object.keys(dashboard.previewRows[0]).map((col) => (
                        <th key={col} className={`px-3 py-2 text-xs border-b text-left font-bold uppercase tracking-wider text-center w-full ${tableHeadClass} ${tableBorderClass}`}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.previewRows.slice(0, 6).map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 w-full">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className={`px-3 py-2 text-xs border-b text-center w-full ${tableCellClass} ${tableBorderClass}`}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dashboard.previewRows.length > 6 && <div className="text-xs text-blue-400 mt-2 text-center">Showing first 6 rows only</div>}
              </Card>
            )}
          </div>
        ) : step === 3 && !dashboard ? (
          <div className="text-red-400 text-sm mb-2 animate-fadeInUp text-center w-full">
            [ERROR] Dashboard state is not set. Please check backend response and console logs.
          </div>
        ) : null}
        {error && <div className="text-red-400 text-sm mb-2 animate-fadeInUp text-center w-full">{error}</div>}
      </main>
    </div>
  );
}

export default DashboardApp;
