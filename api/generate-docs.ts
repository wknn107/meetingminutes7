import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // APIキーの状態をログに出力（最初の数文字だけ表示して確認）
    if (!apiKey) {
      console.error("DEBUG: APIキーが空です。Vercelの環境変数を確認してください。");
    } else {
      console.log(`DEBUG: APIキーを検知しました (先頭4文字: ${apiKey.substring(0, 4)}...)`);
    }

    const genAI = new GoogleGenerativeAI(apiKey || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // リクエストの中身を解析
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const prompt = `${body.taskType}を作成してください。補足: ${body.additionalPrompt}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.status(200).json({ text });
  } catch (error: any) {
    // 通信エラーの詳細をログに出力
    console.error("CRITICAL ERROR:", error);
    res.status(500).json({ 
      error: "Geminiとの通信に失敗しました", 
      details: error.message,
      type: error.constructor.name 
    });
  }
}
