// src/aiService.js
// DashGenius AI – AI Analysis & Visualization Service
// Comprehensive documentation included for each function.

import axios from 'axios';

// ========== 1. OpenAI API Prompt Structure ==========

/**
 * Generates the optimal prompt for OpenAI API based on the provided data and user query.
 * @param {Object[]} jsonData - The data parsed from Excel/CSV (array of objects).
 * @param {string} [userQuery] - Optional natural language query from the user.
 * @returns {string} Prompt for OpenAI API.
 */
export function buildOpenAIPrompt(jsonData, userQuery = null) {
  const sampleRows = jsonData.slice(0, 10);
  const columns = Object.keys(sampleRows[0] || {});
  let prompt = `You are DashGenius AI, an expert data analyst and dashboard designer.\n`;
  prompt += `Given the following data (first 10 rows shown as JSON):\n`;
  prompt += `${JSON.stringify(sampleRows, null, 2)}\n`;
  prompt += `Columns: ${columns.join(', ')}\n`;
  prompt += `Analyze the data structure, detect types, relationships, time series, KPIs.\n`;
  prompt += `Recommend best visualizations, dashboard layout, and generate natural language insights.\n`;
  prompt += `Identify forecasting opportunities and suggest DAX queries for PowerBI.\n`;
  if (userQuery) {
    prompt += `\nUser query: "${userQuery}"\n`;
    prompt += `Answer the query and, if relevant, generate a suitable visualization config and text explanation.`;
  }
  prompt += `\nRespond in the specified JSON function-call format.`;
  return prompt;
}

// ========== 2. Function Calling Parameters ==========

/**
 * Returns the function calling structure for OpenAI API to get structured JSON responses.
 * @returns {Object} Function calling parameters.
 */
export function getOpenAIFunctionParams() {
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
          items: { type: 'string' }
        },
        visualizationRecommendations: {
          type: 'array',
          description: 'Recommended visualizations with config.',
          items: {
            type: 'object',
            properties: {
              chartType: { type: 'string' },
              columns: { type: 'array', items: { type: 'string' } },
              config: { type: 'object' },
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

// ========== 3. AI Analysis & Recommendation Core ==========

/**
 * Uploads file to backend and triggers AI analysis pipeline
 * @param {File} file - The uploaded file
 * @param {string} [userQuery] - Optional user query
 * @returns {Promise<Object>} AI response and preview rows
 */
export async function uploadAndAnalyzeFile(file, userQuery = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (userQuery) formData.append('userQuery', userQuery);
  const response = await axios.post('http://localhost:5001/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

// ========== 4. Chart.js Config Generation ==========

/**
 * Converts AI visualization recommendations into Chart.js config objects.
 * @param {Array} visualizationRecommendations - Array from AI response.
 * @returns {Array} Chart.js config objects with metadata.
 */
export function generateChartConfigs(visualizationRecommendations) {
  if (!Array.isArray(visualizationRecommendations)) return [];
  return visualizationRecommendations
    .filter(rec => rec && rec.config && rec.config.data) // Filter out invalid configs
    .map(rec => {
      const { chartType, columns, config, layout } = rec;
      return {
        type: chartType,
        data: config.data,
        options: { ...config.options, ...layout },
        columns
      };
    });
}

// ========== 5. Large Dataset Handling ==========

/**
 * Samples or summarizes large datasets for AI analysis.
 * @param {Object[]} jsonData - Full dataset.
 * @param {number} maxRows - Max rows to send to AI.
 * @returns {Object[]} Sampled or summarized data.
 */
export function sampleLargeDataset(jsonData, maxRows = 100) {
  if (jsonData.length > maxRows) {
    // Optionally, add summary stats here
    return jsonData.slice(0, maxRows);
  }
  return jsonData;
}

// ========== 6. Error Handling & Fallbacks ==========

/**
 * Handles errors and provides fallback recommendations.
 * @param {Error} error - The error object.
 * @returns {Object} Fallback response.
 */
export function getFallbackResponse(error) {
  return {
    columnTypes: {},
    relationships: [],
    timeSeries: [],
    keyMetrics: [],
    visualizationRecommendations: [],
    insights: [
      'AI analysis failed. Please check your data format or try again later.'
    ],
    forecasting: {},
    daxSuggestions: {},
    queryResponse: { answer: '', visualization: null, explanation: '' },
    error: error.message || 'Unknown error.'
  };
}

/**
 * Send a natural language query to the backend after upload
 * @param {string} userQuery
 * @returns {Promise<Object>} AI query response
 */
export async function sendQueryToBackend(userQuery) {
  const response = await axios.post('http://localhost:5001/query', { userQuery });
  return response.data;
}

/**
 * Example usage:
 *
 * import { uploadAndAnalyzeFile, generateChartConfigs, sampleLargeDataset } from './aiService';
 *
 * const file = await getFileFromUser();
 * const aiResult = await uploadAndAnalyzeFile(file);
 * const chartConfigs = generateChartConfigs(aiResult.visualizationRecommendations);
 */
