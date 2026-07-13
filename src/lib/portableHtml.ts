import { FilingArchive } from "../components/ArchiveList";

export function generatePortableHtml(archive: FilingArchive): string {
  return buildUnifiedHtml(archive);
}

export function generatePortableAppHtml(): string {
  return buildUnifiedHtml();
}

function buildUnifiedHtml(archive?: FilingArchive): string {
  const getTaskLabel = (type: string) => {
    switch (type) {
      case "DIRECTOR_CHANGE": return "役員変更（取締役・代表取締役等）";
      case "ARTICLES_CHANGE": return "商号・目的等（定款変更）";
      case "BRANCH_CHANGE": return "本店移転・支店設置";
      default: return "その他登記・議事録起案";
    }
  };

  // プレースホルダーの初期値設定
  let placeholdersWithValues = [];
  if (archive) {
    placeholdersWithValues = archive.detectedPlaceholders.map((p: any) => {
      let value = p.value || "";
      if (!value) {
        if (p.key === "[会社名]") value = archive.companyInfo.name;
        if (p.key === "[本店所在地]" || p.key === "[住所]") value = archive.companyInfo.address;
        if (p.key === "[代表取締役氏名]" || p.key === "[氏名]") value = archive.companyInfo.representative;
      }
      return { key: p.key, label: p.label, value: value };
    });
  }

  const serializedData = archive ? JSON.stringify({
    ...archive,
    detectedPlaceholders: placeholdersWithValues
  }) : "null";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【商業登記アシスタント】ポータブル版</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', 'Noto Sans JP', sans-serif; }
    .print-area { display: none; }
    @media print {
      .no-print { display: none !important; }
      .print-area { display: block !important; background-color: white !important; color: black !important; }
      body { background-color: white !important; color: black !important; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col no-print">

  <!-- ヘッダー -->
  <header class="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0 shadow-xs">
    <div class="flex items-center space-x-3">
      <div class="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-500/20">
        <i data-lucide="building-2" class="w-6 h-6"></i>
      </div>
      <div>
        <h1 class="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
          商業登記ポータブル書類アシスタント
          <span class="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">ポータブル完全版</span>
        </h1>
        <p class="text-xs text-slate-500">ドラッグ＆ドロップ資料OCRインポート ＆ Gemini自動書類生成（オフライン＆メール添付対応）</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <button onclick="toggleApiKeyModal()" class="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg shadow-xs transition-all cursor-pointer">
        <i data-lucide="key" class="w-3.5 h-3.5 text-indigo-500"></i>
        <span>Gemini API設定 (任意)</span>
      </button>
      <button onclick="triggerJSONImport()" class="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg shadow-xs transition-all cursor-pointer">
        <i data-lucide="upload" class="w-3.5 h-3.5"></i>
        <span>JSON読込</span>
      </button>
      <input type="file" id="json-file-input" onchange="importSingleJSON(event)" accept=".json" class="hidden">
      <button onclick="exportSingleJSON()" class="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 rounded-lg shadow-xs transition-all cursor-pointer">
        <i data-lucide="download" class="w-3.5 h-3.5"></i>
        <span>JSON書出</span>
      </button>
    </div>
  </header>

  <!-- タブナビゲーション -->
  <div class="bg-white border-b border-slate-200 px-6 shrink-0">
    <nav class="flex space-x-4 overflow-x-auto py-2">
      <button onclick="switchTab('generate')" id="tab-btn-generate" class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-indigo-600 text-white">
        <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
        <span>1. 資料インポート ＆ 生成</span>
      </button>
      <button onclick="switchTab('editor')" id="tab-btn-editor" class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100">
        <i data-lucide="sparkles" class="w-4 h-4"></i>
        <span>2. 書類編集 ＆ プレビュー</span>
      </button>
      <button onclick="switchTab('todo')" id="tab-btn-todo" class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100">
        <i data-lucide="list-todo" class="w-4 h-4"></i>
        <span>3. 登記 TODO リスク管理</span>
      </button>
      <button onclick="switchTab('archive')" id="tab-btn-archive" class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100">
        <i data-lucide="archive" class="w-4 h-4"></i>
        <span>4. 保存・共有履歴</span>
      </button>
    </nav>
  </div>

  <!-- メインコンテンツ -->
  <main class="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">

    <!-- TAB 1: GENERATE -->
    <section id="tab-content-generate" class="space-y-6">
      <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xs">
        <div class="max-w-3xl space-y-2">
          <h2 class="text-lg font-bold tracking-tight">各種変更資料（PDF、画像、Word）を直接インポート。</h2>
          <p class="text-xs text-slate-200 leading-relaxed">
            取締役の就任・辞任、本店の移転、商号目的変更の決定書や下書きファイルをドラッグ＆ドロップしてください。
            Gemini 3.5 Flashがスキャン画像からもテキストを高精度に自動抽出し、会社法・商業登記規則に厳格に準拠した臨時株主総会議事録や変更登記申請書などを自動作成します。
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- 左：インポート＆フォーム -->
        <div class="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div class="border-b border-slate-100 pb-3">
            <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span class="flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 text-xs font-bold">1</span>
              <span>登記情報の変更資料をインポート</span>
            </h3>
          </div>

          <!-- ドラッグ＆ドロップ ゾーン -->
          <div class="space-y-4">
            <div id="dropzone" class="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/50 rounded-xl p-6 text-center cursor-pointer transition-all relative" onclick="document.getElementById('file-input').click()" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
              <input type="file" id="file-input" class="hidden" multiple accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onchange="handleFileSelect(event)">
              <div class="flex flex-col items-center justify-center space-y-2">
                <i data-lucide="upload-cloud" id="upload-icon" class="w-10 h-10 text-slate-400"></i>
                <p class="font-medium text-slate-800 text-sm">ファイルをドラッグ＆ドロップするか、<span class="text-indigo-600 font-bold">クリックしてアップロード</span></p>
                <p class="text-xs text-slate-400">PDF、Word、画像（スキャンPNG/JPG）、テキスト対応 (最大 10MB)</p>
              </div>
            </div>

            <!-- ファイルリスト -->
            <div id="file-list-container" class="hidden space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">アップロードされた資料 (<span id="file-count">0</span>件)</span>
                <button onclick="clearAllFiles()" class="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer">すべてクリア</button>
              </div>
              <div id="file-list" class="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto"></div>
            </div>

            <div class="flex items-start space-x-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-indigo-900 text-xs">
              <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-indigo-600 mt-0.5"></i>
              <div>
                <p class="font-semibold text-indigo-800">高精度スキャン文字認識 (OCR)</p>
                <p class="text-indigo-700 leading-relaxed mt-0.5">文字コピーができない画像化されたPDFやスキャン写真であっても、Gemini 3.5 Flashが資料内の文字や数値、表情報を一言一句正確に読み取ります。</p>
              </div>
            </div>
          </div>

          <div class="border-b border-slate-100 pb-3 pt-2">
            <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span class="flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 text-xs font-bold">2</span>
              <span>会社基本情報の入力 ＆ 登記種類の選択</span>
            </h3>
          </div>

          <!-- 各種入力 -->
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-xs font-bold text-slate-600">会社名（商号） <span class="text-slate-400 text-[10px]">(任意)</span></label>
                <input type="text" id="input-comp-name" placeholder="株式会社〇〇〇〇" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500">
              </div>
              <div class="space-y-1">
                <label class="text-xs font-bold text-slate-600">代表取締役氏名 <span class="text-slate-400 text-[10px]">(任意)</span></label>
                <input type="text" id="input-comp-rep" placeholder="山田 太郎" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500">
              </div>
              <div class="space-y-1 sm:col-span-2">
                <label class="text-xs font-bold text-slate-600">本店所在地 <span class="text-slate-400 text-[10px]">(任意)</span></label>
                <input type="text" id="input-comp-address" placeholder="東京都渋谷区宇田川町1番1号" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500">
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700">対象とする商業登記・申請業務の選択 *</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onclick="setTaskType('DIRECTOR_CHANGE')" id="btn-task-director" class="p-3 rounded-xl border text-left transition-all border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/15">
                  <p class="font-semibold text-xs text-slate-800">取締役等の役員変更</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">選任、就任、辞任、重任、辞任届の作成など</p>
                </button>
                <button onclick="setTaskType('ARTICLES_CHANGE')" id="btn-task-articles" class="p-3 rounded-xl border text-left transition-all border-slate-200 hover:border-slate-300">
                  <p class="font-semibold text-xs text-slate-800">定款変更（商号・目的・本店等）</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">商号変更、事業目的追加、本店の移転など</p>
                </button>
                <button onclick="setTaskType('BRANCH_CHANGE')" id="btn-task-branch" class="p-3 rounded-xl border text-left transition-all border-slate-200 hover:border-slate-300">
                  <p class="font-semibold text-xs text-slate-800">支店の設置・移転・廃止</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">支店設置・廃止、支店登記など</p>
                </button>
                <button onclick="setTaskType('OTHER')" id="btn-task-other" class="p-3 rounded-xl border text-left transition-all border-slate-200 hover:border-slate-300">
                  <p class="font-semibold text-xs text-slate-800">その他の申請・自由指示</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">上記以外の申請や自由な対話的指示</p>
                </button>
              </div>
            </div>

            <!-- 動的追加オプション -->
            <div id="dynamic-options" class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-3"></div>

            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700">AIへの補足指示（任意）</label>
              <textarea id="additional-prompt" placeholder="インポートしたファイルに記載されていない情報があれば入力してください。" rows="2" class="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"></textarea>
            </div>

            <div class="pt-2">
              <button onclick="handleGenerateDocs()" id="btn-generate" class="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-xs cursor-pointer">
                <i data-lucide="sparkles" class="w-5 h-5 text-indigo-200"></i>
                <span>法務書類を自動生成する（議事録案・登記申請書案・チェックリスト）</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 右：ガイド解説 -->
        <div class="lg:col-span-5 space-y-4">
          <div class="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 class="font-bold text-xs text-white flex items-center gap-1.5 border-b border-slate-800 pb-2.5">
              <i data-lucide="info" class="w-4 h-4 text-indigo-400"></i>
              日本の商業登記規則に則った書類を自動起案
            </h4>
            <p class="text-xs text-slate-300 leading-relaxed">
              本システムは、日本の会社法・商業登記規則に準拠した臨時株主総会議事録や登記申請書、必要添付書類チェックリストをまとめてドラフト起案します。
            </p>
            <div id="task-guide-box" class="space-y-3 text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <p class="font-bold text-white">📌 取締役・役員変更手続き</p>
              <ul class="list-disc pl-4 space-y-1 mt-1 text-[11px]">
                <li>株主総会での選任・就任承認決議、および取締役決定が必要です。</li>
                <li>臨時株主総会議事録、取締役決定書、就任承諾書、株主リストなどを起案します。</li>
                <li>就任日から14日以内に管轄法務局への変更登記申請を行う必要があります。</li>
              </ul>
            </div>
          </div>
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <h4 class="font-bold text-xs text-slate-800">📋 自動プレースホルダー置換機能</h4>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              決議日や金額、氏名などの不足情報は、書類内に <code class="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono text-[10px]">[会社名]</code> のようにブラケット形式で埋め込まれます。
            </p>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              生成後は、書類編集画面の左サイドバーにある入力欄で値を打ち替えるだけで、全ての書類の対応箇所が一瞬で同期・一括置換されます。
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 2: EDITOR -->
    <section id="tab-content-editor" class="hidden space-y-6">
      <div id="editor-empty" class="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-xs">
        <i data-lucide="file-text" class="w-12 h-12 text-slate-300 animate-pulse"></i>
        <div class="space-y-1">
          <p class="text-sm font-bold text-slate-800">書類がまだ生成されていません</p>
          <p class="text-xs text-slate-500">「1. 資料インポート ＆ 生成」タブから情報を入力して書類を自動起案してください。</p>
        </div>
        <button onclick="switchTab('generate')" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">
          書類生成画面へ行く
        </button>
      </div>

      <div id="editor-container" class="hidden grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 左：置換変数 -->
        <div class="space-y-6">
          <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 class="font-bold text-xs uppercase text-indigo-600 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <i data-lucide="sliders" class="w-3.5 h-3.5"></i> 書類内変数の編集
            </h3>
            <p class="text-[11px] text-slate-500 leading-relaxed">編集すると右側の書類のブラケット箇所がリアルタイムで置換・反映されます。</p>
            <div id="placeholder-fields" class="space-y-4 max-h-[400px] overflow-y-auto pr-1"></div>
          </div>
        </div>

        <!-- 右：エディタプレビュー -->
        <div class="lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden min-h-[550px]">
          <div class="bg-slate-50 px-4 pt-2 border-b border-slate-200 flex items-center justify-between overflow-x-auto">
            <div id="editor-doc-tabs" class="flex space-x-1"></div>
          </div>
          <div class="bg-slate-100 border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping"></span>
              <span id="active-doc-title" class="text-xs font-bold text-slate-800"></span>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="toggleEditorEditMode()" id="btn-toggle-edit" class="flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 cursor-pointer shadow-xs">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                <span id="txt-toggle-edit">直接編集</span>
              </button>
              <button onclick="window.print()" class="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer shadow-xs">
                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                <span>印刷 / PDF保存</span>
              </button>
            </div>
          </div>
          <div class="flex-1 relative flex overflow-hidden min-h-[450px]">
            <textarea id="editor-textarea" class="hidden absolute inset-0 w-full h-full bg-slate-50 text-slate-800 p-6 font-mono text-xs leading-relaxed focus:outline-none resize-none overflow-y-auto border-0" oninput="handleEditorTextChange(this.value)"></textarea>
            <div id="editor-preview" class="w-full h-full overflow-y-auto bg-white text-slate-800 p-8 sm:p-10 leading-relaxed text-sm"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 3: TODO -->
    <section id="tab-content-todo" class="hidden space-y-6">
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div class="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="check-square" class="text-indigo-600 w-5 h-5"></i>
              登記手続き申請タイムライン
            </h2>
            <p class="text-xs text-slate-500 mt-1">法務局登記完了・謄本回収までのやることリストと進捗管理です。</p>
          </div>
          <div class="flex items-center space-x-3">
            <span id="todo-progress-text" class="text-xs font-bold text-indigo-600">進捗: 0%</span>
            <div class="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div id="todo-progress-bar" class="bg-indigo-600 h-2" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <div id="todo-list" class="space-y-4"></div>

        <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          <input type="text" id="todo-input-title" placeholder="新しいTODOアクションを追加..." class="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800">
          <select id="todo-input-cat" class="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800">
            <option value="書類準備">書類準備</option>
            <option value="機関承認">機関承認</option>
            <option value="押印・精査">押印・精査</option>
            <option value="申請実行">申請実行</option>
            <option value="その他">その他</option>
          </select>
          <button onclick="addCustomTask()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg cursor-pointer">追加</button>
        </div>
      </div>
    </section>

    <!-- TAB 4: ARCHIVE -->
    <section id="tab-content-archive" class="hidden space-y-6">
      <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="archive" class="text-indigo-600 w-5 h-5"></i>
          保存・共有履歴（ブラウザ保存）
        </h2>
        <div id="archive-empty" class="text-center py-10 text-slate-400 text-xs">
          履歴データはありません。書類を生成すると自動的にブラウザ内に保存されます。
        </div>
        <div id="archive-list" class="hidden space-y-3"></div>
      </div>
    </section>

  </main>

  <footer class="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 shrink-0">
    <p>© 2026 商業登記申請書類生成アシスタント - ポータブル版（安全なブラウザ完結処理）</p>
  </footer>

  <!-- API KEY MODAL -->
  <div id="api-key-modal" class="hidden fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
          <i data-lucide="key" class="text-indigo-600 w-4 h-4"></i>
          <span>Gemini APIキー設定 (任意・ローカル用)</span>
        </h3>
        <button onclick="toggleApiKeyModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>
      <p class="text-[10px] text-slate-500 leading-relaxed">
        このHTMLをローカル（file://）で実行する場合、お手持ちのGemini APIキーを登録いただくことで、直接ブラウザから高精度なOCR解析・書類作成をご利用可能です。キーは暗号化されず、ブラウザのlocalStorageに保存されます。
      </p>
      <div class="space-y-1">
        <label class="text-[10px] font-bold text-slate-700">APIキー</label>
        <input type="password" id="api-key-input" placeholder="AIzaSy..." class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
      </div>
      <div class="flex justify-end gap-2 pt-2 text-xs">
        <button onclick="toggleApiKeyModal()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">閉じる</button>
        <button onclick="saveApiKey()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg">保存</button>
      </div>
    </div>
  </div>

  <!-- PRINT ONLY DIV -->
  <div class="print-area max-w-2xl mx-auto p-12 text-slate-900">
    <h1 id="print-title" class="text-2xl font-bold text-center border-b pb-4 mb-6"></h1>
    <div id="print-content" class="text-sm leading-relaxed whitespace-pre-wrap"></div>
  </div>

  <script>
    const embeddedData = ${serializedData};

    const appState = {
      activeTab: embeddedData ? "editor" : "generate",
      companyInfo: embeddedData ? embeddedData.companyInfo : { name: "", address: "", representative: "" },
      taskType: embeddedData ? embeddedData.taskType : "DIRECTOR_CHANGE",
      documents: embeddedData ? embeddedData.documents : [],
      detectedPlaceholders: embeddedData ? embeddedData.detectedPlaceholders : [],
      tasks: embeddedData ? embeddedData.tasks : [],
      activeDocIndex: 0,
      editorEditMode: false,
      uploadedFiles: [],
      archives: []
    };

    const templates = {
      DIRECTOR_CHANGE: {
        label: "役員変更（取締役等）",
        placeholders: [
          { key: "[会社名]", label: "会社名", value: "" },
          { key: "[会社住所]", label: "本店所在地", value: "" },
          { key: "[代表取締役氏名]", label: "現代表取締役氏名", value: "" },
          { key: "[辞任する取締役氏名]", label: "辞任取締役氏名", value: "鈴木 二郎" },
          { key: "[新取締役氏名]", label: "新取締役氏名", value: "佐藤 三郎" },
          { key: "[決議年月日]", label: "決議日", value: "2026年7月15日" },
          { key: "[申請年月日]", label: "申請予定日", value: "2026年7月16日" },
          { key: "[管轄法務局]", label: "管轄法務局", value: "東京法務局 渋谷出張所" }
        ],
        tasks: [
          { title: "臨時株主総会を決議し、取締役変更を可決する", category: "機関承認", status: "TODO" },
          { title: "議事録、辞任届、就任承諾書、株主リストを準備する", category: "書類準備", status: "TODO" },
          { title: "新役員の印鑑証明書を取得し押印する", category: "押印・精査", status: "TODO" },
          { title: "法務局へ商業登記変更申請書を提出する", category: "申請実行", status: "TODO" }
        ],
        docs: [
          { id: "minutes", title: "臨時株主総会議事録", content: "# 臨時株主総会議事録\\n\\n1. **日時**: [決議年月日] 午前10時00分\\n2. **場所**: [会社住所] 本社会議室\\n3. **株主の総数**: 2名\\n\\n**決議事項**: \\n\\n### 第1号議案 取締役1名辞任に伴う後任取締役選任の件\\n\\n議長は、取締役 [辞任する取締役氏名] より辞任届があったため、後任取締役の選任を諮った。慎重審議の結果、後任として [新取締役氏名] を満場一致で選任し、同氏は即座に就任を承諾した。\\n\\n[決議年月日]\\n\\n**[会社名]**\\n* 代表取締役 [代表取締役氏名] (印)\\n* 取締役 [新取締役氏名] (印)" },
          { id: "application", title: "株式会社変更登記申請書", content: "# 株式会社変更登記申請書\\n\\n1. **商号**: [会社名]\\n2. **本店**: [会社住所]\\n3. **登記の事由**: 取締役及び代表取締役の変更\\n4. **登記すべき事項**: \\n   * [決議年月日] 取締役 [辞任する取締役氏名] 辞任\\n   * [決議年月日] 取締役 [新取締役氏名] 就任\\n5. **登録免許税**: 金 10,000 円\\n\\n[申請年月日]\\n\\n* **申請人**: [会社名]\\n* **代表取締役**: [代表取締役氏名] (印)\\n\\n**[管轄法務局] 御中**" },
          { id: "checklist", title: "必要書類チェックリスト ＆ ガイド", content: "# 必要書類チェックリスト\\n\\n- [ ] 臨時株主総会議事録 (代表印・役員実印)\\n- [ ] 辞任届 (辞任者の実印 ＋ 印鑑証明書)\\n- [ ] 就任承諾書 (新就任者の実印 ＋ 印鑑証明書)\\n- [ ] 株主リスト (代表社届出実印)\\n- [ ] 変更登記申請書 (収入印紙1万円を貼付)" }
        ]
      },
      ARTICLES_CHANGE: {
        label: "定款変更（商号・目的）",
        placeholders: [
          { key: "[会社名]", label: "現在の会社名", value: "" },
          { key: "[会社住所]", label: "本店所在地", value: "" },
          { key: "[代表取締役氏名]", label: "代表取締役氏名", value: "" },
          { key: "[変更後の新商号]", label: "新しい会社名", value: "株式会社グローバルテック" },
          { key: "[新規追加する追加事業目的]", label: "新追加する事業目的", value: "経営コンサルティング業務及び各種マーケティング" },
          { key: "[決議年月日]", label: "決議日", value: "2026年7月20日" },
          { key: "[申請年月日]", label: "申請予定日", value: "2026年7月21日" },
          { key: "[管轄法務局]", label: "管轄法務局", value: "東京法務局" }
        ],
        tasks: [
          { title: "定款変更決議（特別決議）を行う", category: "機関承認", status: "TODO" },
          { title: "議事録と新定款案、株主リストを作成する", category: "書類準備", status: "TODO" },
          { title: "法務局へ商号変更登記申請を行う (免許税3万円)", category: "申請実行", status: "TODO" }
        ],
        docs: [
          { id: "minutes", title: "臨時株主総会議事録", content: "# 臨時株主総会議事録\\n\\n1. **日時**: [決議年月日] 午前10時\\n\\n**決議事項**: \\n\\n### 第1号議案 定款一部変更（商号及び目的変更）の件\\n\\n現行の商号 [会社名] を 「[変更後の新商号]」に変更し、新規事業として「[新規追加する追加事業目的]」を追加するため、定款第1条および第2条を改定する特別決議を満場一致で承認した。\\n\\n[決議年月日]\\n\\n**[会社名]**\\n* 代表取締役 [代表取締役氏名] (印)" },
          { id: "application", title: "株式会社変更登記申請書", content: "# 株式会社変更登記申請書\\n\\n1. **新商号**: [変更後の新商号]\\n2. **本店**: [会社住所]\\n3. **登記の事由**: 商号及び目的変更\\n4. **登録免許税**: 金 30,000 円\\n\\n[申請年月日]\\n\\n* **申請人**: [会社名]\\n* **代表取締役**: [代表取締役氏名] (印)\\n\\n**[管轄法務局] 御中**" },
          { id: "checklist", title: "定款変更チェックリスト", content: "# 定款変更の提出物一覧\\n\\n- [ ] 臨時株主総会議事録 (特別決議承認の記載)\\n- [ ] 株主リスト\\n- [ ] 登記申請書 (収入印紙3万円)" }
        ]
      },
      BRANCH_CHANGE: {
        label: "本店移転・支店設置",
        placeholders: [
          { key: "[会社名]", label: "会社名", value: "" },
          { key: "[会社住所]", label: "現在の本店住所", value: "" },
          { key: "[代表取締役氏名]", label: "代表取締役氏名", value: "" },
          { key: "[移転先新本店所在地]", label: "移転先新住所", value: "東京都港区六本木三丁目1番1号" },
          { key: "[新本店所在市町村]", label: "新最小行政区画", value: "東京都港区" },
          { key: "[決議年月日]", label: "決議日", value: "2026年8月1日" },
          { key: "[申請年月日]", label: "申請日", value: "2026年8月2日" },
          { key: "[管轄法務局]", label: "管轄法務局", value: "東京法務局" }
        ],
        tasks: [
          { title: "株主総会または取締役決定で本店移転を決議する", category: "機関承認", status: "TODO" },
          { title: "変更登記申請書を作成する (他管轄の場合は計6万円)", category: "書類準備", status: "TODO" },
          { title: "登記完了後に社会保険事務所や税務署へ届出を行う", category: "その他", status: "TODO" }
        ],
        docs: [
          { id: "minutes", title: "取締役決定書", content: "# 取締役決定書\\n\\n当社取締役 [代表取締役氏名] は、本店を [移転先新本店所在地] に移転することを決定した。\\n\\n* **移転予定日**: [決議年月日]\\n\\n[決議年月日]\\n\\n**[会社名]**\\n* 取締役 [代表取締役氏名] (印)" },
          { id: "application", title: "株式会社変更登記申請書", content: "# 株式会社変更登記申請書\\n\\n1. **商号**: [会社名]\\n2. **移転先住所**: [移転先新本店所在地]\\n3. **登記の事由**: 本店移転\\n4. **登録免許税**: 金 30,000 円\\n\\n[申請年月日]\\n\\n* **代表取締役**: [代表取締役氏名] (印)" },
          { id: "checklist", title: "本店移転チェックリスト", content: "# 本店移転の用意するもの\\n\\n- [ ] 株主総会議事録 (定款変更が必要な場合)\\n- [ ] 取締役決定書 / 取締役会議事録\\n- [ ] 登記申請書" }
        ]
      },
      OTHER: {
        label: "その他登記・議事録",
        placeholders: [
          { key: "[会社名]", label: "会社名", value: "" },
          { key: "[会社住所]", label: "会社住所", value: "" },
          { key: "[代表取締役氏名]", label: "代表取締役氏名", value: "" },
          { key: "[決議年月日]", label: "決議日", value: "2026年7月25日" }
        ],
        tasks: [
          { title: "必要となる添付書類・議事録のドラフト作成を行う", category: "書類準備", status: "TODO" },
          { title: "必要箇所へ代表印の実印を押印する", category: "押印・精査", status: "TODO" }
        ],
        docs: [
          { id: "minutes", title: "臨時株主総会議事録", content: "# 臨時株主総会議事録\\n\\n1. **日時**: [決議年月日]\\n2. **場所**: [会社住所]\\n\\n**決議事項**: 慎重審議の上、満場一致で可決した。\\n\\n[決議年月日] **[会社名]**\\n代表取締役: [代表取締役氏名]" }
        ]
      }
    };

    window.addEventListener("DOMContentLoaded", () => {
      // ユーザーのGemini APIキーを復元
      const savedKey = localStorage.getItem("user_gemini_api_key");
      if (savedKey) {
        document.getElementById("api-key-input").value = savedKey;
      }

      loadLocalHistory();
      setTaskType(appState.taskType);
      
      if (embeddedData) {
        switchTab("editor");
      } else {
        switchTab("generate");
      }
      lucide.createIcons();
    });

    // タブ切替
    function switchTab(tab) {
      ["generate", "editor", "todo", "archive"].forEach(t => {
        const btn = document.getElementById("tab-btn-" + t);
        const sec = document.getElementById("tab-content-" + t);
        if (t === tab) {
          btn.className = "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-indigo-600 text-white shadow-xs";
          sec.classList.remove("hidden");
        } else {
          btn.className = "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100";
          sec.classList.add("hidden");
        }
      });
      appState.activeTab = tab;

      if (tab === "editor") renderEditor();
      if (tab === "todo") renderTodoList();
      if (tab === "archive") renderHistoryList();
    }

    // 登記タイプ設定
    function setTaskType(type) {
      appState.taskType = type;
      ["director", "articles", "branch", "other"].forEach(t => {
        const b = document.getElementById("btn-task-" + t);
        if (type === t.toUpperCase() + (t === "director" || t === "articles" ? "_CHANGE" : "")) {
          b.className = "p-3 rounded-xl border text-left transition-all border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/15";
        } else {
          b.className = "p-3 rounded-xl border text-left transition-all border-slate-200 hover:border-slate-300";
        }
      });

      // ガイドと動的フォームの更新
      const guideBox = document.getElementById("task-guide-box");
      const dynamicOptions = document.getElementById("dynamic-options");

      if (type === "DIRECTOR_CHANGE") {
        guideBox.innerHTML = \`<p class="font-bold text-white">📌 役員変更の手続きガイド</p>
          <ul class="list-disc pl-4 space-y-1 mt-1 text-[11px]">
            <li>株主総会での選任・就任承認決議、および取締役決定が必要です。</li>
            <li>就任承諾書や辞任届、株主リスト一式を自動起案します。</li>
          </ul>\`;
        dynamicOptions.innerHTML = \`<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-1">辞任する役員氏名</label>
            <input type="text" id="opt-resigned" value="鈴木 二郎" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-1">新就任する役員氏名</label>
            <input type="text" id="opt-newname" value="佐藤 三郎" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs">
          </div>
        </div>\`;
      } else if (type === "ARTICLES_CHANGE") {
        guideBox.innerHTML = \`<p class="font-bold text-white">📌 定款変更手続きガイド</p>
          <ul class="list-disc pl-4 space-y-1 mt-1 text-[11px]">
            <li>商号変更や事業目的追加は特別決議（3分の2以上の賛成）が必要です。</li>
            <li>変更免許税は30,000円です。</li>
          </ul>\`;
        dynamicOptions.innerHTML = \`<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-1">新しい会社名 (新商号)</label>
            <input type="text" id="opt-newcompany" value="株式会社グローバルテック" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-1">追加する事業目的</label>
            <input type="text" id="opt-newpurpose" value="経営コンサルティング業務及びマーケティング" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs">
          </div>
        </div>\`;
      } else if (type === "BRANCH_CHANGE") {
        guideBox.innerHTML = \`<p class="font-bold text-white">📌 本店移転手続きガイド</p>
          <ul class="list-disc pl-4 space-y-1 mt-1 text-[11px]">
            <li>管轄法務局をまたぐ移転の場合は元と先の両方で計6万円必要になります。</li>
            <li>取締役決定書、株主総会議事録が必要です。</li>
          </ul>\`;
        dynamicOptions.innerHTML = \`<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-1">移転先新本店所在地</label>
            <input type="text" id="opt-newaddress" value="東京都港区六本木三丁目1番1号" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs">
          </div>
        </div>\`;
      } else {
        guideBox.innerHTML = \`<p class="font-bold text-white">📌 自由指示・その他登記</p>
          <ul class="list-disc pl-4 space-y-1 mt-1 text-[11px]">
            <li>補足指示欄に入力された内容を基に、Geminiが自由に商業登記関係の議事録案を作成します。</li>
          </ul>\`;
        dynamicOptions.innerHTML = \`<p class="text-slate-400">特に追加パラメータはありません。「補足指示欄」へ自由に入力してください。</p>\`;
      }
      lucide.createIcons();
    }

    // ドラッグ＆ドロップ ＆ ファイル処理
    function handleDragOver(e) { e.preventDefault(); document.getElementById("dropzone").className = "border-2 border-dashed border-indigo-500 bg-indigo-50/50 rounded-xl p-6 text-center cursor-pointer transition-all relative"; }
    function handleDragLeave(e) { e.preventDefault(); document.getElementById("dropzone").className = "border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/50 rounded-xl p-6 text-center cursor-pointer transition-all relative"; }
    function handleDrop(e) { e.preventDefault(); handleDragLeave(e); if (e.dataTransfer.files) { addUploadedFiles(e.dataTransfer.files); } }
    function handleFileSelect(e) { if (e.target.files) { addUploadedFiles(e.target.files); } }

    function addUploadedFiles(fileList) {
      const promises = Array.from(fileList).map(f => {
        return new Promise((resolve, reject) => {
          if (f.size > 10 * 1024 * 1024) {
            alert(f.name + " はサイズが10MBを超えています。");
            return resolve(null);
          }
          const reader = new FileReader();
          reader.onload = () => resolve({ name: f.name, type: f.type, base64: reader.result, size: f.size });
          reader.onerror = () => reject();
          reader.readAsDataURL(f);
        });
      });

      Promise.all(promises).then(res => {
        const valid = res.filter(x => x !== null);
        appState.uploadedFiles = [...appState.uploadedFiles, ...valid];
        renderFileList();
      });
    }

    function renderFileList() {
      const container = document.getElementById("file-list-container");
      const list = document.getElementById("file-list");
      const count = document.getElementById("file-count");
      
      if (appState.uploadedFiles.length === 0) {
        container.classList.add("hidden");
        return;
      }
      container.classList.remove("hidden");
      count.innerText = appState.uploadedFiles.length;
      list.innerHTML = "";

      appState.uploadedFiles.forEach((f, idx) => {
        const sizeStr = (f.size / 1024).toFixed(1) + " KB";
        const div = document.createElement("div");
        div.className = "flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors text-xs text-slate-700";
        div.innerHTML = \`<div class="flex items-center space-x-2 truncate">
          <i data-lucide="file-text" class="w-4 h-4 text-indigo-600"></i>
          <span class="font-medium truncate">\${f.name}</span>
          <span class="text-slate-400 text-[10px]">\${sizeStr}</span>
        </div>
        <button onclick="removeFile(\${idx})" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>\`;
        list.appendChild(div);
      });
      lucide.createIcons();
    }

    function removeFile(idx) {
      appState.uploadedFiles.splice(idx, 1);
      renderFileList();
    }

    function clearAllFiles() {
      appState.uploadedFiles = [];
      renderFileList();
    }

    // API KEY 管理
    function toggleApiKeyModal() {
      const m = document.getElementById("api-key-modal");
      m.classList.toggle("hidden");
    }
    function saveApiKey() {
      const k = document.getElementById("api-key-input").value.trim();
      localStorage.setItem("user_gemini_api_key", k);
      alert("APIキーを保存しました。");
      toggleApiKeyModal();
    }

    // 書類生成
    async function handleGenerateDocs() {
      const name = document.getElementById("input-comp-name").value.trim();
      const rep = document.getElementById("input-comp-rep").value.trim();
      const addr = document.getElementById("input-comp-address").value.trim();

      appState.companyInfo = { name: name || "", address: addr || "", representative: rep || "" };

      const btn = document.getElementById("btn-generate");
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = \`<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> <span>Geminiで資料を解析＆書類を生成中 (10秒ほど)...</span>\`;
      lucide.createIcons();

      const additional = document.getElementById("additional-prompt").value.trim();

      try {
        let responseJson = null;

        // 1. まず自サーバーのAPIをトライ
        try {
          const resp = await fetch("/api/generate-docs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              files: appState.uploadedFiles,
              taskType: appState.taskType,
              additionalPrompt: additional
            })
          });
          if (resp.ok) {
            responseJson = await resp.json();
          }
        } catch (e) {
          console.log("Local Express API not available or offline, trying direct client-side Gemini...");
        }

        // 2. 失敗、またはオフライン時は client-side のAPIキーがあれば直接Google Geminiを呼び出す
        if (!responseJson) {
          const clientKey = localStorage.getItem("user_gemini_api_key");
          if (clientKey) {
            responseJson = await callGeminiDirectly(clientKey, appState.uploadedFiles, appState.taskType, additional);
          }
        }

        // 3. どちらもダメなら、標準テンプレートでフォールバック
        if (responseJson && responseJson.documents) {
          appState.companyInfo = responseJson.companyInfo;
          appState.documents = responseJson.documents;
          appState.detectedPlaceholders = responseJson.detectedPlaceholders;
          
          // タスクを割り当て
          const defT = templates[appState.taskType]?.tasks || [];
          appState.tasks = JSON.parse(JSON.stringify(defT));
          
          alert("✨ Gemini 3.5 Flashにより変更資料のOCR解析・書類のドラフト起案が完了しました！");
        } else {
          // テンプレートフォールバック
          const t = templates[appState.taskType];
          appState.documents = JSON.parse(JSON.stringify(t.docs));
          appState.tasks = JSON.parse(JSON.stringify(t.tasks));
          appState.detectedPlaceholders = JSON.parse(JSON.stringify(t.placeholders));

          // プレースホルダーに会社基本値、およびオプション値を代入
          appState.detectedPlaceholders.forEach(ph => {
            if (ph.key === "[会社名]" || ph.key === "[現在の会社名]") ph.value = name;
            if (ph.key === "[会社住所]" || ph.key === "[本店所在地]") ph.value = addr;
            if (ph.key === "[代表取締役氏名]" || ph.key === "[氏名]") ph.value = rep;

            if (appState.taskType === "DIRECTOR_CHANGE") {
              const res = document.getElementById("opt-resigned")?.value || "";
              const sin = document.getElementById("opt-newname")?.value || "";
              if (ph.key === "[辞任する取締役氏名]") ph.value = res;
              if (ph.key === "[新取締役氏名]") ph.value = sin;
            } else if (appState.taskType === "ARTICLES_CHANGE") {
              const nc = document.getElementById("opt-newcompany")?.value || "";
              const np = document.getElementById("opt-newpurpose")?.value || "";
              if (ph.key === "[変更後の新商号]") ph.value = nc;
              if (ph.key === "[新規追加する追加事業目的]") ph.value = np;
            } else if (appState.taskType === "BRANCH_CHANGE") {
              const na = document.getElementById("opt-newaddress")?.value || "";
              if (ph.key === "[移転先新本店所在地]") ph.value = na;
            }
          });

          let warnMsg = "ローカルの静的テンプレートから基礎書類を起案しました。";
          if (appState.uploadedFiles.length > 0) {
            warnMsg = "⚠️ 接続エラーまたはAPIキー未設定のため、OCR解析をスキップし、" + warnMsg + "\\n(OCR解析やリアルタイムAI生成を利用する場合は、右上からAPIキーを登録してください。)";
          }
          alert(warnMsg);
        }

        // 自動保存
        saveCurrentToHistory();
        switchTab("editor");

      } catch (err) {
        console.error(err);
        alert("エラーが発生しました: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }

    // ブラウザ内からGeminiを直接コールする
    async function callGeminiDirectly(key, files, taskType, additional) {
      const systemInstruction = \`あなたは企業の法務・登記のエキスパートです。
ユーザーから送信された資料を正確に読み取り、商業登記に必要な以下の3種類の書類テキスト原案を自動生成してください。
1. id: "minutes" -> 議事録または取締役決定書
2. id: "application" -> 登記申請書案（別紙含む）
3. id: "checklist" -> 必要書類チェックリスト ＆ ガイド

【規則】
- 後から入力する箇所は、必ず "[ 年 月 日 ]" や "[氏名]" などの「ブラケット [ ]」で括ってください。
- contentはMarkdown形式。
- JSONスキーマに必ず沿って出力すること。\`;

      let taskName = "商業登記変更";
      if (taskType === "DIRECTOR_CHANGE") taskName = "役員変更";
      else if (taskType === "ARTICLES_CHANGE") taskName = "定款変更";
      else if (taskType === "BRANCH_CHANGE") taskName = "本店移転・支店設置";

      const userPrompt = \`種類: \${taskName} (コード: \${taskType})
補足指示: \${additional || "特になし"}

アップロードされた資料の内容を可能な限りOCRして正確に読み取り、
1. 議事録案 2. 登記申請書案 3. チェックリスト
を作成してください。不明箇所はプレースホルダーに抽出し、detectedPlaceholdersに吐き出してください。\`;

      const parts = [];
      for (const f of files) {
        const b64 = f.base64.replace(/^data:([^;]+);base64,/, "");
        let mime = f.type || "image/png";
        parts.push({ inlineData: { data: b64, mimeType: mime } });
      }
      parts.push({ text: userPrompt });

      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + key;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                success: { type: "BOOLEAN" },
                companyInfo: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    address: { type: "STRING" },
                    representative: { type: "STRING" }
                  },
                  required: ["name", "address", "representative"]
                },
                documents: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: { type: "STRING" },
                      title: { type: "STRING" },
                      content: { type: "STRING" }
                    },
                    required: ["id", "title", "content"]
                  }
                },
                detectedPlaceholders: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      key: { type: "STRING" },
                      label: { type: "STRING" }
                    },
                    required: ["key", "label"]
                  }
                }
              },
              required: ["success", "companyInfo", "documents", "detectedPlaceholders"]
            }
          }
        })
      });

      if (!response.ok) throw new Error("Gemini APIエラー: " + response.status);
      const resJson = await response.json();
      const rawText = resJson.candidates[0].content.parts[0].text;
      return JSON.parse(rawText);
    }

    // EDITOR RENDER
    function renderEditor() {
      const containerEmpty = document.getElementById("editor-empty");
      const containerMain = document.getElementById("editor-container");

      if (appState.documents.length === 0) {
        containerEmpty.classList.remove("hidden");
        containerMain.classList.add("hidden");
        return;
      }
      containerEmpty.classList.add("hidden");
      containerMain.classList.remove("hidden");

      // プレースホルダーのレンダリング
      const phContainer = document.getElementById("placeholder-fields");
      phContainer.innerHTML = "";
      appState.detectedPlaceholders.forEach((p, idx) => {
        const div = document.createElement("div");
        div.className = "space-y-1";
        div.innerHTML = \`<label class="text-[10px] font-bold text-slate-500 flex items-center justify-between">
          <span>\${p.label}</span>
          <span class="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 text-[9px]">\${p.key}</span>
        </label>
        <input type="text" value="\${p.value || ""}" oninput="updatePlaceholderVal(\${idx}, this.value)" class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"> \`;
        phContainer.appendChild(div);
      });

      // 書類切り替えタブ
      const tabs = document.getElementById("editor-doc-tabs");
      tabs.innerHTML = "";
      appState.documents.forEach((doc, idx) => {
        const active = idx === appState.activeDocIndex;
        const btn = document.createElement("button");
        btn.onclick = () => { appState.activeDocIndex = idx; renderEditor(); };
        btn.className = active 
          ? "flex items-center space-x-1.5 px-3 py-2 text-xs font-bold border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
          : "flex items-center space-x-1.5 px-3 py-2 text-xs font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800";
        btn.innerHTML = \`<i data-lucide="file-text" class="w-3.5 h-3.5 \${active ? 'text-indigo-600':'text-slate-400'}"></i><span>\${doc.title}</span>\`;
        tabs.appendChild(btn);
      });

      updateActiveDocPreview();
      lucide.createIcons();
    }

    function updatePlaceholderVal(idx, val) {
      appState.detectedPlaceholders[idx].value = val;
      updateActiveDocPreview();
      saveCurrentToHistory();
    }

    function updateActiveDocPreview() {
      if (appState.documents.length === 0) return;
      const doc = appState.documents[appState.activeDocIndex];
      document.getElementById("active-doc-title").innerText = doc.title;
      document.getElementById("editor-textarea").value = doc.content;

      const processed = getProcessedText(doc.content);
      const html = parseMarkdown(processed);
      document.getElementById("editor-preview").innerHTML = html;

      // 印刷用
      document.getElementById("print-title").innerText = doc.title;
      document.getElementById("print-content").innerHTML = html;
    }

    function getProcessedText(raw) {
      let t = raw;
      appState.detectedPlaceholders.forEach(p => {
        if (p.value) {
          t = t.split(p.key).join(p.value);
        }
      });
      return t;
    }

    function handleEditorTextChange(val) {
      appState.documents[appState.activeDocIndex].content = val;
      const processed = getProcessedText(val);
      const html = parseMarkdown(processed);
      document.getElementById("editor-preview").innerHTML = html;
      document.getElementById("print-content").innerHTML = html;
    }

    function toggleEditorEditMode() {
      appState.editorEditMode = !appState.editorEditMode;
      const btn = document.getElementById("btn-toggle-edit");
      const txt = document.getElementById("txt-toggle-edit");
      const ta = document.getElementById("editor-textarea");

      if (appState.editorEditMode) {
        ta.classList.remove("hidden");
        txt.innerText = "プレビュー";
        btn.className = "flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1.5 rounded-lg border border-transparent cursor-pointer shadow-xs";
        ta.focus();
      } else {
        ta.classList.add("hidden");
        txt.innerText = "直接編集";
        btn.className = "flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 cursor-pointer shadow-xs";
        updateActiveDocPreview();
      }
    }

    // Markdown Parser
    function parseMarkdown(md) {
      const lines = md.split("\\n");
      let inList = false;
      let inTable = false;
      let out = [];

      lines.forEach(l => {
        const trimmed = l.trim();

        if (trimmed.startsWith("|")) {
          if (inList) { out.push("</ul>"); inList = false; }
          if (trimmed.match(/^\\|[\\s-|-]*\\|$/)) return;
          const cols = trimmed.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
          if (!inTable) {
            inTable = true;
            out.push('<div class="overflow-x-auto my-3"><table class="min-w-full border border-slate-200 text-xs">');
            out.push('<thead class="bg-slate-50"><tr>');
            cols.forEach(c => out.push(\`<th class="border border-slate-200 px-3 py-1.5 text-left font-bold">\${c}</th>\`));
            out.push('</tr></thead><tbody class="bg-white">');
          } else {
            out.push('tr');
            cols.forEach(c => out.push(\`<td class="border border-slate-200 px-3 py-1.5">\${c}</td>\`));
            out.push('</tr>');
          }
          return;
        } else if (inTable) {
          out.push('</tbody></table></div>');
          inTable = false;
        }

        if (trimmed.startsWith("### ")) {
          if (inList) { out.push("</ul>"); inList = false; }
          out.push(\`<h4 class="text-sm font-bold text-slate-800 mt-4 mb-2 border-l-4 border-indigo-500 pl-2">\${trimmed.substring(4)}</h4>\`);
        } else if (trimmed.startsWith("## ")) {
          if (inList) { out.push("</ul>"); inList = false; }
          out.push(\`<h3 class="text-base font-bold text-slate-900 mt-5 mb-2 border-b border-slate-100 pb-1">\${trimmed.substring(3)}</h3>\`);
        } else if (trimmed.startsWith("# ")) {
          if (inList) { out.push("</ul>"); inList = false; }
          out.push(\`<h2 class="text-lg font-bold text-indigo-950 mt-6 mb-3 border-b-2 border-indigo-100 pb-1.5">\${trimmed.substring(2)}</h2>\`);
        } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          if (!inList) { inList = true; out.push('<ul class="list-disc pl-5 my-2 space-y-1 text-xs">'); }
          let item = trimmed.substring(2).replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
          out.push(\`<li>\${item}</li>\`);
        } else if (trimmed === "") {
          if (inList) { out.push("</ul>"); inList = false; }
          out.push('<div class="h-2"></div>');
        } else {
          if (inList) { out.push("</ul>"); inList = false; }
          let item = l.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
          out.push(\`<p class="my-1 text-xs leading-relaxed">\${item}</p>\`);
        }
      });
      if (inList) out.push("</ul>");
      if (inTable) out.push("</tbody></table></div>");
      return out.join("");
    }

    // TODO TIMELINE
    function renderTodoList() {
      const container = document.getElementById("todo-list");
      container.innerHTML = "";

      if (appState.tasks.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 py-6 text-center">タスクがありません。「資料インポート ＆ 生成」タブで書類を起案してください。</p>';
        updateTodoProgress(0);
        return;
      }

      let doneCount = 0;
      appState.tasks.forEach((t, idx) => {
        const done = t.status === "DONE";
        if (done) doneCount++;

        const card = document.createElement("div");
        card.className = \`flex items-center justify-between p-3 rounded-lg border \${done ? 'bg-slate-50 border-slate-200 text-slate-400':'bg-white border-slate-200 text-slate-800 hover:border-slate-300'} text-xs shadow-xs\`;
        card.innerHTML = \`<div class="flex items-center space-x-3">
          <input type="checkbox" \${done ? 'checked':''} onchange="toggleTaskStatus(\${idx})" class="w-4 h-4 text-indigo-600 rounded cursor-pointer border-slate-300">
          <div>
            <p class="font-bold \${done ? 'line-through text-slate-400':''}">\${t.title}</p>
            <span class="inline-block px-1.5 py-0.2 mt-1 rounded text-[9px] bg-slate-100 text-slate-500 border border-slate-200 font-medium">\${t.category}</span>
          </div>
        </div>
        <button onclick="deleteTask(\${idx})" class="text-slate-400 hover:text-red-500 p-1 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i></button>\`;
        container.appendChild(card);
      });

      const prog = Math.round((doneCount / appState.tasks.length) * 100);
      updateTodoProgress(prog);
      lucide.createIcons();
    }

    function toggleTaskStatus(idx) {
      appState.tasks[idx].status = appState.tasks[idx].status === "DONE" ? "TODO" : "DONE";
      renderTodoList();
      saveCurrentToHistory();
    }

    function deleteTask(idx) {
      appState.tasks.splice(idx, 1);
      renderTodoList();
      saveCurrentToHistory();
    }

    function addCustomTask() {
      const t = document.getElementById("todo-input-title").value.trim();
      const c = document.getElementById("todo-input-cat").value;
      if (!t) return;
      appState.tasks.push({ title: t, category: c, status: "TODO" });
      document.getElementById("todo-input-title").value = "";
      renderTodoList();
      saveCurrentToHistory();
    }

    function updateTodoProgress(prog) {
      document.getElementById("todo-progress-text").innerText = "進捗: " + prog + "%";
      document.getElementById("todo-progress-bar").style.width = prog + "%";
    }

    // HISTORY (LOCAL STORAGE)
    function loadLocalHistory() {
      try {
        const raw = localStorage.getItem("commercial_registry_archives");
        appState.archives = raw ? JSON.parse(raw) : [];
      } catch (e) {
        appState.archives = [];
      }
    }

    function saveCurrentToHistory() {
      if (appState.documents.length === 0) return;
      loadLocalHistory();

      const item = {
        id: embeddedData ? embeddedData.id : "local-" + Date.now(),
        companyInfo: appState.companyInfo,
        taskType: appState.taskType,
        createdAt: new Date().toISOString(),
        documents: appState.documents,
        detectedPlaceholders: appState.detectedPlaceholders,
        tasks: appState.tasks
      };

      const existingIdx = appState.archives.findIndex(a => a.id === item.id);
      if (existingIdx >= 0) {
        appState.archives[existingIdx] = item;
      } else {
        appState.archives.unshift(item);
      }

      localStorage.setItem("commercial_registry_archives", JSON.stringify(appState.archives));
    }

    function renderHistoryList() {
      loadLocalHistory();
      const containerEmpty = document.getElementById("archive-empty");
      const containerList = document.getElementById("archive-list");

      if (appState.archives.length === 0) {
        containerEmpty.classList.remove("hidden");
        containerList.classList.add("hidden");
        return;
      }
      containerEmpty.classList.add("hidden");
      containerList.classList.remove("hidden");
      containerList.innerHTML = "";

      appState.archives.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all text-xs gap-3 shadow-xs";
        
        const dateStr = item.createdAt.split("T")[0];
        const label = getTaskLabelName(item.taskType);

        div.innerHTML = \`<div class="space-y-1.5 min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-slate-800 text-sm truncate">\${item.companyInfo.name || "未指定"}</span>
            <span class="px-2 py-0.5 rounded-full text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold">\${label}</span>
          </div>
          <div class="flex gap-4 text-slate-400 text-[10px]">
            <span>代表: \${item.companyInfo.representative || "未指定"}</span>
            <span>作成日: \${dateStr}</span>
            <span>書類数: \${item.documents?.length || 0}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="loadHistoryItem('\${item.id}')" class="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold">読込</button>
          <button onclick="exportHistoryToJSON('\${item.id}')" class="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg font-bold">JSON</button>
          <button onclick="deleteHistoryItem('\${item.id}')" class="flex items-center justify-center text-slate-400 hover:text-red-500 p-2 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>\`;
        containerList.appendChild(div);
      });
      lucide.createIcons();
    }

    function getTaskLabelName(type) {
      if (type === "DIRECTOR_CHANGE") return "役員変更";
      if (type === "ARTICLES_CHANGE") return "定款変更";
      if (type === "BRANCH_CHANGE") return "本店移転";
      return "その他";
    }

    function loadHistoryItem(id) {
      loadLocalHistory();
      const item = appState.archives.find(a => a.id === id);
      if (!item) return;

      appState.companyInfo = item.companyInfo;
      appState.taskType = item.taskType;
      appState.documents = item.documents;
      appState.detectedPlaceholders = item.detectedPlaceholders;
      appState.tasks = item.tasks;
      appState.activeDocIndex = 0;

      // 会社基本項目を起案画面に復元
      document.getElementById("input-comp-name").value = item.companyInfo.name;
      document.getElementById("input-comp-rep").value = item.companyInfo.representative;
      document.getElementById("input-comp-address").value = item.companyInfo.address;

      alert(\`「\${item.companyInfo.name}」のデータを読み込みました！\`);
      switchTab("editor");
    }

    function deleteHistoryItem(id) {
      if (!confirm("本当にこの履歴を削除しますか？")) return;
      loadLocalHistory();
      appState.archives = appState.archives.filter(a => a.id !== id);
      localStorage.setItem("commercial_registry_archives", JSON.stringify(appState.archives));
      renderHistoryList();
    }

    function exportHistoryToJSON(id) {
      loadLocalHistory();
      const item = appState.archives.find(a => a.id === id);
      if (!item) return;

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item, null, 2));
      const a = document.createElement("a");
      a.href = dataStr;
      a.download = \`commercial_registry_\${item.companyInfo.name || "company"}.json\`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    // SINGLE JSON IMPORT/EXPORT (ACTIVE PROJECT)
    function triggerJSONImport() {
      document.getElementById("json-file-input").click();
    }

    function importSingleJSON(event) {
      const f = event.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.companyInfo || !parsed.documents) {
            alert("有効な登記データJSONファイルではありません。");
            return;
          }
          appState.companyInfo = parsed.companyInfo;
          appState.taskType = parsed.taskType || "OTHER";
          appState.documents = parsed.documents;
          appState.detectedPlaceholders = parsed.detectedPlaceholders || [];
          appState.tasks = parsed.tasks || [];
          appState.activeDocIndex = 0;

          document.getElementById("input-comp-name").value = parsed.companyInfo.name || "";
          document.getElementById("input-comp-rep").value = parsed.companyInfo.representative || "";
          document.getElementById("input-comp-address").value = parsed.companyInfo.address || "";

          alert("登記データを正常にインポートしました。");
          switchTab("editor");
        } catch (err) {
          alert("JSONのパースに失敗しました。");
        }
      };
      reader.readAsText(f);
      event.target.value = "";
    }

    function exportSingleJSON() {
      if (appState.documents.length === 0) {
        alert("エクスポートするアクティブな書類がありません。まずは自動生成してください。");
        return;
      }
      const data = {
        id: embeddedData ? embeddedData.id : "portable-" + Date.now(),
        companyInfo: appState.companyInfo,
        taskType: appState.taskType,
        createdAt: new Date().toISOString(),
        documents: appState.documents,
        detectedPlaceholders: appState.detectedPlaceholders,
        tasks: appState.tasks
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const a = document.createElement("a");
      a.href = dataStr;
      a.download = \`commercial_registry_\${appState.companyInfo.name || "company"}.json\`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  </script>
</body>
</html>`;
}
