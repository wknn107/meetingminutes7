import React, { useRef, useState } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { UploadedFile } from "../types";

interface FileUploaderProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
}

export default function FileUploader({ files, onChange }: FileUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList) => {
    const promises = Array.from(fileList).map((file) => {
      return new Promise<UploadedFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            base64: reader.result as string,
            size: file.size,
            rawFile: file,   // ← ★これが絶対に必要！
          });
        };
        reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました。"));
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises)
      .then((newFiles) => {
        onChange([...files, ...newFiles]);
      })
      .catch((err) => {
        console.error(err);
        alert(err.message || "ファイルの読み込み中にエラーが発生しました。");
      });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* ここから下はあなたの元のコードと同じ */}
      <div
        id="file-dropzone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-indigo-600 bg-indigo-50"
            : "border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className={`w-10 h-10 ${isDragActive ? "text-indigo-600 animate-bounce" : "text-slate-400"}`} />
          <p className="font-medium text-slate-800 text-sm">
            ファイルをドラッグ＆ドロップするか、<span className="text-indigo-600">クリックしてアップロード</span>
          </p>
          <p className="text-xs text-slate-500">
            PDF、Word、画像（スキャンPNG/JPG）、テキスト対応 (最大 10MB)
          </p>
        </div>
      </div>

      {/* 以下略（あなたの元のコードと同じ） */}
      {files.length > 0 && (
        <div className="space-y-2">
          {/* ... */}
        </div>
      )}

      <div className="flex items-start space-x-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-indigo-900 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
        <div>
          <p className="font-semibold text-indigo-800">高精度スキャン文字認識 (OCR)</p>
          <p className="text-indigo-700 leading-relaxed">
            文字コピーができない画像化されたPDFやスキャン写真であっても、Gemini 3.5 Flashが資料内の文字や数値、表情報を一言一句正確に読み取ります。
          </p>
        </div>
      </div>
    </div>
  );
}
