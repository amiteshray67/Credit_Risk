// Express backend for DashGenius AI
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(fileUpload());

// Utility: Parse uploaded file to JSON
function parseFileToJson(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file.data.toString(), {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      });
    });
  } else if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(file.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    return Promise.resolve(json);
  } else {
    return Promise.reject(new Error('Unsupported file type.'));
  }
}

// Store last uploaded data in memory for /query endpoint
let lastUploadedData = null;

// POST /upload - Handles file upload and AI pipeline
app.post('/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const file = req.files.file;
    // 1. Parse file to JSON
    const jsonData = await parseFileToJson(file);
    lastUploadedData = jsonData; // Store for future queries
    // 2. Analyze with OpenAI
    const aiResponse = await analyzeWithAI(jsonData, req.body.userQuery || null);
    // 3. Return AI response
    res.json({ ai: aiResponse, previewRows: jsonData.slice(0, 5) });
  } catch (err) {
    console.error('UPLOAD ERROR:', err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      details: err,
    });
  }
});

// POST /query - Natural language queries after upload
app.post('/query', async (req, res) => {
  try {
    if (!lastUploadedData) {
      return res.status(400).json({ error: 'No data uploaded yet. Please upload a file first.' });
    }
    const userQuery = req.body.userQuery;
    if (!userQuery) {
      return res.status(400).json({ error: 'No user query provided.' });
    }
    // Only send the query to OpenAI, reusing the last uploaded data
    const aiResponse = await analyzeWithAI(lastUploadedData, userQuery);
    res.json({ queryResponse: aiResponse.queryResponse });
  } catch (err) {
    console.error('QUERY ERROR:', err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      details: err,
    });
  }
});

// AI Analysis Pipeline
async function analyzeWithAI(jsonData, userQuery = null) {
  // PROMPT ENGINEERING
  // See detailed explanation below
  const prompt = buildOpenAIPrompt(jsonData, userQuery);
  const functionParams = getOpenAIFunctionParams();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file.');
  }
  let response;
  try {
    response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo', // Switch to GPT-4 Turbo for better structured output
        messages: [
          { role: 'system', content: 'You are DashGenius AI, a data analysis and dashboard expert.' },
          { role: 'user', content: prompt }
        ],
        functions: [functionParams],
        function_call: { name: 'analyze_and_recommend' },
        temperature: 0.2,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    if (err.response) {
      // OpenAI API error
      throw new Error(`OpenAI API Error: ${err.response.status} ${err.response.statusText} - ${JSON.stringify(err.response.data)}`);
    } else if (err.request) {
      // No response received
      throw new Error('No response received from OpenAI API. Check your network connection.');
    } else {
      // Other error
      throw err;
    }
  }
  try {
    return JSON.parse(response.data.choices[0].message.function_call.arguments);
  } catch (parseErr) {
    throw new Error('Failed to parse OpenAI response: ' + parseErr.message + '\nRaw response: ' + JSON.stringify(response.data));
  }
}

