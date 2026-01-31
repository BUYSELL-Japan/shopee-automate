
interface Env {
    DB: D1Database;
    SHOPEE_PARTNER_ID: string;
    SHOPEE_PARTNER_KEY: string;
}

const SHOPEE_HOST = "https://partner.shopeemobile.com";

const TARGET_BRANDS = [
    "Bandai Spirits",
    "Good Smile Company",
    "Taito",
    "Furyu",
    "Kotobukiya",
    "MegaHouse"
];

export const onRequest: PagesFunction<Env> = async (context) => {
    const { env } = context;


    try {
        // 1. Hardcoded Token (retrieved from remote D1)
        const accessToken = "eyJhbGciOiJIUzI1NiJ9.COb9ehABGLWt-ZEGIAEo7In6ywYwy4Sc-wc4AUAB.ePEgzNqprRLkSw9obpMn_t0Vbt_BJOpuDVpT4_SuKj0";
        const shopId = 1648252597;
        const partnerId = env.SHOPEE_PARTNER_ID;
        const partnerKey = env.SHOPEE_PARTNER_KEY;

        if (!partnerId || !partnerKey) {
            return new Response("Missing Partner ID/Key in env", { status: 500 });
        }

        const logs: string[] = [];
        const results: any = {};

        // 2. Get Categories to find "Figure" or "Anime"
        // hierarchy: Hobbies & Collections -> Action Figures & Statues -> Action Figures
        // We will try to fetch categories and traverse or search.

        logs.push("Fetching categories...");
        const categories = await getCategories(partnerId, partnerKey, accessToken, shopId);

        // Simple search for likely category
        let targetCategoryId: number | null = null;

        // Helper to recursively search
        const findCategory = (cats: any[], keywords: string[]): number | null => {
            for (const cat of cats) {
                if (keywords.some(k => cat.display_category_name?.toLowerCase().includes(k))) {
                    // Prefer leaf category
                    if (!cat.has_children) {
                        return cat.category_id;
                    }
                }
                if (cat.has_children && cat.children) {
                    const found = findCategory(cat.children, keywords);
                    if (found) return found;
                }
            }
            return null;
        };

        // Try to find "Action Figures" or similar
        // Note: Shopee structure varies, but usually under Hobbies. 
        // We actually need the BRAND list, which is category specific.
        // Let's try to find a category that likely has these brands. "Action Figures" is a good bet.
        const targetCatId = findCategory(categories, ["figure", "action figure", "anime"]);

        if (!targetCatId) {
            return new Response(JSON.stringify({ error: "Could not find target category", logs, categories_sample: categories.slice(0, 3) }), { status: 404 });
        }

        logs.push(`Found category ID: ${targetCatId}`);
        results.category_id = targetCatId;

        // 3. Get Brand List
        logs.push(`Fetching brands for category ${targetCatId}...`);
        const brandList = await getBrandList(partnerId, partnerKey, accessToken, shopId, targetCatId);

        // 4. Filter Brands
        // 4. Refined Search
        const foundBrands: any[] = [];
        const missingBrands: string[] = [];
        const candidates: any[] = [];

        for (const target of TARGET_BRANDS) {
            // Fuzzy search candidates
            const potential = brandList.filter((b: any) => {
                const name = b.display_brand_name?.toLowerCase() || "";
                const original = b.original_brand_name?.toLowerCase() || "";
                const t = target.toLowerCase();
                // Check for partial match if short, or specific known variations
                if (name.includes(t) || original.includes(t)) return true;

                // Specific checks
                if (target === "Bandai Spirits" && (name.includes("bandai") || name === "banpresto")) return true;
                if (target === "MegaHouse" && name.includes("mega")) return true;

                return false;
            });

            if (potential.length > 0) {
                // Check exact match
                const exact = potential.find((b: any) =>
                    b.display_brand_name?.toLowerCase() === target.toLowerCase() ||
                    b.original_brand_name?.toLowerCase() === target.toLowerCase()
                );
                if (exact) {
                    foundBrands.push({ target, ...exact });
                } else {
                    candidates.push({ target, candidates: potential.map((p: any) => ({ name: p.display_brand_name, id: p.brand_id })) });
                    missingBrands.push(target);
                }
            } else {
                missingBrands.push(target);
            }
        }

        results.found = foundBrands;
        results.missing = missingBrands;
        results.candidates = candidates;
        results.all_brands_count = brandList.length;

        // Search in missing brands with partial match if needed? 
        // For now, strict case-insensitive match.

        results.found = foundBrands;
        results.missing = missingBrands;
        results.all_brands_count = brandList.length;

        // return JSON
        return new Response(JSON.stringify(results, null, 2), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (e) {
        return new Response(`Error: ${e} \nStack: ${e.stack}`, { status: 500 });
    }
};

// --- Helpers ---

async function getCategories(partnerId: string, partnerKey: string, accessToken: string, shopId: number) {
    const path = "/api/v2/product/get_category";
    const timestamp = Math.floor(Date.now() / 1000);
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha256(partnerKey, baseString);
    const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&language=en`; // Use English for matching
    const res = await fetch(url);
    const data: any = await res.json();
    if (data.error) throw new Error(`Category API Error: ${data.message} (${data.error})`);

    // The response has category_list. But v2 might structure it differently?
    // detailed doc: response.category_list
    return data.response.category_list;
}

async function getBrandList(partnerId: string, partnerKey: string, accessToken: string, shopId: number, categoryId: number) {
    const path = "/api/v2/product/get_brand_list";
    const timestamp = Math.floor(Date.now() / 1000);
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha256(partnerKey, baseString);
    // pagination supported? 
    // Docs say: offset, page_size. pageSize max 100? or more?
    // We'll try to fetch a few pages if needed.

    let allBrands: any[] = [];
    let offset = 0;
    const pageSize = 100;
    let hasNextPage = true;

    while (hasNextPage) {
        const url = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&category_id=${categoryId}&status=1&offset=${offset}&page_size=${pageSize}&language=en`;
        const res = await fetch(url);
        const data: any = await res.json();
        if (data.error) throw new Error(`Brand API Error: ${data.message}`);

        const list = data.response.brand_list || [];
        allBrands = allBrands.concat(list);

        hasNextPage = data.response.has_next_page;
        offset = data.response.next_offset;

        // Safety break
        if (allBrands.length > 10000) break;
    }

    return allBrands;
}

async function hmacSha256(key: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(message);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}
