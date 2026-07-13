export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  try {
    // 1. FormDataの受け取り
    const form = await req.formData();
    // 画面側のコードに合わせて取得（filesとして複数送られてくる想定）
    const file = form.get("files") as File; 

    if (!file) {
      return new Response(JSON.stringify({ error: "ファイルがありません" }), { status: 400 });
    }

    // 2. ファイルをBase64に変換（Geminiが読み取れる形式にするため）
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64File = btoa(binary);

    // 3. APIキーの準備（環境変数 GEMINI_API_KEY を使います）
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "APIキーが設定されていません" }), { status: 500 });
    }

    // 4. Gemini API 呼び出し（キー認証方式に変更）
    // URLの末尾に ?key=YOUR_API_KEY をつけるだけでOKです
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: "以下のファイルを解析し、商業登記に必要な書類を生成してください。" },
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
    });

    const result = await geminiRes.json();
    return new Response(JSON.stringify(result), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
