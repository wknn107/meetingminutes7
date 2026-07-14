export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  try {
    // 1. フロントから送られてきたデータを受け取る
    const form = await req.formData();
    const file = form.get("file") as File; // "file" という名前で送られてくる前提

    if (!file) {
      return new Response(JSON.stringify({ error: "ファイルがありません" }), { status: 400 });
    }

    // 2. ファイルをBase64文字列に変換（ここが重要！）
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64File = btoa(binary);

    // 3. Geminiに送るデータを組み立てる（JSON形式）
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: "以下のPDFを解析して商業登記書類を生成してください。" },
              {
                inline_data: {
                  mime_type: file.type,
                  data: base64File
                }
              }
            ]
          }]
        })
      }
    );

    const result = await response.json();
    return new Response(JSON.stringify(result), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
