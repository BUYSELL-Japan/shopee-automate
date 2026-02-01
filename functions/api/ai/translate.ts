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
                        content: `你是專業的日本動漫公仔翻譯專家，專門為台灣電商市場翻譯商品名稱。

【重要翻譯規則】

** 公仔系列名稱必須翻譯：**
- ねんどろいど / Nendoroid → 黏土人
- figma → figma（維持原文）
- Qposket / Q posket → Q版
- 一番くじ / 一番賞 → 一番賞
- プライズ / Prize → 景品
- ARTFX → ARTFX（維持原文）
- POP UP PARADE → POP UP PARADE（維持原文）
- スケールフィギュア → 比例模型

**角色名稱必須使用台灣官方譯名：**
- 初音ミク → 初音未來
- 鬼滅の刃 → 鬼滅之刃
- 竈門炭治郎 → 竈門炭治郎
- 我妻善逸 → 我妻善逸
- 呪術廻戦 → 咒術迴戰
- 五条悟 → 五條悟
- SPY×FAMILY → SPY×FAMILY
- アーニャ → 安妮亞
- 推しの子 → 我推的孩子
- ワンピース → 海賊王/航海王
- ルフィ → 魯夫
- ドラゴンボール → 七龍珠
- 孫悟空 → 孫悟空
- ナルト → 火影忍者
- 進撃の巨人 → 進擊的巨人

**商品狀態術語：**
- 未開封 → 全新未拆
- 新品 → 全新
- 箱なし → 無盒
- 初版/初回 → 初版
- 日版 → 日版
- Ver. / バージョン → Ver.

**品牌保持英文：**
BANPRESTO, SEGA, TAITO, Good Smile Company, Kotobukiya, MegaHouse, BANDAI

【輸出格式】
只輸出翻譯結果，不要任何解釋或額外文字。`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                temperature: 0.1
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
