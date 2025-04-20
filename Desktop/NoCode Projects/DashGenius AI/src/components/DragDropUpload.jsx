import React, { useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";

export default function DragDropUpload({ onFileAccepted, uploading, error, theme }) {
  const inputRef = useRef();
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"]
    },
    multiple: false
  });

  // Remove dropzone background shade for a flat look
  const dropBg = "";

  return (
    <div {...getRootProps()} className={`upload-area border-2 border-dashed border-blue-200 rounded-2xl w-full h-full flex flex-col items-center justify-center transition-all duration-300 shadow-md ${dropBg}`} style={{minHeight:'180px', background:'none'}}>
      <input {...getInputProps()} ref={inputRef} />
      <div className="flex flex-col items-center justify-center">
        <i className="ri-upload-cloud-2-line text-4xl text-blue-400 mb-2"></i>
        <span className="font-semibold text-lg mb-2 text-blue-800 dark:text-blue-200 transition-colors">Drag & drop your file here</span>
        <span className="text-gray-500 dark:text-blue-300 text-sm mb-2 transition-colors">Supports .xlsx, .xls, .csv files</span>
        <button
          type="button"
          className="text-blue-300 underline text-sm focus:outline-none"
          onClick={() => inputRef.current && inputRef.current.click()}
        >
          Browse Files
        </button>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>
    </div>
  );
}
