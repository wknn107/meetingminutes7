import React, { useState, useEffect } from "react";
import { Copy, Printer, Check, Edit2, Eye, HelpCircle, Save, Download } from "lucide-react";
import { GeneratedDocument, DocPlaceholder } from "../types";

interface DocEditorProps {
  documents: GeneratedDocument[];
  detectedPlaceholders: { key: string; label: string }[];
  onSaveDoc: (id: string, updatedContent: string) => void;
  onSaveAll: () => void;
}

export default function DocEditor({
  documents,
  detectedPlaceholders,
  onSaveDoc,
  onSaveAll,
}: DocEditorProps) {
  const [activeTab, setActiveTab] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editorText, setEditorText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [values, setValues] = useState<Record<string, string>>({});

  // プレースホルダーの初期化
  useEffect(() => {
    if (detectedPlaceholders.length > 0) {
      const initialValues: Record<string, string> = {};
      detectedPlaceholders.forEach((p) => {
        // すでに値がある場合は保持、なければ空文字か仮の値をセット
        initialValues[p.key] = values[p.key] || "";
      });
      setValues(initialValues);
    }
  }, [detectedPlaceholders]);

  // 初回ロード時やdocuments変更時にアクティブタブを設定
  useEffect(() => {
    if (documents.length > 0 && (!activeTab || !documents.some(d => d.id === activeTab))) {
      setActiveTab(documents[0].id);
    }
  }, [documents]);

  const activeDoc = documents.find((d) => d.id === activeTab);

  useEffect(() => {
    if (activeDoc) {
      setEditorText(activeDoc.content);
    }
  }, [activeDoc, activeTab]);

  const handleValueChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  // プレースホルダーを適用したテキストを取得
  const getProcessedContent = (rawText: string) => {
    let text = rawText;
    Object.entries(values).forEach(([key, val]) => {
      const valStr = String(val);
      if (valStr.trim() !== "") {
        // キーの特殊文字（[, ]など）をエスケープ
        const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(escapedKey, "g");
        text = text.replace(regex, `<span class="bg-indigo-100 text-indigo-900 px-1 font-semibold rounded">${valStr}</span>`);
      } else {
        const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(escapedKey, "g");
        text = text.replace(regex, `<span class="bg-amber-100 text-amber-900 border border-amber-300 px-1 font-bold rounded animate-pulse">${key}</span>`);
      }
    });
    return text;
  };

  const getPlainProcessedContent = (rawText: string) => {
    let text = rawText;
    Object.entries(values).forEach(([key, val]) => {
      const valStr = String(val);
      if (valStr.trim() !== "") {
        const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(escapedKey, "g");
        text = text.replace(regex, valStr);
      }
    });
    return text;
  };

  const handleCopy = () => {
    if (!activeDoc) return;
    const plainText = getPlainProcessedContent(editorText);
    navigator.clipboard.writeText(plainText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveDraft = () => {
    if (activeTab) {
      onSaveDoc(activeTab, editorText);
      setIsEditing(false);
    }
  };

  // 簡易Markdown HTMLパーサー（法務書類の箇条書き、表、太字を美しく装飾する）
  const renderMarkdown = (markdown: string) => {
    const processed = getProcessedContent(markdown);
    const lines = processed.split("\n");
    let inList = false;
    let inTable = false;
    let tableHeaders: string[] = [];
    let htmlLines: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();

      // テーブルの処理
      if (trimmed.startsWith("|")) {
        if (inList) {
          htmlLines.push("</ul>");
          inList = false;
        }
        
        // テーブルの区切り線「|---|---|」はスキップ
        if (trimmed.match(/^\|[\s-|-]*\|$/)) {
          return;
        }

        const cols = trimmed.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        
        if (!inTable) {
          inTable = true;
          htmlLines.push('<div class="overflow-x-auto my-4"><table class="min-w-full divide-y divide-slate-200 border border-slate-200 text-sm">');
          htmlLines.push('<thead class="bg-slate-50"><tr>');
          cols.forEach(col => {
            htmlLines.push(`<th class="px-4 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">${col}</th>`);
          });
          htmlLines.push('</tr></thead><tbody class="divide-y divide-slate-200 bg-white">');
        } else {
          htmlLines.push('<tr>');
          cols.forEach(col => {
            htmlLines.push(`<td class="px-4 py-2.5 text-slate-700">${col}</td>`);
          });
          htmlLines.push('</tr>');
        }
        return;
      } else if (inTable) {
        htmlLines.push('</tbody></table></div>');
        inTable = false;
      }

      // ヘッダーの処理
      if (trimmed.startsWith("### ")) {
        if (inList) { htmlLines.push("</ul>"); inList = false; }
        htmlLines.push(`<h4 class="text-base font-bold text-slate-800 mt-6 mb-2 border-l-4 border-indigo-500 pl-2">${trimmed.substring(4)}</h4>`);
      } else if (trimmed.startsWith("## ")) {
        if (inList) { htmlLines.push("</ul>"); inList = false; }
        htmlLines.push(`<h3 class="text-lg font-bold text-slate-800 mt-8 mb-3 pb-1 border-b border-slate-200">${trimmed.substring(3)}</h3>`);
      } else if (trimmed.startsWith("# ")) {
        if (inList) { htmlLines.push("</ul>"); inList = false; }
        htmlLines.push(`<h2 class="text-xl font-bold text-indigo-900 mt-10 mb-4 pb-2 border-b-2 border-indigo-100">${trimmed.substring(2)}</h2>`);
      }
      // 箇条書きの処理
      else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        if (!inList) {
          inList = true;
          htmlLines.push('<ul class="list-disc pl-6 space-y-1 my-3 text-slate-700">');
        }
        // 太字記法のパース
        let itemText = trimmed.substring(2);
        itemText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        htmlLines.push(`<li>${itemText}</li>`);
      } 
      // 空行の処理
      else if (trimmed === "") {
        if (inList) {
          htmlLines.push("</ul>");
          inList = false;
        }
        htmlLines.push('<div class="h-3"></div>');
      }
      // 一般テキストの処理
      else {
        if (inList) {
          htmlLines.push("</ul>");
          inList = false;
        }
        // 太字
        let parsedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        htmlLines.push(`<p class="text-slate-700 leading-relaxed my-1.5 min-h-[1.5rem]">${parsedLine}</p>`);
      }
    });

    if (inList) htmlLines.push("</ul>");
    if (inTable) htmlLines.push("</tbody></table></div>");

    return <div dangerouslySetInnerHTML={{ __html: htmlLines.join("") }} />;
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500">
        <HelpCircle className="w-12 h-12 text-slate-300 mb-2" />
        <p className="font-semibold text-slate-700">表示できる書類がありません</p>
        <p className="text-sm mt-1">
          左側の「資料インポート ＆ 生成」タブから、書類ファイルを送信してください。
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 左パネル: プレースホルダー一括入力 */}
      <div className="lg:col-span-4 space-y-4 no-print">
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 text-xs">1</span>
              <span>穴埋め項目の一括入力</span>
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
              {detectedPlaceholders.length} 件検出
            </span>
          </div>

          {detectedPlaceholders.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              自動検出された穴埋め項目はありません。
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {detectedPlaceholders.map((ph) => (
                <div key={ph.key} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    {ph.label}
                    <span className="text-slate-400 font-normal ml-1">({ph.key})</span>
                  </label>
                  <input
                    type="text"
                    value={values[ph.key] || ""}
                    onChange={(e) => handleValueChange(ph.key, e.target.value)}
                    placeholder={`${ph.label}を入力...`}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={onSaveAll}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2.5 rounded-lg transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              現在の内容でアーカイブに保存する
            </button>
          </div>
        </div>

        {/* ガイド */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs space-y-2 text-slate-600">
          <h4 className="font-semibold text-slate-800">💡 穴埋め機能の使い方</h4>
          <p className="leading-relaxed">
            入力したテキストは、右側の書類プレビュー内の対応する黄色のブラケット箇所に<strong>リアルタイムで同期・置換</strong>されます。
          </p>
          <p className="leading-relaxed">
            空欄（未入力）の項目は、黄色く点滅して目立ち、提出前の記入漏れを防ぎます。
          </p>
        </div>
      </div>

      {/* 右パネル: 書類プレビュー & Markdownエディタ */}
      <div className="lg:col-span-8 space-y-4">
        {/* 書類切り替えタブ */}
        <div className="flex items-center justify-between border-b border-slate-200 no-print">
          <div className="flex space-x-1">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  setActiveTab(doc.id);
                  setIsEditing(false);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 -mb-[2px] ${
                  activeTab === doc.id
                    ? "border-indigo-600 text-indigo-600 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {doc.title}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 pb-1.5">
            {isEditing ? (
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>直接編集</span>
              </button>
            )}
            
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-600 font-semibold">コピー済</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>コピー</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>印刷 / PDF保存</span>
            </button>
          </div>
        </div>

        {/* 印刷用のみに表示される書類ヘッダー */}
        <div className="hidden print:block mb-6 border-b pb-4 text-center">
          <h1 className="text-2xl font-bold">{activeDoc?.title}</h1>
          <p className="text-sm text-slate-500 mt-2">※ 本書類は「商業登記書類生成アシスタント」で自動起案された原案です。</p>
        </div>

        {/* 書類メインエリア */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs print-area min-h-[500px]">
          {isEditing ? (
            <div className="p-4 space-y-2 no-print">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 pb-2 mb-2">
                <span>Markdown形式で直接テキストを編集できます。</span>
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">編集モード</span>
              </div>
              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                rows={25}
                className="w-full font-mono text-xs p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 focus:bg-white resize-y"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    if (activeDoc) setEditorText(activeDoc.content);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 font-medium"
                >
                  編集を適用する
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 md:p-12 font-sans overflow-y-auto">
              {activeDoc ? (
                renderMarkdown(editorText)
              ) : (
                <div className="text-center text-slate-400 py-12">書類が読み込めません。</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
