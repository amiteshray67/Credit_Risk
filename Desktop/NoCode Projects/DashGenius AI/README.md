/*
README: DashGenius AI
=====================

DashGenius AI is a no-code, AI-powered dashboard generator. Upload Excel/CSV files, analyze them with AI, and generate interactive dashboards and insights. Export dashboards to PowerBI.

---

## Features
- Upload Excel/CSV data
- AI analyzes data: types, relationships, KPIs, time series
- Auto-generated visualizations (Chart.js)
- Natural language insights and query support
- Forecasting opportunities
- Export PowerBI DAX queries and data model
- Modern UI with Tailwind CSS

---

## Getting Started

1. **Install dependencies**
   ```
   npm install
   ```
2. **Set your OpenAI API Key**
   - Create a `.env` file in the project root:
     ```
     REACT_APP_OPENAI_API_KEY=your-openai-key-here
     ```
3. **Run the app**
   ```
   npm start
   ```
4. **Usage**
   - Upload a CSV/Excel file.
   - Wait for AI analysis and dashboard generation.
   - Ask questions about your data in natural language.
   - Export PowerBI DAX queries.

---

## File Structure
- `src/DashboardApp.jsx`: Main app logic and UI
- `src/utils/parseFileToJson.js`: Excel/CSV to JSON
- `aiService.js`: AI analysis and Chart.js config
- `public/index.html`: HTML entry
- `src/index.js`: React entry
- `src/index.css`: Tailwind CSS import

---

## PowerBI Export
- Exports DAX queries and data model as JSON (for demo)
- For full PBIX export, use PowerBI Desktop to import DAX/data model

---

## Customization
- Extend `aiService.js` for custom prompts or models
- Style with Tailwind in `index.css` or components

---

## Support
- For issues or feature requests, contact the developer.
*/
