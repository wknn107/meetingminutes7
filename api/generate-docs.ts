export const config = {
  runtime: "edge",
};

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

    // 最新の REST API エンドポイント（generate）
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          systemInstruction,
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error("Gemini API エラー: " + errText);
    }

    const result = await geminiRes.json();

    return new Response(JSON.stringify(result), {
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
