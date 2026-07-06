export const config = {
  runtime: "edge",
};

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export default async function handler(req: Request) {
  try {
    const body = await req.json();
    const { files, taskType, additionalPrompt } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "APIキーが設定されていません。" }),
        { status: 500 }
      );
    }

    const ai = new GoogleGenerativeAI(apiKey);

    let taskName = "商業登記変更";
    if (taskType === "DIRECTOR_CHANGE") taskName = "役員変更";
    else if (taskType === "ARTICLES_CHANGE") taskName = "定款変更";
    else if (taskType === "BRANCH_CHANGE") taskName = "支店変更";
    else if (taskType === "OTHER") taskName = "その他の登記";

    const systemInstruction = `
あなたは企業の法務・登記のエキスパートです。
アップロードされた資料を読み取り、登記申請に必要な書類を生成してください。
`;

    const parts: any[] = [];

    if (files && Array.isArray(files)) {
      for (const file of files) {
        const base64Data = file.base64.replace(/^data:([^;]+);base64,/, "");
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.type || "application/pdf",
          },
        });
      }
    }

    parts.push({
      text: `
種類: ${taskName}
追加指示: ${additionalPrompt || "なし"}
`,
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts,
        },
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
                representative: { type: SchemaType.STRING },
              },
              required: ["name", "address", "representative"],
            },
            documents: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  title: { type: SchemaType.STRING },
                  content: { type: SchemaType.STRING },
                },
                required: ["id", "title", "content"],
              },
            },
            detectedPlaceholders: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  key: { type: SchemaType.STRING },
                  label: { type: SchemaType.STRING },
                },
                required: ["key", "label"],
              },
            },
          },
          required: ["success", "companyInfo", "documents", "detectedPlaceholders"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Geminiから有効なレスポンスが返されませんでした。");
    }

    return new Response(resultText, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "書類生成中にエラーが発生しました。",
      }),
      { status: 500 }
    );
  }
}
