export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "ファイルがありません" }), { status: 400 });
    }

    // PDF → Base64（Edge Runtimeで壊れない方法）
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    const base64File = btoa(binary);

    // APIキー確認
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "APIキーが設定されていません" }), { status: 400 });
    }

    // Google AI Studio REST API 呼び出し
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
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
            }
          ]
        })
      }
    );

    const result = await response.json();
    return new Response(JSON.stringify(result), { status: 200 });

 } catch (err: any) {
  const message =
    typeof err === "string"
      ? err
      : err?.message || JSON.stringify(err);

  return new Response(JSON.stringify({ error: message }), { status: 500 });
}

}