// PROMPT ENGINEERING
function buildOpenAIPrompt(jsonData, userQuery = null) {
  const sampleRows = jsonData.slice(0, 10);
  const columns = Object.keys(sampleRows[0] || {});
  let prompt = `You are DashGenius AI, an elite data analyst and dashboard designer.\n`;
  prompt += `The user has uploaded a spreadsheet. Your job is to deeply analyze this data and generate a dashboard and data preview that are visually stunning, interactive, and tailored to the user's actual data.\n`;
  prompt += `First, create a modern, beautiful data preview table with the following features:\n`;
  prompt += `- Show the first 10 rows and all columns.\n`;
  prompt += `- Use pill-style status indicators for categorical/status columns (e.g., Completed, In Progress).\n`;
  prompt += `- Show avatars or initials for any columns that look like names or people.\n`;
  prompt += `- Use color-coded highlights for important values (e.g., overdue dates, negative numbers, high/low values).\n`;
  prompt += `- The table should be scrollable and sortable by columns.\n`;
  prompt += `- The preview must look visually similar to top SaaS dashboards (see Notion, Airtable, Linear, etc.).\n`;
  prompt += `Data preview (JSON, first 10 rows):\n${JSON.stringify(sampleRows, null, 2)}\n`;
  prompt += `Columns: ${columns.join(', ')}\n`;
  prompt += `Next, generate a dashboard with these requirements:\n`;
  prompt += `1. Analyze column types, relationships, time series, and KPIs.\n`;
  prompt += `2. Recommend the most relevant, visually engaging dashboard layout for THIS data.\n`;
  prompt += `3. For each chart or KPI, specify type, axes, groupings, and breakdowns that best represent the user's data.\n`;
  prompt += `4. Use a layout and style that matches this UI: dark theme, glassmorphic cards, modern KPIs, interactive charts, clear legends, and a responsive, visually appealing layout.\n`;
  prompt += `5. All visualizations and KPIs must be about the uploaded data and its actual columns and values.\n`;
  prompt += `6. Generate concise, user-friendly insights and summaries.\n`;
  prompt += `7. If there are opportunities for forecasting, anomaly detection, or PowerBI DAX queries, include them.\n`;
  prompt += `8. The dashboard should only be generated after the user clicks the 'Craft Dashboard' button.\n`;
  prompt += `9. For each visualization, ensure you return a valid Chart.js configuration object ('config') with a 'data' property (labels, datasets) and an 'options' property. Do NOT use 'xAxes' or 'yAxes' in the options; use 'scales' with 'x' and 'y' keys as per Chart.js v3+. Only return visualizations that are fully specified and mappable to Chart.js.\n`;
  prompt += `10. If you return multiple visualizations, they must be arranged together in a cohesive dashboard layout (not as separate, individual charts).\n`;
  prompt += `11. Respond in a single, well-structured JSON function-call format that includes:\n`;
  prompt += `   - The enhanced data preview (with metadata for pills, avatars, highlights, etc.)\n`;
  prompt += `   - The dashboard layout, KPIs, charts, and insights, all mapped to the user's data\n`;
  prompt += `   - Any additional recommendations or smart features\n`;
  prompt += `   - Do NOT include any generic content, only what is relevant to the user's file\n`;
  prompt += `For keyMetrics, return an array of objects, each with at least: { title, value, change, changeLabel }. Example: [{ title: 'Total Sales', value: 12345, change: 5.2, changeLabel: 'vs last month' }]\n`;
  prompt += `For visualizationRecommendations, each item must have a valid Chart.js config object with a 'data' and 'options' property. Do NOT return configs missing these fields.\n`;
  if (userQuery) {
    prompt += `\nUser query: "${userQuery}"\n`;
    prompt += `Answer the query and, if relevant, generate a suitable visualization config and text explanation. Ensure the response is specific to the user's data and query.`;
  }
  prompt += `\nRespond ONLY in the specified JSON function-call format. Do not include any extra commentary or text.`;
  return prompt;
}

function getOpenAIFunctionParams() {
  return {
    name: 'analyze_and_recommend',
    description: 'Analyze tabular data, recommend visualizations, and generate insights.',
    parameters: {
      type: 'object',
      properties: {
        columnTypes: {
          type: 'object',
          description: 'Mapping of column names to detected data types.'
        },
        relationships: {
          type: 'array',
          description: 'Detected relationships between columns.',
          items: { type: 'string' }
        },
        timeSeries: {
          type: 'array',
          description: 'Columns identified as time series.',
          items: { type: 'string' }
        },
        keyMetrics: {
          type: 'array',
          description: 'Key metrics and KPIs.',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              value: { type: 'number' },
              change: { type: 'number' },
              changeLabel: { type: 'string' }
            }
          }
        },
        visualizationRecommendations: {
          type: 'array',
          description: 'Recommended visualizations with config.',
          items: {
            type: 'object',
            properties: {
              chartType: { type: 'string' },
              columns: { type: 'array', items: { type: 'string' } },
              config: {
                type: 'object',
                properties: {
                  data: { type: 'object' },
                  options: { type: 'object' }
                }
              },
              layout: { type: 'object' }
            }
          }
        },
        insights: {
          type: 'array',
          description: 'Natural language insights about the data.',
          items: { type: 'string' }
        },
        forecasting: {
          type: 'object',
          description: 'Forecasting opportunities and time series analysis.',
          properties: {
            forecastColumns: { type: 'array', items: { type: 'string' } },
            seasonality: { type: 'string' },
            trend: { type: 'string' }
          }
        },
        daxSuggestions: {
          type: 'object',
          description: 'PowerBI DAX queries and data model suggestions.',
          properties: {
            measures: { type: 'array', items: { type: 'string' } },
            dataModel: { type: 'string' },
            visualSettings: { type: 'string' }
          }
        },
        queryResponse: {
          type: 'object',
          description: 'Results for user natural language queries.',
          properties: {
            answer: { type: 'string' },
            visualization: { type: 'object' },
            explanation: { type: 'string' }
          }
        }
      },
      required: ['columnTypes', 'relationships', 'keyMetrics', 'visualizationRecommendations', 'insights']
    }
  };
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`DashGenius AI backend running on port ${PORT}`));
