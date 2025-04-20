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
        dynamicTyping: true, // Ensure numbers are parsed as numbers
        complete: (results) => {
          // Remove empty rows and trim whitespace from all fields
          const cleaned = results.data.filter(
            row => Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== "")
          ).map(row => {
            const newRow = {};
            for (const k in row) {
              if (typeof row[k] === 'string') newRow[k] = row[k].trim();
              else newRow[k] = row[k];
            }
            return newRow;
          });
          resolve(cleaned);
        },
        error: (err) => reject(err),
      });
    });
  } else if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(file.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    // Clean whitespace for Excel as well
    const cleaned = json.map(row => {
      const newRow = {};
      for (const k in row) {
        if (typeof row[k] === 'string') newRow[k] = row[k].trim();
        else newRow[k] = row[k];
      }
      return newRow;
    });
    return Promise.resolve(cleaned);
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
    // --- Output value optimization: round numbers, format large numbers, etc. ---
    if (aiResponse && aiResponse.keyMetrics) {
      aiResponse.keyMetrics = aiResponse.keyMetrics.map(kpi => ({
        ...kpi,
        value: typeof kpi.value === 'number' ? Number(kpi.value.toFixed(2)) : kpi.value,
        change: typeof kpi.change === 'number' ? Number(kpi.change.toFixed(2)) : kpi.change
      }));
    }
    if (aiResponse && aiResponse.visualizationRecommendations) {
      aiResponse.visualizationRecommendations = aiResponse.visualizationRecommendations.map(viz => {
        if (viz.config && viz.config.data && viz.config.data.datasets) {
          viz.config.data.datasets = viz.config.data.datasets.map(ds => ({
            ...ds,
            data: Array.isArray(ds.data)
              ? ds.data.map(v => (typeof v === 'number' ? Number(v.toFixed(2)) : v))
              : ds.data
          }));
        }
        return viz;
      });
    }
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
  let prompt = `You are DashGenius AI, an expert in data analysis and dashboard generation.\n`;
  prompt += `You will be given a tabular dataset. Your task is to:\n`;
  prompt += `1. Clean and format the data: Ensure all numeric and date fields are correctly typed, remove empty or malformed rows, and trim whitespace from all fields.\n`;
  prompt += `2. Analyze the data: Detect column types, relationships, time series, and calculate all relevant KPIs and metrics.\n`;
  prompt += `3. Generate insights: Draw all possible relevant insights, trends, anomalies, correlations, and actionable findings from the data.\n`;
  prompt += `4. Recommend visualizations: Suggest the most appropriate and advanced visualizations (with Chart.js config), covering all key aspects and breakdowns of the data.\n`;
  prompt += `5. Structure your response in the provided JSON function-call format only. Do not include any extra commentary or text.\n`;
  prompt += `\nReturn the following:\n`;
  prompt += `- columnTypes: mapping of column names to detected types\n`;
  prompt += `- relationships: detected relationships between columns\n`;
  prompt += `- timeSeries: columns that represent time series\n`;
  prompt += `- keyMetrics: all possible key metrics and KPIs\n`;
  prompt += `- visualizationRecommendations: advanced, relevant charts (Chart.js config)\n`;
  prompt += `- insights: as many actionable and deep insights as possible\n`;
  prompt += `- forecasting: (if applicable) time series analysis and forecasts\n`;
  prompt += `- daxSuggestions: (if applicable) PowerBI DAX queries and data model suggestions\n`;
  prompt += `- queryResponse: (if userQuery provided) answer the query with a visualization and explanation\n`;
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
