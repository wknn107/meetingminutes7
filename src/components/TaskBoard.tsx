import React, { useState } from "react";
import { CheckSquare, Square, Plus, Trash2, Edit2, Share2, FileText, CheckCircle, Clock, AlertCircle, Copy, Check } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  category: "PREPARATION" | "DOCUMENTATION" | "SIGNING" | "SUBMISSION";
  assignee: string;
  dueDate: string;
  status: "TODO" | "DONE";
  isAIRecommended?: boolean;
  notes?: string;
}

interface TaskBoardProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
}

const CATEGORIES = {
  PREPARATION: { label: "1. 事前準備", color: "bg-amber-50 text-amber-700 border-amber-100" },
  DOCUMENTATION: { label: "2. 書類作成・内容確認", color: "bg-blue-50 text-blue-700 border-blue-100" },
  SIGNING: { label: "3. 決議・実印押印", color: "bg-purple-50 text-purple-700 border-purple-100" },
  SUBMISSION: { label: "4. 法務局申請・事後処理", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
};

export default function TaskBoard({ tasks, onTasksChange }: TaskBoardProps) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);

  // 新規タスクフォームの状態
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<keyof typeof CATEGORIES>("PREPARATION");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const toggleTaskStatus = (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, status: t.status === "TODO" ? "DONE" : "TODO" as "TODO" | "DONE" };
      }
      return t;
    });
    onTasksChange(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: "task-" + Date.now(),
      title: newTitle,
      category: newCategory,
      assignee: newAssignee || "担当者未指定",
      dueDate: newDueDate || "[期限日]",
      status: "TODO",
      isAIRecommended: false,
      notes: newNotes,
    };

    onTasksChange([...tasks, newTask]);
    setNewTitle("");
    setNewAssignee("");
    setNewDueDate("");
    setNewNotes("");
    setShowAddForm(false);
  };

  const handleDeleteTask = (id: string) => {
    if (confirm("このタスクを削除してもよろしいですか？")) {
      onTasksChange(tasks.filter((t) => t.id !== id));
    }
  };

  // 進捗率の計算
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 共有用テキスト（Markdown形式）のコピー
  const handleShare = () => {
    let text = `📋 【商業登記申請スケジュール＆進捗】\n`;
    text += `現在の進捗率: ${progressPercent}% (${completedTasks}/${totalTasks}件完了)\n\n`;

    Object.entries(CATEGORIES).forEach(([catKey, catVal]) => {
      const catTasks = tasks.filter((t) => t.category === catKey);
      if (catTasks.length === 0) return;

      text += `■ ${catVal.label}\n`;
      catTasks.forEach((t) => {
        const check = t.status === "DONE" ? "[x] 完了" : "[ ] 未完了";
        text += `  - ${check} | ${t.title} (担当: ${t.assignee}, 期限: ${t.dueDate})\n`;
        if (t.notes) text += `    ※補足: ${t.notes}\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredTasks = filterCategory === "ALL" ? tasks : tasks.filter((t) => t.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* 上部サマリー */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="font-bold text-slate-800 text-base">登記申請 TODO リスト</h3>
          <p className="text-xs text-slate-500">
            登記完了までに必要な法務タスクです。チェックを付けると進捗率に反映されます。
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
          <div className="flex-1 md:flex-none">
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span>進捗ステータス</span>
              <span>{progressPercent}% ({completedTasks}/{totalTasks})</span>
            </div>
            <div className="w-full md:w-48 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-lg font-medium transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-semibold">進捗をコピー済</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>社内共有用にコピー</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* フィルタ & タスク追加ボタン */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filterCategory === "ALL"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            すべて表示 ({tasks.length})
          </button>
          {Object.entries(CATEGORIES).map(([key, value]) => {
            const count = tasks.filter((t) => t.category === key).length;
            return (
              <button
                key={key}
                onClick={() => setFilterCategory(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filterCategory === key
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {value.label.split(" ")[1]} ({count})
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>新規タスクを追加</span>
        </button>
      </div>

      {/* タスク追加フォーム */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-fadeIn">
          <h4 className="font-bold text-slate-800 text-sm">手動タスクの新規追加</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">タスク内容 *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例: 代表取締役の住民票を取得する"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">タスクカテゴリ</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as keyof typeof CATEGORIES)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white h-[34px]"
              >
                {Object.entries(CATEGORIES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600">担当者 / 期限</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  placeholder="担当者"
                  className="w-1/2 text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
                <input
                  type="text"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  placeholder="期限（例: 7/15）"
                  className="w-1/2 text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">詳細・メモ（任意）</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="役所の手続き方法や必要な持ち物など..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border border-slate-200 text-xs text-slate-600 rounded-lg bg-white hover:bg-slate-50 font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-semibold shadow-sm"
            >
              作成
            </button>
          </div>
        </form>
      )}

      {/* タスクリスト */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            表示条件に合うタスクはありません。
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task) => {
              const catInfo = CATEGORIES[task.category];
              return (
                <div
                  key={task.id}
                  className={`flex items-start md:items-center justify-between p-4 transition-colors ${
                    task.status === "DONE" ? "bg-slate-50/50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => toggleTaskStatus(task.id)}
                      className="mt-0.5 md:mt-0 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                    >
                      {task.status === "DONE" ? (
                        <CheckCircle className="w-5 h-5 text-indigo-600 fill-indigo-100" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catInfo.color}`}>
                          {catInfo.label.split(" ")[1]}
                        </span>
                        {task.isAIRecommended && (
                          <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            AI推薦
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-400">
                          担当: <span className="text-slate-600">{task.assignee}</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          期限: <span className="text-slate-600">{task.dueDate}</span>
                        </span>
                      </div>

                      <p className={`text-sm font-semibold text-slate-800 leading-normal ${task.status === "DONE" ? "line-through text-slate-400" : ""}`}>
                        {task.title}
                      </p>

                      {task.notes && (
                        <p className={`text-xs text-slate-500 leading-relaxed ${task.status === "DONE" ? "text-slate-400" : ""}`}>
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors shrink-0 self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
