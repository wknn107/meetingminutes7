import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // Vercelの環境変数が設定されているかチェック
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
    }

    const data = await req.json();
    const { taskType, additionalPrompt } = data;

    // AIへの命令（プロンプト）を組み立て
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `${taskType}を作成してください。補足指示: ${additionalPrompt}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 成功レスポンスを返す
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "書類の生成に失敗しました", details: error.message }, { status: 500 });
  }
}
