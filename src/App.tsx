import React, { useState, useEffect } from "react";
import {
  Scale,
  FileSpreadsheet,
  CheckSquare,
  Archive,
  ArrowRight,
  Sparkles,
  Info,
  Loader2,
  AlertCircle,
  HelpCircle,
  Building,
  CheckSquare2,
  ListTodo,
  LogIn,
  LogOut,
  Cloud,
  CloudLightning,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UploadedFile, CompanyInfo, GeneratedDocument, TaskType } from "./types";
import FileUploader from "./components/FileUploader";
import DocEditor from "./components/DocEditor";
import TaskBoard, { Task } from "./components/TaskBoard";
import ArchiveList, { FilingArchive } from "./components/ArchiveList";

// Firebase Integration imports
import { auth, db, testConnection, handleFirestoreError, OperationType } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, doc, setDoc, getDocs, deleteDoc, query } from "firebase/firestore";

export default function App() {
  const [activeTab, setActiveTab] = useState<"generate" | "editor" | "todo" | "archive">("generate");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [taskType, setTaskType] = useState<TaskType>("DIRECTOR_CHANGE");
  const [additionalPrompt, setAdditionalPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ドキュメントと情報
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "",
    address: "",
    representative: "",
  });
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<{ key: string; label: string }[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // 保存アーカイブ
  const [archives, setArchives] = useState<FilingArchive[]>([]);

  // Firebase auth & sync states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Connection Test on startup
  useEffect(() => {
    testConnection();
  }, []);

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Create/Update user profile document in Firestore
        const userRef = doc(db, "users", currentUser.uid);
        try {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error("Failed to save user profile:", err);
        }

        // Fetch archives from Firestore
        await loadArchivesFromFirestore(currentUser.uid);
      } else {
        // Load from localStorage if not signed in
        const saved = localStorage.getItem("commercial_registry_archives");
        if (saved) {
          try {
            setArchives(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to load archives:", e);
          }
        } else {
          setArchives([]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Load archives from Firestore
  const loadArchivesFromFirestore = async (userId: string) => {
    setSyncing(true);
    const path = `users/${userId}/archives`;
    try {
      const q = query(collection(db, path));
      const querySnapshot = await getDocs(q);
      const fetched: FilingArchive[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push(doc.data() as FilingArchive);
      });
      // Sort by createdAt descending
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setArchives(fetched);
    } catch (err) {
      console.error("Failed to load archives from Firestore:", err);
      handleFirestoreError(err, OperationType.LIST, path);
    } finally {
      setSyncing(false);
    }
  };

  // Google Sign In with auto-sync prompt for existing local archives
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unknown error");
       }

      const localSaved = localStorage.getItem("commercial_registry_archives");
      if (localSaved) {
        const localArchives: FilingArchive[] = JSON.parse(localSaved);
        if (localArchives.length > 0 && confirm(`ローカルに保存されている${localArchives.length}件のデータをクラウド（アカウント）へバックアップ・同期しますか？`)) {
          setSyncing(true);
          for (const arc of localArchives) {
            const path = `users/${result.user.uid}/archives`;
            try {
              await setDoc(doc(db, path, arc.id), arc);
            } catch (err) {
              console.error(`Failed to sync archive ${arc.id}:`, err);
              handleFirestoreError(err, OperationType.CREATE, `${path}/${arc.id}`);
            }
          }
          localStorage.removeItem("commercial_registry_archives");
          alert("ローカルのデータをアカウントへ同期しました。");
          await loadArchivesFromFirestore(result.user.uid);
        }
      }
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setError("ログインに失敗しました: " + err.message);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setArchives([]);
      alert("ログアウトしました。ローカル保存のデータを表示します。");
    } catch (err: any) {
      console.error("Sign out failed:", err);
    }
  };

  // 登記種類に応じたデフォルト推奨タスクの生成
  const getRecommendedTasks = (type: TaskType, compName: string): Task[] => {
    const compLabel = compName || "自社";
    const baseTasks: Task[] = [];

    if (type === "DIRECTOR_CHANGE") {
      return [
        {
          id: "rec-1",
          title: `${compLabel}の新役員の就任承諾書および辞任届の手配・回収`,
          category: "PREPARATION",
          assignee: "法務担当 / 代表取締役",
          dueDate: "登記決議日の3日前まで",
          status: "TODO",
          isAIRecommended: true,
          notes: "新しく就任する取締役の就任承諾書と、辞任する役員がいる場合は辞任届。実印押印および印鑑証明書が必要です。"
        },
        {
          id: "rec-2",
          title: "新しく就任する取締役の住民票（または個人印鑑証明書）の取得",
          category: "PREPARATION",
          assignee: "新任取締役",
          dueDate: "登記決議日まで",
          status: "TODO",
          isAIRecommended: true,
          notes: "選任決議時に添付、または申請時に必要。発行後3ヶ月以内のものを用意します。"
        },
        {
          id: "rec-3",
          title: "臨時株主総会（または取締役会）の開催および選任・就任決議",
          category: "SIGNING",
          assignee: "株主総会議長 / 代表取締役",
          dueDate: "[総会開催日]",
          status: "TODO",
          isAIRecommended: true,
          notes: "実際に会議を開催し、決議を行います。本日作成した「議事録案」をベースに決議を記録します。"
        },
        {
          id: "rec-4",
          title: "総会議事録（または取締役会議事録）への出席役員・株主の実印押印",
          category: "SIGNING",
          assignee: "出席取締役 / 出席株主",
          dueDate: "決議後3日以内",
          status: "TODO",
          isAIRecommended: true,
          notes: "議事録へ実印による押印、または会社実印を押印して、書類の正本を完成させます。"
        },
        {
          id: "rec-5",
          title: "変更登記申請書および委任状への会社実印（代表者印）の押印",
          category: "DOCUMENTATION",
          assignee: "代表取締役",
          dueDate: "申請前日まで",
          status: "TODO",
          isAIRecommended: true,
          notes: "申請書、および代理申請の場合は司法書士への委任状に、法務局登録済みの会社実印を押印します。"
        },
        {
          id: "rec-6",
          title: "法務局（管轄法務局）へ登記申請書類の提出（またはオンライン申請）",
          category: "SUBMISSION",
          assignee: "法務担当 / 申請代理人",
          dueDate: "変更決議日（効力発生日）から2週間以内",
          status: "TODO",
          isAIRecommended: true,
          notes: "会社法に基づき、役員変更から2週間以内に登記申請を行う義務があります（期限超過は過料の対象となります）。"
        },
        {
          id: "rec-7",
          title: "登録免許税（1万円、資本金1億円超は3万円）の納付",
          category: "SUBMISSION",
          assignee: "法務・財務担当",
          dueDate: "登記申請時",
          status: "TODO",
          isAIRecommended: true,
          notes: "登録免許税納付用台紙に、該当する金額の収入印紙を貼り付けて提出（またはオンライン電子納付）します。"
        },
        {
          id: "rec-8",
          title: "登記完了後の履歴事項全部証明書（商業登記簿謄本）の取得と各官公庁への届出",
          category: "SUBMISSION",
          assignee: "総務・法務担当",
          dueDate: "登記完了から1週間以内",
          status: "TODO",
          isAIRecommended: true,
          notes: "新しい登記簿謄本を取得し、税務署、都道府県税事務所、年金事務所等へ変更届を提出します。"
        }
      ];
    } else if (type === "ARTICLES_CHANGE") {
      return [
        {
          id: "rec-art-1",
          title: "現行定款の確認および定款変更案の起案",
          category: "PREPARATION",
          assignee: "法務担当",
          dueDate: "総会決議の1週間前まで",
          status: "TODO",
          isAIRecommended: true,
          notes: "商号変更、事業目的変更、本店移転など、変更対象の定款箇所を確認し、変更後の新旧対照表を用意します。"
        },
        {
          id: "rec-art-2",
          title: "臨時株主総会の招集通知の発送",
          category: "PREPARATION",
          assignee: "代表取締役",
          dueDate: "総会開催日の1週間前まで",
          status: "TODO",
          isAIRecommended: true,
          notes: "株主に対し、招集通知を発送します（株主全員の同意がある場合は招集手続の省略が可能）。"
        },
        {
          id: "rec-art-3",
          title: "株主総会の特別決議（議決権の3分の2以上の賛成）の可決",
          category: "SIGNING",
          assignee: "株主総会",
          dueDate: "[総会開催日]",
          status: "TODO",
          isAIRecommended: true,
          notes: "定款の変更には、株主総会の特別決議が必要となります。"
        },
        {
          id: "rec-art-4",
          title: "本店移転における移転先不動産契約の締結および住所確定",
          category: "DOCUMENTATION",
          assignee: "総務・代表取締役",
          dueDate: "総会決議まで",
          status: "TODO",
          isAIRecommended: true,
          notes: "本店移転登記を行う場合、番地まで正確な移転先住所および移転日（効力発生日）の確定が必要です。"
        },
        {
          id: "rec-art-5",
          title: "登録免許税（3万円、他管轄移転の場合は計6万円）の納付",
          category: "SUBMISSION",
          assignee: "財務担当",
          dueDate: "申請時",
          status: "TODO",
          isAIRecommended: true,
          notes: "商号変更や目的変更は3万円。本店移転は同一管轄3万円、他管轄へ移転の場合は旧管轄3万円・新管轄3万円の計6万円が必要です。"
        }
      ];
    } else if (type === "BRANCH_CHANGE") {
      return [
        {
          id: "rec-br-1",
          title: "支店の名称、所在地、および設置予定日の決定",
          category: "PREPARATION",
          assignee: "経営幹部 / 取締役会",
          dueDate: "決定会議まで",
          status: "TODO",
          isAIRecommended: true,
          notes: "設置・移転・廃止する支店の正確な情報（ビル名や階数なども含む）を整理します。"
        },
        {
          id: "rec-br-2",
          title: "取締役会（または取締役決定）による決議・決定書作成",
          category: "SIGNING",
          assignee: "取締役会",
          dueDate: "[決議日]",
          status: "TODO",
          isAIRecommended: true,
          notes: "支店の設置は、通常取締役会（取締役会非設置会社は取締役の過半数の一致）で決定します。"
        },
        {
          id: "rec-br-3",
          title: "管轄法務局への登記申請（登録免許税：1支店につき6万円）の実施",
          category: "SUBMISSION",
          assignee: "法務担当",
          dueDate: "設置・変更日から2週間以内",
          status: "TODO",
          isAIRecommended: true,
          notes: "本店所在地を管轄する法務局へ申請を行います。他管轄に支店がある場合はそれぞれ手続きが必要です。"
        }
      ];
    }

    return [
      {
        id: "rec-oth-1",
        title: "申請登記に関する必要要件および添付書類の精査",
        category: "PREPARATION",
        assignee: "法務担当",
        dueDate: "会議開催まで",
        status: "TODO",
        isAIRecommended: true,
        notes: "会社法および商業登記規則に基づき、変更登記申請に必要な添付書類（決議書、同意書、委任状等）を特定します。"
      },
      {
        id: "rec-oth-2",
        title: "株主総会または取締役会議事録等のドラフト作成・実印押印",
        category: "SIGNING",
        assignee: "出席役員",
        dueDate: "決議後速やかに",
        status: "TODO",
        isAIRecommended: true,
        notes: "決議内容を正確に反映した議事録を作成し、実印にて割印・押印をします。"
      },
      {
        id: "rec-oth-3",
        title: "登記申請手続き（効力発生日から14日以内厳守）および登録免許税の納付",
        category: "SUBMISSION",
        assignee: "代表取締役 / 法務担当",
        dueDate: "効力発生日から14日以内",
        status: "TODO",
        isAIRecommended: true,
        notes: "登記申請期間は変更から2週間以内です。遅れた場合は代表取締役個人に過料が発生する場合があります。"
      }
    ];
  };

  // 生成処理
  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFiles[0].rawFile);

      const response = await fetch("/api/generate-docs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "書類の生成処理に失敗しました。");
      }

      const data = await response.json();
      if (data.success) {
        setCompanyInfo(data.companyInfo);
        setDocuments(data.documents);
        setDetectedPlaceholders(data.detectedPlaceholders);

        // 登記種別に応じたTODOリストの初期化（AIおすすめと合体）
        const recs = getRecommendedTasks(taskType, data.companyInfo.name);
        setTasks(recs);

        // 自動的にドキュメントエディタタブへ遷移
        setActiveTab("editor");
      } else {
        throw new Error(data.error || "書類を正常に生成できませんでした。");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "予期せぬエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  // 書類ごとの保存・反映
  const handleSaveDoc = (id: string, updatedContent: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, content: updatedContent } : doc))
    );
  };

  // アーカイブへの保存
  const handleSaveAllToArchive = async () => {
    const archiveId = "archive-" + Date.now();
    const newArchive: FilingArchive = {
      id: archiveId,
      companyInfo,
      taskType,
      createdAt: new Date().toISOString(),
      documents,
      detectedPlaceholders,
      tasks,
    };

    if (user) {
      setSyncing(true);
      const path = `users/${user.uid}/archives`;
      try {
        await setDoc(doc(db, path, archiveId), newArchive);
        setArchives((prev) => [newArchive, ...prev]);
        alert(`「${companyInfo.name || "未指定会社"}」の登記申請データをクラウドに安全に保存しました！`);
      } catch (err) {
        console.error("Failed to save archive to Firestore:", err);
        handleFirestoreError(err, OperationType.CREATE, `${path}/${archiveId}`);
      } finally {
        setSyncing(false);
      }
    } else {
      const updated = [newArchive, ...archives];
      setArchives(updated);
      localStorage.setItem("commercial_registry_archives", JSON.stringify(updated));
      alert(`「${companyInfo.name || "未指定会社"}」の登記申請データをローカルに安全に保存しました！(ログインするとクラウドへバックアップできます)`);
    }
  };

  // アーカイブの削除
  const handleDeleteArchive = async (id: string) => {
    const confirmMsg = user
      ? "このアーカイブを削除してもよろしいですか？クラウドデータベースから完全に削除されます。"
      : "このアーカイブを削除してもよろしいですか？ローカルストレージから完全に削除されます。";

    if (confirm(confirmMsg)) {
      if (user) {
        setSyncing(true);
        const path = `users/${user.uid}/archives`;
        try {
          await deleteDoc(doc(db, path, id));
          setArchives((prev) => prev.filter((a) => a.id !== id));
        } catch (err) {
          console.error("Failed to delete archive from Firestore:", err);
          handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
        } finally {
          setSyncing(false);
        }
      } else {
        const updated = archives.filter((a) => a.id !== id);
        setArchives(updated);
        localStorage.setItem("commercial_registry_archives", JSON.stringify(updated));
      }
    }
  };

  // アーカイブの読み込み
  const handleLoadArchive = (archive: FilingArchive) => {
    setCompanyInfo(archive.companyInfo);
    setTaskType(archive.taskType);
    setDocuments(archive.documents);
    setDetectedPlaceholders(archive.detectedPlaceholders);
    setTasks(archive.tasks);
    setActiveTab("editor");
    alert(`「${archive.companyInfo.name || "未指定会社"}」の登記申請データを読み込みました！`);
  };

  // 外部JSONのインポート
  const handleImportArchive = (imported: FilingArchive) => {
    const updated = [imported, ...archives];
    setArchives(updated);
    localStorage.setItem("commercial_registry_archives", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col">
      {/* 印刷時にはナビゲーションを隠す */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-inner">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">商業登記申請書類生成アシスタント</h1>
              <p className="text-[10px] text-slate-300 font-medium">
                高精度 OCR ＆ AI法務登記アシスタントシステム
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse mr-1"></span>
              <span className="font-semibold text-slate-200">Gemini 3.5 Flash 高速法務推論エンジン搭載</span>
            </div>

            {/* Firebase Auth Controls */}
            {authLoading ? (
              <div className="flex items-center text-xs text-slate-400 gap-1 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>認証確認中...</span>
              </div>
            ) : user ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> クラウド同期中
                  </span>
                  <span className="text-[10px] text-slate-300 max-w-[120px] truncate">{user.displayName || user.email}</span>
                </div>
                {user.photoURL && (
                  <img src={user.photoURL} alt="avatar" className="w-7 h-7 rounded-full border border-indigo-500/50" referrerPolicy="no-referrer" />
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-200 bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                  title="ログアウト"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ログアウト</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Googleでログイン</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <nav className="bg-white border-b border-slate-200 shadow-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("generate")}
              className={`flex items-center space-x-2 py-4 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === "generate"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>1. 資料インポート ＆ 生成</span>
            </button>

            <button
              onClick={() => setActiveTab("editor")}
              className={`flex items-center space-x-2 py-4 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all relative ${
                activeTab === "editor"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>2. 書類編集 ＆ プレビュー</span>
              {documents.length > 0 && (
                <span className="absolute top-2.5 -right-2 bg-indigo-100 text-indigo-800 font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                  {documents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("todo")}
              className={`flex items-center space-x-2 py-4 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === "todo"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <ListTodo className="w-4 h-4" />
              <span>3. 登記 TODO リスク管理</span>
              {tasks.length > 0 && (
                <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                  {tasks.filter((t) => t.status === "DONE").length}/{tasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("archive")}
              className={`flex items-center space-x-2 py-4 px-1 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === "archive"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              <span>4. 保存・共有履歴</span>
              {archives.length > 0 && (
                <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                  {archives.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* メインコンテンツエリア */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === "generate" && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* 簡単な紹介バナー */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md">
                <div className="max-w-3xl space-y-3">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                    各種変更資料（PDF、画像、Word）を直接インポート。
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    取締役の就任・辞任、本店の移転、商号目的変更の決定書や下書きファイルをドラッグ＆ドロップしてください。
                    Gemini 3.5 Flashがスキャン画像からもテキストを高精度に自動抽出し、会社法・商業登記規則に厳格に準拠した臨時株主総会議事録や変更登記申請書などを自動作成します。
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 text-red-900 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">処理中にエラーが発生しました</p>
                    <p className="text-red-700 leading-relaxed text-xs">{error}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      （APIキーの設定状況やファイルが破損していないかご確認ください。）
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 左側: ファイルインポート ＆ 設定 */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 text-xs font-bold">1</span>
                      <span>登記情報の変更資料をインポート</span>
                    </h3>
                  </div>

                  {/* ファイルアップローダー */}
                  <FileUploader files={uploadedFiles} onChange={setUploadedFiles} />

                  <div className="border-b border-slate-100 pb-3 pt-2 flex items-center">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span className="flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 text-xs font-bold">2</span>
                      <span>登記申請の種類の選択と補足指示</span>
                    </h3>
                  </div>

                  {/* 各種オプション */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        対象とする商業登記・申請業務の選択 *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTaskType("DIRECTOR_CHANGE")}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            taskType === "DIRECTOR_CHANGE"
                              ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/15"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <p className="font-semibold text-xs text-slate-800">取締役等の役員変更</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">選任、就任、辞任、重任、辞任届の作成など</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTaskType("ARTICLES_CHANGE")}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            taskType === "ARTICLES_CHANGE"
                              ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/15"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <p className="font-semibold text-xs text-slate-800">定款変更（商号・目的・本店等）</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">商号変更、事業目的追加、本店の移転など</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTaskType("BRANCH_CHANGE")}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            taskType === "BRANCH_CHANGE"
                              ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/15"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <p className="font-semibold text-xs text-slate-800">支店の設置・移転・廃止</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">支店設置・廃止、支店登記など</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTaskType("OTHER")}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            taskType === "OTHER"
                              ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/15"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <p className="font-semibold text-xs text-slate-800">その他の申請・自由指示</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">上記以外の申請や自由な対話的指示</p>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>AIへの補足指示（任意）</span>
                        <span className="text-[10px] text-slate-400 font-normal">例: 「新社長の氏名は山田太郎です」など</span>
                      </label>
                      <textarea
                        value={additionalPrompt}
                        onChange={(e) => setAdditionalPrompt(e.target.value)}
                        placeholder="インポートしたファイルに記載されていない情報（決議希望日、代表取締役や新役員の氏名・住所、株式総数など）があればこちらに入力してください。"
                        rows={3}
                        className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Geminiで資料を解析＆書類を生成中 (10秒ほど)...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-indigo-200" />
                          <span>法務書類を自動生成する（議事録案・登記申請書案・チェックリスト）</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 右側: 業務別ガイド＆説明 */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5 border-b border-slate-800 pb-2.5">
                      <Info className="w-4 h-4 text-indigo-400" />
                      日本の商業登記規則に則った書類を自動起案
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      本システムでは、最先端のマルチモーダルAIである<strong>Gemini 3.5 Flash</strong>をバックエンドに採用しており、法務や総務などの部門で実用的な3点セットの書類を一撃で起案します。
                    </p>

                    <div className="space-y-3 pt-1">
                      <div className="flex gap-2.5 items-start">
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-indigo-300 text-[10px] font-bold mt-0.5 border border-slate-700">1</span>
                        <div>
                          <p className="text-xs font-semibold text-white">議事録・決定書（minutes）</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                            会社法および商業登記規則に厳格に準拠した「臨時株主総会議事録」「取締役会議事録」または「取締役決定書」。
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-indigo-300 text-[10px] font-bold mt-0.5 border border-slate-700">2</span>
                        <div>
                          <p className="text-xs font-semibold text-white">株式会社変更登記申請書（application）</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                            登記の事由、登記すべき事項、登録免許税、添付書類などの別紙・別表を含み、管轄法務局へ提出する申請書。
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-indigo-300 text-[10px] font-bold mt-0.5 border border-slate-700">3</span>
                        <div>
                          <p className="text-xs font-semibold text-white">必要書類チェックリスト ＆ ガイド（checklist）</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                            実印の要否や住民票、辞任届の回収フローなど、登記完了までに発生する具体的な法務アクションのロードマップ。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <h4 className="font-bold text-xs text-slate-800">📋 推定可能な補完機能について</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      送信された資料に決議日や氏名の欠落、読みづらい数値があっても、日本の標準的な商業登記実務・会社法の基本原則から自動的に補完、または穴埋め用のブラケット（例：<code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700">[ 年 月 日 ]</code>）を生成します。
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      生成完了後は、書類プレビュー画面で一括でプレースホルダーを置換し、印刷やコピーができます。
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "editor" && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-4 mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      アクティブ編集・プレビュー
                    </span>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Building className="w-5 h-5 text-indigo-600" />
                      {companyInfo.name || "未指定会社"} の登記申請書類
                    </h2>
                  </div>
                </div>
              </div>

              <DocEditor
                documents={documents}
                detectedPlaceholders={detectedPlaceholders}
                onSaveDoc={handleSaveDoc}
                onSaveAll={handleSaveAllToArchive}
              />
            </motion.div>
          )}

          {activeTab === "todo" && (
            <motion.div
              key="todo"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <TaskBoard tasks={tasks} onTasksChange={setTasks} />
            </motion.div>
          )}

          {activeTab === "archive" && (
            <motion.div
              key="archive"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <ArchiveList
                archives={archives}
                onLoad={handleLoadArchive}
                onDelete={handleDeleteArchive}
                onImport={handleImportArchive}
                isLoggedIn={!!user}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-12 no-print text-center text-xs text-slate-400">
        <p>© 2026 商業登記書類生成アシスタント - All rights reserved.</p>
        <p className="mt-1">日本の会社法、および商業登記の規定（第14条・第15条周辺規定等）に準拠したドラフト起案エンジン</p>
      </footer>
    </div>
  );
}
