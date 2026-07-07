export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  try {
    // フロントから送られた FormData を取得
    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "ファイルが送信されていません。" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // File → Base64 変換
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64File = btoa(binary);

    // APIキー取得（GEMINI_API_KEY を使用）
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "APIキーが設定されていません。" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Gemini API 呼び出し
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: "以下のファイルを解析し、商業登記に必要な書類を生成してください。"
                },
                {
                  inline_data: {
                    mime_type: file.type || "application/pdf",
                    data: base64File
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const result = await geminiRes.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "サーバーエラーが発生しました。" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
