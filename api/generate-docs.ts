export const config = {
  runtime: "nodejs",
};

export default async function handler(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("files") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "ファイルがありません" }), { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64File = Buffer.from(arrayBuffer).toString("base64");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "APIキーが設定されていません" }), { status: 500 });
    }

    // 1. ファイルアップロード（REST API）
    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: {
            display_name: file.name,
            mime_type: file.type,
            data: base64File,
          },
        }),
      }
    );

    const uploadJson = await uploadRes.json();

    if (!uploadJson?.file?.name) {
      return new Response(JSON.stringify({ error: "ファイルアップロードに失敗しました" }), { status: 500 });
    }

    const fileName = uploadJson.file.name;

    // 2. Gemini に解析依頼
    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: "以下のファイルを解析し、商業登記に必要な書類を生成してください。" },
                {
                  file_data: {
                    file_uri: `files/${fileName}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await genRes.json();
    return new Response(JSON.stringify(result), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
