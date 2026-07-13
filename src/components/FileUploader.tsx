import React, { useRef } from "react";

interface FileUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
}

export default function FileUploader({ files, onChange }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files); // File オブジェクトそのまま
      onChange([...files, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      onChange([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer bg-slate-50 hover:bg-slate-100"
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
        onChange={handleFileChange}
      />

      <p className="text-sm text-slate-700">ファイルをアップロードしてください</p>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((file, idx) => (
            <li key={idx} className="flex justify-between items-center">
              <span>{file.name}</span>
              <button
                onClick={() => removeFile(idx)}
                className="text-red-600 text-xs"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
