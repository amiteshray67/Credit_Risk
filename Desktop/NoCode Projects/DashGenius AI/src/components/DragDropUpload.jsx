import React, { useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";

export default function DragDropUpload({ onFileAccepted, uploading, error }) {
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
  return (
    <div {...getRootProps()} className={`upload-area flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${isDragActive ? "bg-blue-50 border-blue-400" : "bg-gray-900 border-blue-300"}`} style={{ minHeight: 180 }}>
      <input {...getInputProps()} ref={inputRef} />
      <div className="flex flex-col items-center">
        <i className="ri-upload-cloud-2-line text-4xl text-blue-400 mb-2"></i>
        <span className="font-semibold text-lg mb-2">Drag & drop your file here</span>
        <span className="text-gray-400 text-sm mb-2">Supports .xlsx, .xls, .csv files</span>
        <button
          type="button"
          className="btn-primary px-6 py-2 rounded text-white font-semibold mt-2"
          onClick={e => {
            e.stopPropagation();
            inputRef.current.click();
          }}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Browse Files"}
        </button>
      </div>
      {error && <div className="text-red-500 mt-3">{error}</div>}
    </div>
  );
}
