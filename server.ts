import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// JSONのボディ制限を50MBに引き上げて大容量ファイルを扱えるようにする
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Gemini APIクライアントの初期化（サーバーサイド限定）
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please set it in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// 登記書類生成 API
app.post("/api/generate-docs", async (req, res) => {
  try {
    const { files, taskType, additionalPrompt } = req.body;

    if (!taskType) {
      return res.status(400).json({ success: false, error: "登記の種類 (taskType) が指定されていません。" });
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        success: false,
        error: "Gemini APIの初期化に失敗しました。APIキーが設定されているか確認してください。"
      });
    }

    // ユーザーに提示する登記種類名
    let taskName = "商業登記変更";
    if (taskType === "DIRECTOR_CHANGE") taskName = "役員（取締役・代表取締役・監査役）の変更";
    else if (taskType === "ARTICLES_CHANGE") taskName = "定款の変更（商号、目的、本店移転など）";
    else if (taskType === "BRANCH_CHANGE") taskName = "支店の設置・移転・廃止";
    else if (taskType === "OTHER") taskName = "その他の登記（自由指示含む）";

    // プロンプトの構築
    const systemInstruction = `あなたは企業の法務・登記のエキスパート（司法書士・法務部長レベル）です。
ユーザーから送信（インポート）された登記関連資料（各種議事録の下書き、決定書、定款、謄本情報、手書きのメモ、PDF、画像など）を正確に読み取り、
商業登記申請に必要な以下の3種類の正確な書類テキスト原案を自動生成してください。

【作成すべき3種類の書類】
1. id: "minutes" -> 登記事由に応じた「株主総会議事録」または「取締役会議事録」または「取締役決定書」（会社法および商業登記規則に厳格に準拠した形式で出力すること）
2. id: "application" -> 「登記申請書（別紙：登記すべき事項も含む）」（会社名、登記の事由、登記すべき事項、登録免許税、添付書面などを明記すること）
3. id: "checklist" -> 「必要書類チェックリスト ＆ 手続きガイド」（申請に必要な全添付書類の一覧、用意する人、実印押印の要否、および申請完了までのステップガイドをわかりやすく提示すること）

【重要なフォーマット規則】
- 日付や氏名、本店所在地など、ユーザーが後から確認・入力すべき穴埋め箇所は、必ず "[ 年 月 日 ]" や "[氏名]"、"[会社名]" などのように一貫して「ブラケット [ ]」で括ってください。
- 生成された書類テキスト (content) はMarkdown形式で、見出しや箇条書きを用いて、視認性が高く、コピペしやすい構造に整理してください。
- インポートされた資料の一部が欠けている、または読みづらい場合でも、文脈や日本の会社法の標準的な実務から推測して、可能な限り現実に即した暫定案・ドラフトを補完してください。

【出力JSONスキーマ】
必ず指定したJSONスキーマに従ってレスポンスを返してください。`;

    // コンテンツパーツの組み立て
    const parts: any[] = [];

    // ファイルがある場合はパーツに追加
    if (files && Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        // base64データからプレフィックス（例: data:image/png;base64,）をトリミング
        const base64Data = file.base64.replace(/^data:([^;]+);base64,/, "");
        let mimeType = file.type;
        
        // mimeTypeが不明な場合のフォールバック
        if (!mimeType) {
          if (file.name.endsWith(".pdf")) mimeType = "application/pdf";
          else if (file.name.endsWith(".png")) mimeType = "image/png";
          else if (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) mimeType = "image/jpeg";
          else mimeType = "image/png"; // デフォルト
        }

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }
    }

    // テキスト指示の組み立て
    let userPrompt = `
【今回の登記申請業務】
種類: ${taskName} (コード: ${taskType})

【補足指示・追加情報】
${additionalPrompt || "特になし。インポートされた資料を優先して書類を作成してください。"}

【書類作成の指示】
アップロードされた資料の内容（文字・数値）を一言一句正確に抽出し、それを基盤として：
1. 取締役の変更、定款変更、本店・支店変更など、申請の種類に最適な「議事録案」（「臨時株主総会議事録」など）
2. 管轄法務局に提出する「登記申請書案（別紙 登記すべき事項を含む）」
3. 必要書類チェックリストと手続きフロー

をそれぞれ作成してください。
日付、商号、氏名、住所、登録免許税、登記にかかる議決権数などの数値、その他の箇所で、インポートされた書類に記述がなく不明な場合は、必ず「[会社名]」「[ 年 月 日 ]」「[氏名]」などのプレースホルダーを記述し、その一覧を detectedPlaceholders に出力してください。
`;

    parts.push({ text: userPrompt });

    console.log(`Gemini API calling for task type: ${taskType}, files count: ${files?.length || 0}`);

    // Gemini 3.5 Flashモデルで処理（視覚認識＋高速構造化出力）
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            success: { type: Type.BOOLEAN },
            companyInfo: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "抽出された会社名（商号）。不明な場合は空文字" },
                address: { type: Type.STRING, description: "抽出された本店所在地。不明な場合は空文字" },
                representative: { type: Type.STRING, description: "抽出された代表取締役氏名。不明な場合は空文字" }
              },
              required: ["name", "address", "representative"]
            },
            documents: {
              type: Type.ARRAY,
              description: "生成された書類のリスト。'minutes'、'application'、'checklist' の3つのidを必ず含めること。",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "書類ID（'minutes'、'application'、'checklist'のいずれか）" },
                  title: { type: Type.STRING, description: "書類の名称。例: '臨時株主総会議事録', '取締役決定書', '株式会社変更登記申請書' など" },
                  content: { type: Type.STRING, description: "Markdown形式の書類原案。穴埋めが必要な箇所は必ずブラケット[ ]で囲んでください。例: '[ 年 月 日 ]', '[代表取締役 氏名]'" }
                },
                required: ["id", "title", "content"]
              }
            },
            detectedPlaceholders: {
              type: Type.ARRAY,
              description: "書類内で使用したプレースホルダー（穴埋め項目）のキーとラベルの一覧。",
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING, description: "プレースホルダーのキー。書類内の文字列と完全に一致するもの。例: '[代表取締役 氏名]', '[ 年 月 日 ]', '[本店所在地]'" },
                  label: { type: Type.STRING, description: "ユーザー向けの入力欄ラベル。例: '代表取締役 氏名', '登記日（決議日）', '新しい本店所在地'" }
                },
                required: ["key", "label"]
              }
            }
          },
          required: ["success", "companyInfo", "documents", "detectedPlaceholders"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Geminiから有効なレスポンスが返されませんでした。");
    }

    const parsedData = JSON.parse(resultText);
    res.json(parsedData);

  } catch (error: any) {
    console.error("Error generating documents:", error);
    res.status(500).json({
      success: false,
      error: error.message || "書類の生成中にエラーが発生しました。"
    });
  }
});

// Vite または 静的ファイル配信
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
