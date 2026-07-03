import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default async function handler(req, res) {
  // POSTメソッド以外を拒否
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Vercelの環境変数が設定されているかチェック
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "APIキーが設定されていません" });
    }

    const { taskType, additionalPrompt } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `${taskType}を作成してください。補足指示: ${additionalPrompt}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 成功レスポンスを返す
    res.status(200).json({ text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "書類の生成に失敗しました", details: error.message });
  }
}
