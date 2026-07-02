import React, { useRef } from "react";
import { Folder, Trash2, ArrowUpRight, Download, Upload, Calendar, Building2, CheckCircle2, AlertTriangle, Cloud, CloudLightning } from "lucide-react";
import { TaskType, CompanyInfo, GeneratedDocument } from "../types";
import { Task } from "./TaskBoard";

export interface FilingArchive {
  id: string;
  companyInfo: CompanyInfo;
  taskType: TaskType;
  createdAt: string;
  documents: GeneratedDocument[];
  detectedPlaceholders: { key: string; label: string }[];
  tasks: Task[];
}

interface ArchiveListProps {
  archives: FilingArchive[];
  onLoad: (archive: FilingArchive) => void;
  onDelete: (id: string) => void;
  onImport: (archive: FilingArchive) => void;
  isLoggedIn?: boolean;
}

export default function ArchiveList({ archives, onLoad, onDelete, onImport, isLoggedIn }: ArchiveListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTaskName = (type: TaskType) => {
    switch (type) {
      case "DIRECTOR_CHANGE":
        return "役員（取締役）の変更";
      case "ARTICLES_CHANGE":
        return "定款の変更（商号、目的、本店移転など）";
      case "BRANCH_CHANGE":
        return "支店の設置・移転・廃止";
      case "OTHER":
        return "その他の登記・自由指示";
    }
  };

  const exportArchive = (archive: FilingArchive) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(archive, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    const fileName = `商業登記申請原案_${archive.companyInfo.name || "未指定"}_${archive.createdAt.split("T")[0]}.json`;
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          // 簡易バリデーション
          if (parsed.id && parsed.documents && parsed.tasks) {
            onImport(parsed);
            alert("登記申請データを正常にインポートしました！");
          } else {
            alert("無効なファイルフォーマットです。本システムでエクスポートされたJSONファイルを選択してください。");
          }
        } catch (err) {
          alert("ファイルの解析に失敗しました。JSONファイルが破損している可能性があります。");
        }
      };
      reader.readAsText(file);
      e.target.value = ""; // リセット
    }
  };

  return (
    <div className="space-y-6">
      {/* 操作ヘッダー */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-slate-800 text-base">保存・アーカイブ管理</h3>
          <p className="text-xs text-slate-500">
            {isLoggedIn ? "アカウントのクラウドデータベース" : "ローカルブラウザ"}に安全に保存された商業登記の履歴を管理、インポート/エクスポート共有できます。
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold px-4 py-2 rounded-lg transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>JSONデータをインポート</span>
          </button>
        </div>
      </div>

      {/* クラウドバックアップの案内バナー */}
      {!isLoggedIn && (
        <div className="bg-indigo-50/70 border border-indigo-200/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CloudLightning className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-indigo-900">☁️ クラウド保存機能が利用可能です</p>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                上の「Googleでログイン」を行うと、作成した各種議事録・登記申請書類がクラウド上の安全なFirestoreデータベースに暗号化保存され、キャッシュクリアによる喪失を防ぎ、いつでも再読み込み可能になります。
              </p>
            </div>
          </div>
        </div>
      )}

      {archives.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-500 space-y-3">
          <Folder className="w-12 h-12 text-slate-300" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-700">保存された申請アーカイブはありません</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              書類生成タブで書類を生成し、「現在の内容でアーカイブに保存する」ボタンをクリックすると、ここに安全に記録されます。
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archives.map((archive) => {
            const completedCount = archive.tasks.filter((t) => t.status === "DONE").length;
            const progress = archive.tasks.length > 0 ? Math.round((completedCount / archive.tasks.length) * 100) : 0;

            return (
              <div
                key={archive.id}
                className="bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-xs transition-all rounded-xl p-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* ヘッダー情報 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full">
                        {getTaskName(archive.taskType)}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 pt-1">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {archive.companyInfo.name || "商号未指定"}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => exportArchive(archive)}
                        title="JSONファイルとして共有・エクスポート"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(archive.id)}
                        title="アーカイブを削除"
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 会社詳細 */}
                  <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5">
                    <p className="text-slate-600 flex justify-between">
                      <span className="text-slate-400">代表取締役:</span>
                      <span className="font-semibold text-slate-700">{archive.companyInfo.representative || "未入力"}</span>
                    </p>
                    <p className="text-slate-600 flex justify-between">
                      <span className="text-slate-400">本店所在地:</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={archive.companyInfo.address}>
                        {archive.companyInfo.address || "未入力"}
                      </span>
                    </p>
                  </div>

                  {/* タスク進捗 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500 font-semibold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        TODO進捗率
                      </span>
                      <span>{progress}% ({completedCount}/{archive.tasks.length}件)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* フッター */}
                <div className="border-t border-slate-100 mt-5 pt-3 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(archive.createdAt).toLocaleString("ja-JP")}
                  </span>

                  <button
                    onClick={() => onLoad(archive)}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
                  >
                    <span>この申請を読み込む</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* セキュリティ・プライバシーガイド */}
      <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600">
        <AlertTriangle className="w-5 h-5 shrink-0 text-indigo-500 mt-0.5" />
        <div className="space-y-1">
          {isLoggedIn ? (
            <>
              <p className="font-bold text-slate-700">☁️ クラウド高セキュアデータ同期について</p>
              <p className="leading-relaxed">
                ログイン中のGoogleアカウント専用の、厳密なセキュリティルールで保護されたGoogle Cloud Firestoreデータベースとの間で暗号化データ同期が行われています。
              </p>
              <p className="leading-relaxed">
                第三者があなたのデータにアクセスすることは技術的に不可能です。安心して各種議事録・登記申請書類の下書きを管理・復元してください。
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-slate-700">🔒 ローカル高セキュアデータ管理について</p>
              <p className="leading-relaxed">
                現在ログインされていないため、生成した議事録、申請書類のテキスト原案は、安全にローカルブラウザ内にのみ保存されています。
              </p>
              <p className="leading-relaxed">
                「JSONデータをエクスポート」することで、クラウドに頼ることなくオフラインでファイル共有が可能です。いつでも「Googleでログイン」してクラウドへの安全なバックアップを有効化できます。
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
