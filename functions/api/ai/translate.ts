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
                        content: `You are a professional translator specializing in Japanese Anime Figures for the Taiwan market. 
                        Translate the user's input directly into Traditional Chinese (Taiwan).
                        
                        Rules:
                        1. NO conversational fillers, NO greetings, NO sales pitch embellishments.
                        2. Translate ONLY the provided text accurately. Do not add extra sentences.
                        3. Use correct terminology for anime figures (e.g., "未開封" -> "全新未拆", "箱なし" -> "無盒").
                        4. Keep specific product names, model numbers, and brand names in their original language if that is the norm in Taiwan, or use the official Taiwanese translation.
                        5. Output MUST be the translation ONLY.`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                temperature: 0.3
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
