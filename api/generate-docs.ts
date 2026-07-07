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

    // OAuth 2 Access Token を取得
    const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_ACCESS_TOKEN が設定されていません。" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Gemini API 呼び出し（Bearer 認証）
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
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

    // Gemini API がエラーを返した場合
    if (!geminiRes.ok) {
      return new Response(
        JSON.stringify({
          error: result.error?.message || "Gemini API エラーが発生しました。"
        }),
        { status: geminiRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 正常レスポンス
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: String(err.message || err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
