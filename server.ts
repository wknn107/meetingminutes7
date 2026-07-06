import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";https://github.com/wknn107/meetingminutes7/blob/main/server.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenerativeAI(apiKey);
};

app.post("/api/generate-docs", async (req, res) => {
  try {
    const { files, taskType, additionalPrompt } = req.body;

    if (!taskType) {
      return res.status(400).json({ success: false, error: "登記の種類 (taskType) が指定されていません。" });
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        error: "Gemini APIの初期化に失敗しました。APIキーが設定されているか確認してください。"
      });
    }

    let taskName = "商業登記変更";
    if (taskType === "DIRECTOR_CHANGE") taskName = "役員変更";
    else if (taskType === "ARTICLES_CHANGE") taskName = "定款変更";
    else if (taskType === "BRANCH_CHANGE") taskName = "支店変更";
    else if (taskType === "OTHER") taskName = "その他の登記";

    const systemInstruction = `
あなたは企業の法務・登記のエキスパートです。
アップロードされた資料を読み取り、登記申請に必要な書類を生成してください。
`;

    const parts = [];

    if (files && Array.isArray(files)) {
      for (const file of files) {
        const base64Data = file.base64.replace(/^data:([^;]+);base64,/, "");
        let mimeType = file.type || "application/pdf";

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType
          }
        });
      }
    }

    parts.push({
      text: `
種類: ${taskName}
追加指示: ${additionalPrompt || "なし"}
`
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: parts
        }
      ],
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

    res.json(JSON.parse(resultText));

  } catch (error) {
    console.error("Error generating documents:", error);
    res.status(500).json({
      success: false,
      error: error.message || "書類生成中にエラーが発生しました。"
    });
  }
});

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
