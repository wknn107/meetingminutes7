import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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
  return new GoogleGenerativeAI(apiKey);
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
1. id: "minutes" -> 登記事由に応じた「株主総会議事録」または「取締役会議事録」または「取締役決定書」
2. id: "application" -> 「登記申請書（別紙：登記すべき事項も含む）」
3. id: "checklist" -> 「必要書類チェックリスト ＆ 手続きガイド」

【重要なフォーマット規則】
- 日付や氏名、本店所在地などは必ずブラケット [ ] で括ること
- Markdown形式で視認性高く出力すること
- 不明箇所は推測しつつプレースホルダーを使うこと

【出力JSONスキーマ】
必ず指定したJSONスキーマに従ってレスポンスを返してください。`;

    // コンテンツパーツの組み立て
    const parts: any[] = [];

    // ファイルがある場合はパーツに追加
    if (files && Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        const base64Data = file.base64.replace(/^data:([^;]+);base64,/, "");
        let mimeType = file.type;

        if (!mimeType) {
          if (file.name.endsWith(".pdf")) mimeType = "application/pdf";
          else if (file.name.endsWith(".png")) mimeType = "image/png";
          else if (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) mimeType = "image/jpeg";
          else mimeType = "image/png";
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
アップロードされた資料の内容を正確に抽出し、議事録案・申請書案・チェックリストを作成してください。
不明箇所は必ずプレースホルダーを使い、detectedPlaceholders に一覧を出力してください。
`;

    parts.push({ text: userPrompt });

    console.log(`Gemini API calling for task type: ${taskType}, files count: ${files?.length || 0}`);

    // Gemini 3.5 Flashモデルで処理
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            success: { type: SchemaType.BOOLEAN },
            companyInfo: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                address: { type: SchemaType.STRING },
                representative: { type: SchemaType.STRING }
              },
              required: ["name", "address", "representative"]
            },
            documents: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  title: { type: SchemaType.STRING },
                  content: { type: SchemaType.STRING }
                },
                required: ["id", "title", "content"]
              }
            },
            detectedPlaceholders: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  key: { type: SchemaType.STRING },
                  label: { type: SchemaType.STRING }
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
