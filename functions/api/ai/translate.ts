/**
 * OpenAI 翻訳 API
 * 
 * 日本語を繁体字中国語（台湾）に翻訳します
 */

interface Env {
    OPENAI_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    // CORSプリフライト
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: getCorsHeaders() });
    }

    if (request.method !== "POST") {
        return errorResponse("Method not allowed", 405);
    }

    try {
        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey) {
            return errorResponse("OPENAI_API_KEY is not configured", 500);
        }

        const body = await request.json() as { text: string; target_lang?: string };
        const { text, target_lang = "Traditional Chinese (Taiwan)" } = body;

        if (!text) {
            return errorResponse("text is required", 400);
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `あなたはアニメ・マンガ・ゲーム文化に精通した、台湾市場向けフィギュア商品のエキスパート翻訳者です。

【あなたの専門知識】
- 日本のアニメ、マンガ、ゲームの公式台湾語タイトル・キャラクター名
- フィギュアメーカー（BANPRESTO、SEGA、タイトー、グッドスマイルカンパニー等）の製品用語
- 台湾のフィギュアコレクター向けの自然な表現

【翻訳ルール】
1. キャラクター名・作品タイトルは台湾での公式名称を使用（例：鬼滅の刃→鬼滅之刃、炭治郎→炭治郎）
2. シリーズ名は正確に翻訳（例：Qposket→Q posket、一番くじ→一番賞）
3. フィギュア用語は台湾標準に従う：
   - 未開封 → 全新未拆
   - 箱なし → 無盒
   - 初版/初回 → 初版
   - プライズ → 景品
   - スケールフィギュア → 比例模型
4. 製品コード（A賞、B賞等）はそのまま維持
5. ブランド名は英語のまま維持（BANPRESTO, SEGA, TAITO等）
6. 余計な挨拶・説明・装飾文言は一切追加しない
7. 翻訳結果のみを出力する

【出力形式】
翻訳結果のみ。説明や補足は不要。`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                temperature: 0.2
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("OpenAI API Error:", data.error);
            return errorResponse(`OpenAI Error: ${data.error.message}`, 500);
        }

        const translatedText = data.choices[0]?.message?.content?.trim() || "";

        return new Response(JSON.stringify({
            status: "success",
            translation: translatedText
        }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...getCorsHeaders() },
        });

    } catch (error) {
        console.error("Translation error:", error);
        return errorResponse(`Server Error: ${error}`, 500);
    }
};

function getCorsHeaders(): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

function errorResponse(message: string, status: number): Response {
    return new Response(JSON.stringify({ status: "error", message }), {
        status,
        headers: { "Content-Type": "application/json", ...getCorsHeaders() },
    });
}
