export interface UploadedFile {
  name: string;
  type: string;
  base64: string; // inline data
  size: number;
  rawFile: File;   // ← 追加（10行目前後）
}

export interface CompanyInfo {
  name: string;
  address: string;
  representative: string;
}

export interface GeneratedDocument {
  id: string;
  title: string;
  content: string; // Markdown text
}

export interface DocPlaceholder {
  key: string;     // e.g., "[会社名]"
  label: string;   // e.g., "会社名"
  value: string;   // user input
}

export type TaskType = 'DIRECTOR_CHANGE' | 'ARTICLES_CHANGE' | 'BRANCH_CHANGE' | 'OTHER';

export interface GenerateRequest {
  files: { name: string; type: string; base64: string }[];
  taskType: TaskType;
  additionalPrompt?: string;
}

export interface GenerateResponse {
  success: boolean;
  companyInfo: CompanyInfo;
  documents: GeneratedDocument[];
  detectedPlaceholders: { key: string; label: string }[];
  error?: string;
}
