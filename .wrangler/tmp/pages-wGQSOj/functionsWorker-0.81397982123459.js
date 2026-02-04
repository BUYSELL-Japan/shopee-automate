var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/ai/translate.ts
var onRequest = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
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
    const body = await request.json();
    const { text, target_lang = "zh-TW" } = body;
    if (!text) {
      return errorResponse("text is required", 400);
    }
    const systemPrompts = {
      "zh-TW": `\u4F60\u662F\u5C08\u696D\u7684\u65E5\u672C\u52D5\u6F2B\u516C\u4ED4\u7FFB\u8B6F\u5C08\u5BB6\uFF0C\u5C08\u9580\u70BA\u53F0\u7063\u96FB\u5546\u5E02\u5834\u7FFB\u8B6F\u5546\u54C1\u540D\u7A31\u3002

\u3010\u91CD\u8981\u7FFB\u8B6F\u898F\u5247\u3011

** \u516C\u4ED4\u7CFB\u5217\u540D\u7A31\u5FC5\u9808\u7FFB\u8B6F\uFF1A**
- \u306D\u3093\u3069\u308D\u3044\u3069 / Nendoroid \u2192 \u9ECF\u571F\u4EBA
- figma \u2192 figma\uFF08\u7DAD\u6301\u539F\u6587\uFF09
- Qposket / Q posket \u2192 Q\u7248
- \u4E00\u756A\u304F\u3058 / \u4E00\u756A\u8CDE \u2192 \u4E00\u756A\u8CDE
- \u30D7\u30E9\u30A4\u30BA / Prize \u2192 \u666F\u54C1
- ARTFX \u2192 ARTFX\uFF08\u7DAD\u6301\u539F\u6587\uFF09
- POP UP PARADE \u2192 POP UP PARADE\uFF08\u7DAD\u6301\u539F\u6587\uFF09
- \u30B9\u30B1\u30FC\u30EB\u30D5\u30A3\u30AE\u30E5\u30A2 \u2192 \u6BD4\u4F8B\u6A21\u578B

**\u89D2\u8272\u540D\u7A31\u5FC5\u9808\u4F7F\u7528\u53F0\u7063\u5B98\u65B9\u8B6F\u540D\uFF1A**
- \u521D\u97F3\u30DF\u30AF \u2192 \u521D\u97F3\u672A\u4F86
- \u9B3C\u6EC5\u306E\u5203 \u2192 \u9B3C\u6EC5\u4E4B\u5203
- \u7AC8\u9580\u70AD\u6CBB\u90CE \u2192 \u7AC8\u9580\u70AD\u6CBB\u90CE
- \u6211\u59BB\u5584\u9038 \u2192 \u6211\u59BB\u5584\u9038
- \u546A\u8853\u5EFB\u6226 \u2192 \u5492\u8853\u8FF4\u6230
- \u4E94\u6761\u609F \u2192 \u4E94\u689D\u609F
- SPY\xD7FAMILY \u2192 SPY\xD7FAMILY
- \u30A2\u30FC\u30CB\u30E3 \u2192 \u5B89\u59AE\u4E9E
- \u63A8\u3057\u306E\u5B50 \u2192 \u6211\u63A8\u7684\u5B69\u5B50
- \u30EF\u30F3\u30D4\u30FC\u30B9 \u2192 \u6D77\u8CCA\u738B/\u822A\u6D77\u738B
- \u30EB\u30D5\u30A3 \u2192 \u9B6F\u592B
- \u30C9\u30E9\u30B4\u30F3\u30DC\u30FC\u30EB \u2192 \u4E03\u9F8D\u73E0
- \u5B6B\u609F\u7A7A \u2192 \u5B6B\u609F\u7A7A
- \u30CA\u30EB\u30C8 \u2192 \u706B\u5F71\u5FCD\u8005
- \u9032\u6483\u306E\u5DE8\u4EBA \u2192 \u9032\u64CA\u7684\u5DE8\u4EBA

**\u5546\u54C1\u72C0\u614B\u8853\u8A9E\uFF1A**
- \u672A\u958B\u5C01 \u2192 \u5168\u65B0\u672A\u62C6
- \u65B0\u54C1 \u2192 \u5168\u65B0
- \u7BB1\u306A\u3057 \u2192 \u7121\u76D2
- \u521D\u7248/\u521D\u56DE \u2192 \u521D\u7248
- \u65E5\u7248 \u2192 \u65E5\u7248
- Ver. / \u30D0\u30FC\u30B8\u30E7\u30F3 \u2192 Ver.

**\u54C1\u724C\u4FDD\u6301\u82F1\u6587\uFF1A**
BANPRESTO, SEGA, TAITO, Good Smile Company, Kotobukiya, MegaHouse, BANDAI

\u3010\u8F38\u51FA\u683C\u5F0F\u3011
\u53EA\u8F38\u51FA\u7FFB\u8B6F\u7D50\u679C\uFF0C\u4E0D\u8981\u4EFB\u4F55\u89E3\u91CB\u6216\u984D\u5916\u6587\u5B57\u3002`,
      "en": `You are a professional Japanese anime figure translator, specializing in translating product names for e-commerce markets in Malaysia and English-speaking regions.

\u3010IMPORTANT TRANSLATION RULES\u3011

**Figure Series Names:**
- \u306D\u3093\u3069\u308D\u3044\u3069 / Nendoroid \u2192 Nendoroid
- figma \u2192 figma
- Qposket / Q posket \u2192 Q Posket
- \u4E00\u756A\u304F\u3058 \u2192 Ichiban Kuji / Prize Figure
- \u30D7\u30E9\u30A4\u30BA / Prize \u2192 Prize Figure
- POP UP PARADE \u2192 POP UP PARADE
- \u30B9\u30B1\u30FC\u30EB\u30D5\u30A3\u30AE\u30E5\u30A2 \u2192 Scale Figure

**Character Names - Use Official English Names:**
- \u521D\u97F3\u30DF\u30AF \u2192 Hatsune Miku
- \u9B3C\u6EC5\u306E\u5203 \u2192 Demon Slayer
- \u7AC8\u9580\u70AD\u6CBB\u90CE \u2192 Tanjiro Kamado
- \u6211\u59BB\u5584\u9038 \u2192 Zenitsu Agatsuma
- \u546A\u8853\u5EFB\u6226 \u2192 Jujutsu Kaisen
- \u4E94\u6761\u609F \u2192 Satoru Gojo
- SPY\xD7FAMILY \u2192 SPY\xD7FAMILY
- \u30A2\u30FC\u30CB\u30E3 \u2192 Anya Forger
- \u63A8\u3057\u306E\u5B50 \u2192 Oshi no Ko
- \u30EF\u30F3\u30D4\u30FC\u30B9 \u2192 One Piece
- \u30EB\u30D5\u30A3 \u2192 Luffy
- \u30C9\u30E9\u30B4\u30F3\u30DC\u30FC\u30EB \u2192 Dragon Ball
- \u5B6B\u609F\u7A7A \u2192 Goku
- \u30CA\u30EB\u30C8 \u2192 Naruto
- \u9032\u6483\u306E\u5DE8\u4EBA \u2192 Attack on Titan

**Product Condition Terms:**
- \u672A\u958B\u5C01 \u2192 Sealed / New in Box
- \u65B0\u54C1 \u2192 Brand New
- \u7BB1\u306A\u3057 \u2192 No Box
- \u521D\u7248/\u521D\u56DE \u2192 First Edition
- \u65E5\u7248 \u2192 Japanese Version
- Ver. / \u30D0\u30FC\u30B8\u30E7\u30F3 \u2192 Ver.

**Keep Brand Names in English:**
BANPRESTO, SEGA, TAITO, Good Smile Company, Kotobukiya, MegaHouse, BANDAI

\u3010OUTPUT FORMAT\u3011
Only output the translation result, no explanations or extra text.`
    };
    const systemPrompt = systemPrompts[target_lang] || systemPrompts["zh-TW"];
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
            content: systemPrompt
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
      headers: { "Content-Type": "application/json", ...getCorsHeaders() }
    });
  } catch (error) {
    console.error("Translation error:", error);
    return errorResponse(`Server Error: ${error}`, 500);
  }
}, "onRequest");
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders, "getCorsHeaders");
function errorResponse(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders() }
  });
}
__name(errorResponse, "errorResponse");

// api/db/order-costs.ts
async function getOrderCosts(env, shop_id) {
  try {
    const result = await env.DB.prepare(
      "SELECT * FROM order_costs WHERE shop_id = ? ORDER BY updated_at DESC"
    ).bind(shop_id).all();
    return Response.json({
      status: "success",
      data: result.results || []
    });
  } catch (error) {
    return Response.json({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to fetch order costs"
    }, { status: 500 });
  }
}
__name(getOrderCosts, "getOrderCosts");
async function saveOrderCost(env, shop_id, orderCost) {
  try {
    const result = await env.DB.prepare(`
            INSERT INTO order_costs (shop_id, order_id, order_sn, commission_twd, yamato_shipping, sls_shipping, product_cost, other_cost, sales_twd, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(shop_id, order_id) DO UPDATE SET
                commission_twd = excluded.commission_twd,
                yamato_shipping = excluded.yamato_shipping,
                sls_shipping = excluded.sls_shipping,
                product_cost = excluded.product_cost,
                other_cost = excluded.other_cost,
                sales_twd = excluded.sales_twd,
                notes = excluded.notes,
                updated_at = datetime('now')
        `).bind(
      shop_id,
      orderCost.order_id,
      orderCost.order_sn || null,
      orderCost.commission_twd || 0,
      orderCost.yamato_shipping || 0,
      orderCost.sls_shipping || 0,
      orderCost.product_cost || 0,
      orderCost.other_cost || 0,
      orderCost.sales_twd || 0,
      orderCost.notes || null
    ).run();
    return Response.json({
      status: "success",
      message: "Order cost saved successfully"
    });
  } catch (error) {
    return Response.json({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to save order cost"
    }, { status: 500 });
  }
}
__name(saveOrderCost, "saveOrderCost");
async function saveOrderCostsBatch(env, shop_id, orderCosts) {
  try {
    const statements = orderCosts.map(
      (oc) => env.DB.prepare(`
                INSERT INTO order_costs (shop_id, order_id, order_sn, commission_twd, yamato_shipping, sls_shipping, product_cost, other_cost, sales_twd, notes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(shop_id, order_id) DO UPDATE SET
                    commission_twd = excluded.commission_twd,
                    yamato_shipping = excluded.yamato_shipping,
                    sls_shipping = excluded.sls_shipping,
                    product_cost = excluded.product_cost,
                    other_cost = excluded.other_cost,
                    sales_twd = excluded.sales_twd,
                    notes = excluded.notes,
                    updated_at = datetime('now')
            `).bind(
        shop_id,
        oc.order_id,
        oc.order_sn || null,
        oc.commission_twd || 0,
        oc.yamato_shipping || 0,
        oc.sls_shipping || 0,
        oc.product_cost || 0,
        oc.other_cost || 0,
        oc.sales_twd || 0,
        oc.notes || null
      )
    );
    await env.DB.batch(statements);
    return Response.json({
      status: "success",
      message: `${orderCosts.length} order costs saved successfully`
    });
  } catch (error) {
    return Response.json({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to save order costs"
    }, { status: 500 });
  }
}
__name(saveOrderCostsBatch, "saveOrderCostsBatch");
async function deleteOrderCost(env, shop_id, order_id) {
  try {
    await env.DB.prepare(
      "DELETE FROM order_costs WHERE shop_id = ? AND order_id = ?"
    ).bind(shop_id, order_id).run();
    return Response.json({
      status: "success",
      message: "Order cost deleted successfully"
    });
  } catch (error) {
    return Response.json({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to delete order cost"
    }, { status: 500 });
  }
}
__name(deleteOrderCost, "deleteOrderCost");
var onRequest2 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;
  const shop_id = parseInt(url.searchParams.get("shop_id") || "0");
  if (!shop_id) {
    return Response.json({
      status: "error",
      message: "shop_id is required"
    }, { status: 400 });
  }
  try {
    if (method === "GET") {
      return await getOrderCosts(env, shop_id);
    }
    if (method === "POST") {
      const body = await request.json();
      if (body.orderCosts && Array.isArray(body.orderCosts)) {
        return await saveOrderCostsBatch(env, shop_id, body.orderCosts);
      }
      if (body.orderCost) {
        return await saveOrderCost(env, shop_id, body.orderCost);
      }
      return Response.json({
        status: "error",
        message: "orderCost or orderCosts is required in request body"
      }, { status: 400 });
    }
    if (method === "DELETE") {
      const order_id = url.searchParams.get("order_id");
      if (!order_id) {
        return Response.json({
          status: "error",
          message: "order_id is required"
        }, { status: 400 });
      }
      return await deleteOrderCost(env, shop_id, order_id);
    }
    return Response.json({
      status: "error",
      message: "Method not allowed"
    }, { status: 405 });
  } catch (error) {
    return Response.json({
      status: "error",
      message: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}, "onRequest");

// api/db/price-rules.ts
var onRequest3 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders2() });
  }
  const shopId = url.searchParams.get("shop_id");
  try {
    switch (request.method) {
      case "GET":
        return await handleGet(env.DB, shopId, url);
      case "POST":
        return await handlePost(env.DB, request);
      case "PUT":
        return await handlePut(env.DB, request);
      case "DELETE":
        return await handleDelete(env.DB, url);
      default:
        return errorResponse2("Method not allowed", 405);
    }
  } catch (error) {
    console.error("Database error:", error);
    return errorResponse2(`Database error: ${error}`, 500);
  }
}, "onRequest");
async function handleGet(db, shopId, url) {
  const ruleId = url.searchParams.get("id");
  if (ruleId) {
    const result = await db.prepare(
      "SELECT * FROM price_rules WHERE id = ?"
    ).bind(ruleId).first();
    if (!result) {
      return errorResponse2("Rule not found", 404);
    }
    return jsonResponse({ status: "success", data: result });
  }
  let query = "SELECT * FROM price_rules";
  const params = [];
  if (shopId) {
    query += " WHERE shop_id = ?";
    params.push(shopId);
  }
  query += " ORDER BY priority DESC, created_at DESC";
  const results = await db.prepare(query).bind(...params).all();
  return jsonResponse({
    status: "success",
    data: results.results
  });
}
__name(handleGet, "handleGet");
async function handlePost(db, request) {
  const rule = await request.json();
  if (!rule.shop_id || !rule.name || !rule.rule_type) {
    return errorResponse2("shop_id, name, and rule_type are required", 400);
  }
  const result = await db.prepare(`
        INSERT INTO price_rules (
            shop_id, name, description, rule_type,
            adjustment_value, adjustment_direction,
            min_price, max_price, min_margin_percent,
            apply_to_category, apply_to_tags,
            is_active, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
    rule.shop_id,
    rule.name,
    rule.description || null,
    rule.rule_type,
    rule.adjustment_value || null,
    rule.adjustment_direction || "decrease",
    rule.min_price || null,
    rule.max_price || null,
    rule.min_margin_percent || null,
    rule.apply_to_category || null,
    rule.apply_to_tags ? JSON.stringify(rule.apply_to_tags) : null,
    rule.is_active !== false ? 1 : 0,
    rule.priority || 0
  ).run();
  return jsonResponse({
    status: "success",
    message: "Price rule created",
    data: { id: result.meta.last_row_id }
  });
}
__name(handlePost, "handlePost");
async function handlePut(db, request) {
  const { id, ...updates } = await request.json();
  if (!id) {
    return errorResponse2("id is required", 400);
  }
  const updateFields = [];
  const params = [];
  const allowedFields = [
    "name",
    "description",
    "rule_type",
    "adjustment_value",
    "adjustment_direction",
    "min_price",
    "max_price",
    "min_margin_percent",
    "apply_to_category",
    "is_active",
    "priority"
  ];
  for (const field of allowedFields) {
    if (updates[field] !== void 0) {
      updateFields.push(`${field} = ?`);
      if (field === "is_active") {
        params.push(updates[field] ? 1 : 0);
      } else {
        params.push(updates[field]);
      }
    }
  }
  if (updates.apply_to_tags !== void 0) {
    updateFields.push("apply_to_tags = ?");
    params.push(JSON.stringify(updates.apply_to_tags));
  }
  updateFields.push("updated_at = datetime('now')");
  params.push(id);
  await db.prepare(
    `UPDATE price_rules SET ${updateFields.join(", ")} WHERE id = ?`
  ).bind(...params).run();
  return jsonResponse({ status: "success", message: "Price rule updated" });
}
__name(handlePut, "handlePut");
async function handleDelete(db, url) {
  const id = url.searchParams.get("id");
  if (!id) {
    return errorResponse2("id is required", 400);
  }
  await db.prepare(
    "UPDATE products SET price_rule_id = NULL WHERE price_rule_id = ?"
  ).bind(id).run();
  await db.prepare("DELETE FROM price_rules WHERE id = ?").bind(id).run();
  return jsonResponse({ status: "success", message: "Price rule deleted" });
}
__name(handleDelete, "handleDelete");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders2() }
  });
}
__name(jsonResponse, "jsonResponse");
function errorResponse2(message, status) {
  return jsonResponse({ status: "error", message }, status);
}
__name(errorResponse2, "errorResponse");
function getCorsHeaders2() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders2, "getCorsHeaders");

// api/db/products.ts
var onRequest4 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders3() });
  }
  const shopId = url.searchParams.get("shop_id");
  try {
    switch (request.method) {
      case "GET":
        return await handleGet2(env.DB, shopId, url);
      case "POST":
        return await handlePost2(env.DB, request);
      case "PUT":
        return await handlePut2(env.DB, request);
      case "DELETE":
        return await handleDelete2(env.DB, url);
      default:
        return errorResponse3("Method not allowed", 405);
    }
  } catch (error) {
    console.error("Database error:", error);
    return errorResponse3(`Database error: ${error}`, 500);
  }
}, "onRequest");
async function handleGet2(db, shopId, url) {
  const productId = url.searchParams.get("id");
  const itemId = url.searchParams.get("item_id");
  const status = url.searchParams.get("item_status") || url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "100");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  if (productId) {
    const result = await db.prepare("SELECT * FROM products WHERE id = ?").bind(productId).first();
    if (!result) return errorResponse3("Product not found", 404);
    return jsonResponse2({ status: "success", data: parseProduct(result) });
  }
  if (itemId) {
    const result = await db.prepare("SELECT * FROM products WHERE item_id = ?").bind(itemId).first();
    return jsonResponse2({ status: "success", data: result ? parseProduct(result) : null });
  }
  let query = "SELECT * FROM products WHERE 1=1";
  const params = [];
  if (shopId) {
    query += " AND shop_id = ?";
    params.push(parseInt(shopId));
  }
  if (status && status !== "all") {
    query += " AND item_status = ?";
    params.push(status.toUpperCase());
  }
  query += " ORDER BY update_time DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const results = await db.prepare(query).bind(...params).all();
  let countQuery = "SELECT COUNT(*) as total FROM products WHERE 1=1";
  const countParams = [];
  if (shopId) {
    countQuery += " AND shop_id = ?";
    countParams.push(parseInt(shopId));
  }
  if (status && status !== "all") {
    countQuery += " AND item_status = ?";
    countParams.push(status.toUpperCase());
  }
  const countResult = await db.prepare(countQuery).bind(...countParams).first();
  const products = results.results.map(parseProduct);
  return jsonResponse2({
    status: "success",
    data: {
      products,
      total: countResult?.total || 0,
      limit,
      offset
    }
  });
}
__name(handleGet2, "handleGet");
async function handlePost2(db, request) {
  const product = await request.json();
  const result = await db.prepare(`
        INSERT INTO products (
            item_id, shop_id, item_name, description, description_type, item_sku,
            category_id, original_price, current_price, currency, stock,
            image_url, image_url_list, image_id_list, weight,
            package_length, package_width, package_height,
            condition, item_status, attribute_list, logistic_info,
            has_model, model_list, pre_order_days_to_ship, brand_id,
            wholesale_list, video_info, custom_price, cost_price, source_url, notes, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
    product.item_id || null,
    product.shop_id,
    product.item_name,
    product.description || null,
    product.description_type || "normal",
    product.item_sku || null,
    product.category_id || null,
    product.original_price || null,
    product.current_price || product.original_price || null,
    product.currency || "TWD",
    product.stock || 0,
    Array.isArray(product.image_url_list) ? product.image_url_list[0] : product.image_url || null,
    JSON.stringify(product.image_url_list || product.image?.image_url_list || []),
    JSON.stringify(product.image_id_list || product.image?.image_id_list || []),
    product.weight || null,
    product.dimension?.package_length || product.package_length || null,
    product.dimension?.package_width || product.package_width || null,
    product.dimension?.package_height || product.package_height || null,
    product.condition || "NEW",
    product.item_status || "NORMAL",
    JSON.stringify(product.attribute_list || []),
    JSON.stringify(product.logistic_info || []),
    product.has_model ? 1 : 0,
    JSON.stringify(product.model_list || []),
    product.pre_order?.days_to_ship || product.pre_order_days_to_ship || null,
    product.brand?.brand_id || product.brand_id || null,
    JSON.stringify(product.wholesale || []),
    JSON.stringify(product.video_info || null),
    product.custom_price || null,
    product.cost_price || null,
    product.source_url || null,
    product.notes || null,
    JSON.stringify(product.tags || [])
  ).run();
  return jsonResponse2({
    status: "success",
    message: "Product created",
    data: { id: result.meta.last_row_id }
  });
}
__name(handlePost2, "handlePost");
async function handlePut2(db, request) {
  const url = new URL(request.url);
  const shopIdFromUrl = url.searchParams.get("shop_id");
  const body = await request.json();
  const { id, item_id, ...updates } = body;
  if (!id && !item_id) {
    return errorResponse3("id or item_id required", 400);
  }
  const current = await db.prepare(
    "SELECT id, item_id, current_price FROM products WHERE " + (id ? "id = ?" : "item_id = ?")
  ).bind(id || item_id).first();
  if (!current && item_id && (updates.cost_price !== void 0 || updates.source_url !== void 0)) {
    const shopId = shopIdFromUrl ? parseInt(shopIdFromUrl) : null;
    await db.prepare(`
            INSERT INTO products (item_id, shop_id, cost_price, source_url, item_status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'NORMAL', datetime('now'), datetime('now'))
        `).bind(
      item_id,
      shopId,
      updates.cost_price || null,
      updates.source_url || null
    ).run();
    return jsonResponse2({ status: "success", message: "Product created with cost data" });
  }
  const updateFields = [];
  const params = [];
  const fieldMapping = {
    item_name: "item_name",
    description: "description",
    description_type: "description_type",
    item_sku: "item_sku",
    category_id: "category_id",
    original_price: "original_price",
    current_price: "current_price",
    stock: "stock",
    weight: "weight",
    package_length: "package_length",
    package_width: "package_width",
    package_height: "package_height",
    condition: "condition",
    item_status: "item_status",
    custom_price: "custom_price",
    cost_price: "cost_price",
    source_url: "source_url",
    notes: "notes",
    price_rule_id: "price_rule_id",
    auto_adjust_enabled: "auto_adjust_enabled",
    min_price: "min_price",
    max_price: "max_price"
  };
  for (const [key, dbField] of Object.entries(fieldMapping)) {
    if (updates[key] !== void 0) {
      updateFields.push(`${dbField} = ?`);
      params.push(updates[key]);
    }
  }
  if (updates.attribute_list !== void 0) {
    updateFields.push("attribute_list = ?");
    params.push(JSON.stringify(updates.attribute_list));
  }
  if (updates.logistic_info !== void 0) {
    updateFields.push("logistic_info = ?");
    params.push(JSON.stringify(updates.logistic_info));
  }
  if (updates.image_url_list !== void 0) {
    updateFields.push("image_url_list = ?");
    params.push(JSON.stringify(updates.image_url_list));
    if (updates.image_url_list.length > 0) {
      updateFields.push("image_url = ?");
      params.push(updates.image_url_list[0]);
    }
  }
  if (updates.tags !== void 0) {
    updateFields.push("tags = ?");
    params.push(JSON.stringify(updates.tags));
  }
  updateFields.push("updated_at = datetime('now')");
  params.push(id || item_id);
  if (updateFields.length === 1) {
    return errorResponse3("No valid fields to update", 400);
  }
  await db.prepare(
    `UPDATE products SET ${updateFields.join(", ")} WHERE ` + (id ? "id = ?" : "item_id = ?")
  ).bind(...params).run();
  if ((updates.current_price !== void 0 || updates.custom_price !== void 0) && current) {
    const newPrice = updates.custom_price || updates.current_price;
    await db.prepare(`
            INSERT INTO price_history (product_id, item_id, old_price, new_price, change_reason, price_rule_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
      current.id,
      current.item_id,
      current.current_price,
      newPrice,
      updates.change_reason || "manual",
      updates.price_rule_id || null
    ).run();
  }
  return jsonResponse2({ status: "success", message: "Product updated" });
}
__name(handlePut2, "handlePut");
async function handleDelete2(db, url) {
  const id = url.searchParams.get("id");
  const itemId = url.searchParams.get("item_id");
  if (!id && !itemId) {
    return errorResponse3("id or item_id required", 400);
  }
  await db.prepare(
    "DELETE FROM products WHERE " + (id ? "id = ?" : "item_id = ?")
  ).bind(id || itemId).run();
  return jsonResponse2({ status: "success", message: "Product deleted" });
}
__name(handleDelete2, "handleDelete");
function parseProduct(row) {
  return {
    ...row,
    image_url_list: safeJsonParse(row.image_url_list, []),
    image_id_list: safeJsonParse(row.image_id_list, []),
    attribute_list: safeJsonParse(row.attribute_list, []),
    logistic_info: safeJsonParse(row.logistic_info, []),
    model_list: safeJsonParse(row.model_list, []),
    wholesale_list: safeJsonParse(row.wholesale_list, []),
    video_info: safeJsonParse(row.video_info, null),
    tags: safeJsonParse(row.tags, []),
    has_model: !!row.has_model,
    auto_adjust_enabled: !!row.auto_adjust_enabled
  };
}
__name(parseProduct, "parseProduct");
function safeJsonParse(str, defaultValue) {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}
__name(safeJsonParse, "safeJsonParse");
function jsonResponse2(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders3() }
  });
}
__name(jsonResponse2, "jsonResponse");
function errorResponse3(message, status) {
  return jsonResponse2({ status: "error", message }, status);
}
__name(errorResponse3, "errorResponse");
function getCorsHeaders3() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders3, "getCorsHeaders");

// api/db/region-settings.ts
var onRequest5 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders4() });
  }
  try {
    switch (request.method) {
      case "GET":
        return await handleGet3(env.DB, url);
      case "PUT":
        return await handlePut3(env.DB, request);
      default:
        return errorResponse4("Method not allowed", 405);
    }
  } catch (error) {
    console.error("Database error:", error);
    return errorResponse4(`Database error: ${error}`, 500);
  }
}, "onRequest");
async function handleGet3(db, url) {
  const region = url.searchParams.get("region");
  if (region) {
    const result = await db.prepare(
      "SELECT * FROM region_settings WHERE region = ?"
    ).bind(region).first();
    if (!result) {
      return errorResponse4("Region not found", 404);
    }
    return jsonResponse3({ status: "success", data: result });
  }
  const results = await db.prepare(
    "SELECT * FROM region_settings ORDER BY region"
  ).all();
  return jsonResponse3({ status: "success", data: results.results });
}
__name(handleGet3, "handleGet");
async function handlePut3(db, request) {
  const body = await request.json();
  const { region, ...updates } = body;
  if (!region) {
    return errorResponse4("region required", 400);
  }
  const updateFields = [];
  const params = [];
  const fields = [
    "currency",
    "currency_symbol",
    "exchange_rate",
    "commission_rate",
    "service_fee_rate",
    "transaction_fee_rate",
    "shipping_cost_local",
    "shipping_cost_intl_jpy"
  ];
  for (const field of fields) {
    if (updates[field] !== void 0) {
      updateFields.push(`${field} = ?`);
      params.push(updates[field]);
    }
  }
  if (updateFields.length === 0) {
    return errorResponse4("No valid fields to update", 400);
  }
  updateFields.push("updated_at = datetime('now')");
  params.push(region);
  await db.prepare(
    `UPDATE region_settings SET ${updateFields.join(", ")} WHERE region = ?`
  ).bind(...params).run();
  return jsonResponse3({ status: "success", message: "Settings updated" });
}
__name(handlePut3, "handlePut");
function jsonResponse3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders4(), "Content-Type": "application/json" }
  });
}
__name(jsonResponse3, "jsonResponse");
function errorResponse4(message, status = 400) {
  return jsonResponse3({ status: "error", message }, status);
}
__name(errorResponse4, "errorResponse");
function getCorsHeaders4() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders4, "getCorsHeaders");

// api/db/shops.ts
var onRequest6 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders5() });
  }
  try {
    switch (request.method) {
      case "GET":
        return await handleGet4(env.DB, url);
      case "POST":
        return await handlePost3(env.DB, request);
      case "PUT":
        return await handlePut4(env.DB, request);
      case "DELETE":
        return await handleDelete3(env.DB, url);
      default:
        return errorResponse5("Method not allowed", 405);
    }
  } catch (error) {
    console.error("Database error:", error);
    return errorResponse5(`Database error: ${error}`, 500);
  }
}, "onRequest");
async function handleGet4(db, url) {
  const shopId = url.searchParams.get("shop_id");
  const region = url.searchParams.get("region");
  const activeOnly = url.searchParams.get("active") !== "false";
  if (shopId) {
    const result = await db.prepare(
      "SELECT * FROM shops WHERE shop_id = ?"
    ).bind(parseInt(shopId)).first();
    return jsonResponse4({ status: "success", data: result });
  }
  let query = "SELECT * FROM shops WHERE 1=1";
  const params = [];
  if (region) {
    query += " AND region = ?";
    params.push(region);
  }
  if (activeOnly) {
    query += " AND is_active = 1";
  }
  query += " ORDER BY region, shop_name";
  const results = await db.prepare(query).bind(...params).all();
  return jsonResponse4({ status: "success", data: results.results });
}
__name(handleGet4, "handleGet");
async function handlePost3(db, request) {
  const body = await request.json();
  const { shop_id, shop_name, region, access_token, refresh_token, token_expires_at } = body;
  if (!shop_id || !region) {
    return errorResponse5("shop_id and region are required", 400);
  }
  await db.prepare(`
        INSERT INTO shops (shop_id, shop_name, region, access_token, refresh_token, token_expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(shop_id) DO UPDATE SET
            shop_name = excluded.shop_name,
            region = excluded.region,
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            token_expires_at = excluded.token_expires_at,
            updated_at = datetime('now')
    `).bind(
    shop_id,
    shop_name || null,
    region,
    access_token || null,
    refresh_token || null,
    token_expires_at || null
  ).run();
  return jsonResponse4({ status: "success", message: "Shop saved" });
}
__name(handlePost3, "handlePost");
async function handlePut4(db, request) {
  const body = await request.json();
  const { shop_id, ...updates } = body;
  if (!shop_id) {
    return errorResponse5("shop_id required", 400);
  }
  const updateFields = [];
  const params = [];
  const fields = ["shop_name", "region", "access_token", "refresh_token", "token_expires_at", "is_active"];
  for (const field of fields) {
    if (updates[field] !== void 0) {
      updateFields.push(`${field} = ?`);
      params.push(updates[field]);
    }
  }
  if (updateFields.length === 0) {
    return errorResponse5("No valid fields to update", 400);
  }
  updateFields.push("updated_at = datetime('now')");
  params.push(shop_id);
  await db.prepare(
    `UPDATE shops SET ${updateFields.join(", ")} WHERE shop_id = ?`
  ).bind(...params).run();
  return jsonResponse4({ status: "success", message: "Shop updated" });
}
__name(handlePut4, "handlePut");
async function handleDelete3(db, url) {
  const shopId = url.searchParams.get("shop_id");
  if (!shopId) {
    return errorResponse5("shop_id required", 400);
  }
  await db.prepare("DELETE FROM shops WHERE shop_id = ?").bind(parseInt(shopId)).run();
  return jsonResponse4({ status: "success", message: "Shop deleted" });
}
__name(handleDelete3, "handleDelete");
function jsonResponse4(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders5(), "Content-Type": "application/json" }
  });
}
__name(jsonResponse4, "jsonResponse");
function errorResponse5(message, status = 400) {
  return jsonResponse4({ status: "error", message }, status);
}
__name(errorResponse5, "errorResponse");
function getCorsHeaders5() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders5, "getCorsHeaders");

// api/db/sync.ts
var SHOPEE_HOST = "https://partner.shopeemobile.com";
var onRequest7 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders6() });
  }
  if (request.method !== "POST") {
    return errorResponse6("Method not allowed", 405);
  }
  const accessToken = url.searchParams.get("access_token");
  const shopId = url.searchParams.get("shop_id");
  if (!accessToken || !shopId) {
    return errorResponse6("access_token and shop_id required", 400);
  }
  try {
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    const allProducts = [];
    let offset = 0;
    let hasMore = true;
    let debugInfo = [];
    while (hasMore) {
      const result = await getItemList(partnerId, partnerKey, accessToken, parseInt(shopId), offset);
      debugInfo.push({
        offset,
        hasError: !!result.error,
        errorMessage: result.error || result.message,
        itemCount: result.response?.item?.length || 0,
        hasNextPage: result.response?.has_next_page
      });
      if (result.error) {
        return jsonResponse5({
          status: "error",
          message: `Shopee API error: ${result.error} - ${result.message || ""}`,
          debug: debugInfo
        }, 400);
      }
      if (!result.response?.item || result.response.item.length === 0) {
        break;
      }
      const itemIds = result.response.item.map((i) => i.item_id);
      const details = await getItemBaseInfo(partnerId, partnerKey, accessToken, parseInt(shopId), itemIds);
      if (details.response?.item_list) {
        for (const item of details.response.item_list) {
          allProducts.push(item);
        }
      }
      hasMore = result.response.has_next_page;
      offset = result.response.next_offset || offset + 50;
    }
    let synced = 0;
    let failed = 0;
    for (const item of allProducts) {
      try {
        await env.DB.prepare(`
                    INSERT INTO products (
                        item_id, shop_id, item_name, description, description_type, item_sku,
                        category_id, original_price, current_price, currency, stock,
                        image_url, image_url_list, weight, package_length, package_width, package_height,
                        condition, item_status, sold, views, likes, rating_star, cmt_count,
                        attribute_list, logistic_info, has_model, brand_id,
                        create_time, update_time, last_synced_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(item_id) DO UPDATE SET
                        item_name = excluded.item_name,
                        description = excluded.description,
                        description_type = excluded.description_type,
                        item_sku = excluded.item_sku,
                        category_id = excluded.category_id,
                        original_price = excluded.original_price,
                        current_price = excluded.current_price,
                        currency = excluded.currency,
                        stock = excluded.stock,
                        image_url = excluded.image_url,
                        image_url_list = excluded.image_url_list,
                        weight = excluded.weight,
                        package_length = excluded.package_length,
                        package_width = excluded.package_width,
                        package_height = excluded.package_height,
                        condition = excluded.condition,
                        item_status = excluded.item_status,
                        sold = excluded.sold,
                        views = excluded.views,
                        likes = excluded.likes,
                        rating_star = excluded.rating_star,
                        cmt_count = excluded.cmt_count,
                        attribute_list = excluded.attribute_list,
                        logistic_info = excluded.logistic_info,
                        has_model = excluded.has_model,
                        brand_id = excluded.brand_id,
                        update_time = excluded.update_time,
                        last_synced_at = datetime('now'),
                        updated_at = datetime('now')
                `).bind(
          // Shopee APIパラメータをそのまま使用
          item.item_id,
          parseInt(shopId),
          item.item_name,
          item.description || null,
          item.description_type || "normal",
          item.item_sku || null,
          item.category_id || null,
          item.price_info?.[0]?.original_price || null,
          item.price_info?.[0]?.current_price || null,
          item.price_info?.[0]?.currency || "TWD",
          item.stock_info_v2?.summary_info?.total_available_stock || 0,
          item.image?.image_url_list?.[0] || null,
          JSON.stringify(item.image?.image_url_list || []),
          item.weight || null,
          item.dimension?.package_length || null,
          item.dimension?.package_width || null,
          item.dimension?.package_height || null,
          item.condition || "NEW",
          item.item_status || "NORMAL",
          item.sold || 0,
          item.views || 0,
          item.likes || 0,
          item.rating_star || 0,
          item.cmt_count || 0,
          JSON.stringify(item.attribute_list || []),
          JSON.stringify(item.logistic_info || []),
          item.has_model ? 1 : 0,
          item.brand?.brand_id || null,
          item.create_time || null,
          item.update_time || null
        ).run();
        synced++;
      } catch (e) {
        console.error("Sync error:", e);
        failed++;
      }
    }
    await env.DB.prepare(`
            INSERT INTO sync_logs (shop_id, sync_type, status, items_synced, items_failed, completed_at)
            VALUES (?, 'products', ?, ?, ?, datetime('now'))
        `).bind(parseInt(shopId), failed > 0 ? "partial" : "success", synced, failed).run();
    return jsonResponse5({
      status: "success",
      message: `Synced ${synced} products from Shopee`,
      data: {
        total_fetched: allProducts.length,
        synced,
        failed
      }
    });
  } catch (error) {
    console.error("Sync error:", error);
    return errorResponse6(`Sync error: ${error}`, 500);
  }
}, "onRequest");
async function getItemList(partnerId, partnerKey, accessToken, shopId, offset = 0) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const path = "/api/v2/product/get_item_list";
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const sign = await hmacSha256(partnerKey, baseString);
  const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&offset=${offset}&page_size=50&item_status=NORMAL&item_status=UNLIST`;
  const response = await fetch(apiUrl);
  return await response.json();
}
__name(getItemList, "getItemList");
async function getItemBaseInfo(partnerId, partnerKey, accessToken, shopId, itemIds) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const path = "/api/v2/product/get_item_base_info";
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const sign = await hmacSha256(partnerKey, baseString);
  const itemIdList = itemIds.join(",");
  const apiUrl = `${SHOPEE_HOST}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&item_id_list=${itemIdList}`;
  const response = await fetch(apiUrl);
  return await response.json();
}
__name(getItemBaseInfo, "getItemBaseInfo");
async function hmacSha256(key, message) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha256, "hmacSha256");
function jsonResponse5(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...getCorsHeaders6() } });
}
__name(jsonResponse5, "jsonResponse");
function errorResponse6(message, status) {
  return jsonResponse5({ status: "error", message }, status);
}
__name(errorResponse6, "errorResponse");
function getCorsHeaders6() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}
__name(getCorsHeaders6, "getCorsHeaders");

// api/db/tokens.ts
var SHOPEE_HOST2 = "https://partner.shopeemobile.com";
var onRequest8 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders7() });
  }
  try {
    switch (request.method) {
      case "GET":
        return await handleGet5(env.DB, url);
      case "POST":
        return await handleRefresh(env, url);
      case "DELETE":
        return await handleDelete4(env.DB, url);
      default:
        return errorResponse7("Method not allowed", 405);
    }
  } catch (error) {
    console.error("Token API error:", error);
    return errorResponse7(`Error: ${error}`, 500);
  }
}, "onRequest");
async function handleGet5(db, url) {
  const shopId = url.searchParams.get("shop_id");
  const region = url.searchParams.get("region");
  if (shopId) {
    const token = await db.prepare(`
            SELECT * FROM tokens WHERE shop_id = ?
        `).bind(parseInt(shopId)).first();
    if (!token) {
      return jsonResponse6({ status: "error", message: "Token not found", data: null });
    }
    const now = /* @__PURE__ */ new Date();
    const accessExpires = token.access_token_expires_at ? new Date(token.access_token_expires_at) : null;
    const isExpired = accessExpires ? now > accessExpires : true;
    return jsonResponse6({
      status: "success",
      data: {
        shop_id: token.shop_id,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        shop_name: token.shop_name,
        region: token.region,
        access_token_expires_at: token.access_token_expires_at,
        refresh_token_expires_at: token.refresh_token_expires_at,
        is_expired: isExpired,
        updated_at: token.updated_at
      }
    });
  }
  if (region) {
    const token = await db.prepare(`
            SELECT * FROM tokens WHERE region = ? ORDER BY updated_at DESC LIMIT 1
        `).bind(region).first();
    if (!token) {
      return jsonResponse6({ status: "error", message: `No token found for region ${region}`, data: null });
    }
    const now = /* @__PURE__ */ new Date();
    const accessExpires = token.access_token_expires_at ? new Date(token.access_token_expires_at) : null;
    const isExpired = accessExpires ? now > accessExpires : true;
    return jsonResponse6({
      status: "success",
      data: {
        shop_id: token.shop_id,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        shop_name: token.shop_name,
        region: token.region,
        access_token_expires_at: token.access_token_expires_at,
        refresh_token_expires_at: token.refresh_token_expires_at,
        is_expired: isExpired,
        updated_at: token.updated_at
      }
    });
  }
  const tokens = await db.prepare(`
        SELECT shop_id, shop_name, region, access_token_expires_at, updated_at FROM tokens
        ORDER BY updated_at DESC
    `).all();
  return jsonResponse6({
    status: "success",
    data: tokens.results
  });
}
__name(handleGet5, "handleGet");
async function handleRefresh(env, url) {
  const shopId = url.searchParams.get("shop_id");
  if (!shopId) {
    return errorResponse7("shop_id required", 400);
  }
  const current = await env.DB.prepare(`
        SELECT * FROM tokens WHERE shop_id = ?
    `).bind(parseInt(shopId)).first();
  if (!current || !current.refresh_token) {
    return errorResponse7("No refresh token found", 404);
  }
  const refreshResult = await refreshAccessToken(
    env.SHOPEE_PARTNER_ID,
    env.SHOPEE_PARTNER_KEY,
    current.refresh_token,
    parseInt(shopId)
  );
  if (refreshResult.error) {
    return jsonResponse6({
      status: "error",
      message: refreshResult.message || refreshResult.error,
      data: refreshResult
    }, 400);
  }
  const accessExpires = new Date(Date.now() + refreshResult.expire_in * 1e3).toISOString();
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
  await env.DB.prepare(`
        UPDATE tokens SET
            access_token = ?,
            refresh_token = ?,
            access_token_expires_at = ?,
            refresh_token_expires_at = ?,
            updated_at = datetime('now')
        WHERE shop_id = ?
    `).bind(
    refreshResult.access_token,
    refreshResult.refresh_token,
    accessExpires,
    refreshExpires,
    parseInt(shopId)
  ).run();
  return jsonResponse6({
    status: "success",
    message: "Token refreshed and saved to D1",
    data: {
      access_token: refreshResult.access_token,
      refresh_token: refreshResult.refresh_token,
      expire_in: refreshResult.expire_in,
      access_token_expires_at: accessExpires
    }
  });
}
__name(handleRefresh, "handleRefresh");
async function handleDelete4(db, url) {
  const shopId = url.searchParams.get("shop_id");
  if (!shopId) {
    return errorResponse7("shop_id required", 400);
  }
  await db.prepare(`DELETE FROM tokens WHERE shop_id = ?`).bind(parseInt(shopId)).run();
  return jsonResponse6({ status: "success", message: "Token deleted" });
}
__name(handleDelete4, "handleDelete");
async function refreshAccessToken(partnerId, partnerKey, refreshToken, shopId) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const path = "/api/v2/auth/access_token/get";
  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = await hmacSha2562(partnerKey, baseString);
  const apiUrl = `${SHOPEE_HOST2}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: refreshToken,
      shop_id: shopId,
      partner_id: parseInt(partnerId)
    })
  });
  return await response.json();
}
__name(refreshAccessToken, "refreshAccessToken");
async function hmacSha2562(key, message) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha2562, "hmacSha256");
function jsonResponse6(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...getCorsHeaders7() } });
}
__name(jsonResponse6, "jsonResponse");
function errorResponse7(message, status) {
  return jsonResponse6({ status: "error", message }, status);
}
__name(errorResponse7, "errorResponse");
function getCorsHeaders7() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}
__name(getCorsHeaders7, "getCorsHeaders");

// api/shopee/add_item.ts
var SHOPEE_HOST3 = "https://partner.shopeemobile.com";
var onRequest9 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders8() });
  }
  if (request.method !== "POST") {
    return errorResponse8("Method not allowed", 405);
  }
  try {
    const body = await request.json();
    const { access_token, shop_id, ...itemData } = body;
    if (!access_token || !shop_id) {
      return errorResponse8("access_token and shop_id are required", 400);
    }
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    const path = "/api/v2/product/add_item";
    const timestamp = Math.floor(Date.now() / 1e3);
    const baseString = `${partnerId}${path}${timestamp}${access_token}${shop_id}`;
    const sign = await hmacSha2563(partnerKey, baseString);
    const apiUrl = `${SHOPEE_HOST3}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${access_token}&shop_id=${shop_id}&sign=${sign}`;
    const payload = {
      original_price: itemData.original_price,
      description: itemData.description,
      item_name: itemData.item_name,
      item_status: "NORMAL",
      // 出品中
      normal_stock: itemData.normal_stock,
      category_id: itemData.category_id,
      image: itemData.image,
      // { image_id_list: string[] }
      weight: itemData.weight || 0.5,
      logistic_info: itemData.logistic_info || [],
      // 送料設定
      attribute_list: itemData.attribute_list || [],
      ...itemData
    };
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders8() }
    });
  } catch (error) {
    console.error("Add Item error:", error);
    return errorResponse8(`Server Error: ${error}`, 500);
  }
}, "onRequest");
async function hmacSha2563(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha2563, "hmacSha256");
function getCorsHeaders8() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders8, "getCorsHeaders");
function errorResponse8(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders8() }
  });
}
__name(errorResponse8, "errorResponse");

// api/shopee/attributes.ts
var SHOPEE_HOST4 = "https://partner.shopeemobile.com";
var onRequest10 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders9() });
  }
  try {
    const url = new URL(request.url);
    const accessToken = url.searchParams.get("access_token");
    const shopId = url.searchParams.get("shop_id");
    const categoryId = url.searchParams.get("category_id");
    const language = url.searchParams.get("language") || "zh-Hant";
    if (!accessToken || !shopId || !categoryId) {
      return errorResponse9("access_token, shop_id, and category_id are required", 400);
    }
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    const path = "/api/v2/product/get_attributes";
    const timestamp = Math.floor(Date.now() / 1e3);
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha2564(partnerKey, baseString);
    const apiUrl = `${SHOPEE_HOST4}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&category_id=${categoryId}&language=${language}`;
    const response = await fetch(apiUrl, {
      method: "GET"
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders9() }
    });
  } catch (error) {
    console.error("Attributes API error:", error);
    return errorResponse9(`Server Error: ${error}`, 500);
  }
}, "onRequest");
async function hmacSha2564(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha2564, "hmacSha256");
function getCorsHeaders9() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders9, "getCorsHeaders");
function errorResponse9(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders9() }
  });
}
__name(errorResponse9, "errorResponse");

// api/shopee/auth.ts
var SHOPEE_HOST5 = "https://partner.shopeemobile.com";
var REDIRECT_URL = "https://shopee-automate.pages.dev/api/callback";
var onRequest11 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders10()
    });
  }
  try {
    const partnerId = parseInt(env.SHOPEE_PARTNER_ID);
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    if (!partnerId || !partnerKey) {
      return errorResponse10("\u74B0\u5883\u5909\u6570\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093", 500);
    }
    const timestamp = Math.floor(Date.now() / 1e3);
    const path = "/api/v2/shop/auth_partner";
    const baseString = `${partnerId}${path}${timestamp}`;
    const sign = await hmacSha2565(partnerKey, baseString);
    const authUrl = new URL(`${SHOPEE_HOST5}${path}`);
    authUrl.searchParams.set("partner_id", partnerId.toString());
    authUrl.searchParams.set("timestamp", timestamp.toString());
    authUrl.searchParams.set("sign", sign);
    authUrl.searchParams.set("redirect", REDIRECT_URL);
    return new Response(JSON.stringify({
      status: "success",
      message: "\u8A8D\u53EFURL\u3092\u751F\u6210\u3057\u307E\u3057\u305F\u3002\u4EE5\u4E0B\u306EURL\u306B\u30A2\u30AF\u30BB\u30B9\u3057\u3066\u30B7\u30E7\u30C3\u30D7\u3092\u8A8D\u53EF\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      auth_url: authUrl.toString(),
      partner_id: partnerId,
      timestamp
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders10()
      }
    });
  } catch (error) {
    return errorResponse10(`\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ${error}`, 500);
  }
}, "onRequest");
async function hmacSha2565(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha2565, "hmacSha256");
function getCorsHeaders10() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders10, "getCorsHeaders");
function errorResponse10(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders10() }
  });
}
__name(errorResponse10, "errorResponse");

// api/shopee/categories.ts
var SHOPEE_HOST6 = "https://partner.shopeemobile.com";
var onRequest12 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders11() });
  }
  try {
    const url = new URL(request.url);
    const accessToken = url.searchParams.get("access_token");
    const shopId = url.searchParams.get("shop_id");
    const language = url.searchParams.get("language") || "ja";
    if (!accessToken || !shopId) {
      return errorResponse11("access_token and shop_id are required", 400);
    }
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    const path = "/api/v2/product/get_category";
    const timestamp = Math.floor(Date.now() / 1e3);
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha2566(partnerKey, baseString);
    const apiUrl = `${SHOPEE_HOST6}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&language=${language}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders11() }
    });
  } catch (error) {
    console.error("Category fetch error:", error);
    return errorResponse11(`Server Error: ${error}`, 500);
  }
}, "onRequest");
async function hmacSha2566(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha2566, "hmacSha256");
function getCorsHeaders11() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders11, "getCorsHeaders");
function errorResponse11(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders11() }
  });
}
__name(errorResponse11, "errorResponse");

// api/shopee/exchange.ts
var SHOPEE_HOST7 = "https://partner.shopeemobile.com";
var onRequest13 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders12()
    });
  }
  if (request.method !== "POST") {
    return errorResponse12("Method not allowed", 405);
  }
  try {
    const body = await request.json();
    const { code, shop_id, region = "TW" } = body;
    if (!code || !shop_id) {
      return errorResponse12("code and shop_id are required", 400);
    }
    const tokenResult = await getAccessToken(
      env.SHOPEE_PARTNER_ID,
      env.SHOPEE_PARTNER_KEY,
      code,
      shop_id
    );
    if (tokenResult.error) {
      return errorResponse12(`Shopee API Error: ${tokenResult.error} - ${tokenResult.message || ""}`, 400);
    }
    await saveTokenToD1(env.DB, {
      shop_id,
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token,
      expire_in: tokenResult.expire_in,
      shop_name: null,
      region
    });
    await saveToShopsTable(env.DB, {
      shop_id,
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token,
      expire_in: tokenResult.expire_in,
      region
    });
    return new Response(JSON.stringify({
      status: "success",
      message: "Authentication successful",
      data: {
        shop_id,
        access_token: tokenResult.access_token,
        refresh_token: tokenResult.refresh_token,
        expires_in: tokenResult.expire_in,
        region
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders12() }
    });
  } catch (error) {
    console.error("Auth exchange error:", error);
    return errorResponse12(`Server Error: ${error}`, 500);
  }
}, "onRequest");
async function saveTokenToD1(db, data) {
  const accessExpires = new Date(Date.now() + data.expire_in * 1e3).toISOString();
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
  await db.prepare(`
        INSERT INTO tokens (shop_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, shop_name, region)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(shop_id) DO UPDATE SET
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            access_token_expires_at = excluded.access_token_expires_at,
            refresh_token_expires_at = excluded.refresh_token_expires_at,
            region = excluded.region,
            updated_at = datetime('now')
    `).bind(
    data.shop_id,
    data.access_token,
    data.refresh_token,
    accessExpires,
    refreshExpires,
    data.shop_name,
    data.region
  ).run();
}
__name(saveTokenToD1, "saveTokenToD1");
async function saveToShopsTable(db, data) {
  const tokenExpiresAt = Math.floor(Date.now() / 1e3) + data.expire_in;
  try {
    await db.prepare(`
            INSERT INTO shops (shop_id, shop_name, region, access_token, refresh_token, token_expires_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(shop_id) DO UPDATE SET
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                token_expires_at = excluded.token_expires_at,
                region = excluded.region,
                is_active = 1,
                updated_at = datetime('now')
        `).bind(
      data.shop_id,
      `${data.region} Shop`,
      data.region,
      data.access_token,
      data.refresh_token,
      tokenExpiresAt
    ).run();
  } catch (e) {
    console.warn("Failed to save to shops table:", e);
  }
}
__name(saveToShopsTable, "saveToShopsTable");
async function getAccessToken(partnerId, partnerKey, code, shopId) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const path = "/api/v2/auth/token/get";
  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = await hmacSha2567(partnerKey, baseString);
  const tokenUrl = `${SHOPEE_HOST7}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      shop_id: parseInt(shopId.toString()),
      partner_id: parseInt(partnerId)
    })
  });
  return await response.json();
}
__name(getAccessToken, "getAccessToken");
async function hmacSha2567(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha2567, "hmacSha256");
function getCorsHeaders12() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders12, "getCorsHeaders");
function errorResponse12(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders12() }
  });
}
__name(errorResponse12, "errorResponse");

// api/shopee/item_detail.ts
var SHOPEE_HOST8 = "https://partner.shopeemobile.com";
var onRequest14 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders13() });
  }
  try {
    const url = new URL(request.url);
    const accessToken = url.searchParams.get("access_token");
    const shopId = url.searchParams.get("shop_id");
    const itemId = url.searchParams.get("item_id");
    if (!accessToken || !shopId || !itemId) {
      return errorResponse13("access_token, shop_id, and item_id are required", 400);
    }
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    const path = "/api/v2/product/get_item_base_info";
    const timestamp = Math.floor(Date.now() / 1e3);
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha2568(partnerKey, baseString);
    const apiUrl = `${SHOPEE_HOST8}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&item_id_list=${itemId}`;
    const response = await fetch(apiUrl, {
      method: "GET"
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders13() }
    });
  } catch (error) {
    console.error("Item Detail error:", error);
    return errorResponse13(`Server Error: ${error}`, 500);
  }
}, "onRequest");
async function hmacSha2568(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha2568, "hmacSha256");
function getCorsHeaders13() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders13, "getCorsHeaders");
function errorResponse13(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders13() }
  });
}
__name(errorResponse13, "errorResponse");

// api/shopee/logistics.ts
var SHOPEE_HOST9 = "https://partner.shopeemobile.com";
var onRequest15 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders14() });
  }
  try {
    const url = new URL(request.url);
    const accessToken = url.searchParams.get("access_token");
    const shopId = url.searchParams.get("shop_id");
    if (!accessToken || !shopId) {
      return errorResponse14("access_token and shop_id are required", 400);
    }
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    const path = "/api/v2/logistics/get_channel_list";
    const timestamp = Math.floor(Date.now() / 1e3);
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha2569(partnerKey, baseString);
    const apiUrl = `${SHOPEE_HOST9}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;
    const response = await fetch(apiUrl, {
      method: "GET"
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders14() }
    });
  } catch (error) {
    console.error("Logistics error:", error);
    return errorResponse14(`Server Error: ${error}`, 500);
  }
}, "onRequest");
async function hmacSha2569(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha2569, "hmacSha256");
function getCorsHeaders14() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders14, "getCorsHeaders");
function errorResponse14(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders14() }
  });
}
__name(errorResponse14, "errorResponse");

// api/shopee/orders.ts
var SHOPEE_HOST10 = "https://partner.shopeemobile.com";
var onRequest16 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders15()
    });
  }
  const accessToken = url.searchParams.get("access_token");
  const shopId = url.searchParams.get("shop_id");
  const orderStatus = url.searchParams.get("order_status") || "READY_TO_SHIP";
  const pageSize = parseInt(url.searchParams.get("page_size") || "20");
  const cursor = url.searchParams.get("cursor") || "";
  if (!accessToken || !shopId) {
    return new Response(JSON.stringify({
      status: "error",
      message: "access_token \u3068 shop_id \u30D1\u30E9\u30E1\u30FC\u30BF\u304C\u5FC5\u8981\u3067\u3059"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders15() }
    });
  }
  try {
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    if (!partnerId || !partnerKey) {
      throw new Error("\u74B0\u5883\u5909\u6570\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093");
    }
    const timeFrom = Math.floor(Date.now() / 1e3) - 15 * 24 * 60 * 60;
    const timeTo = Math.floor(Date.now() / 1e3);
    const orderList = await getOrderList(
      partnerId,
      partnerKey,
      accessToken,
      parseInt(shopId),
      timeFrom,
      timeTo,
      orderStatus,
      pageSize,
      cursor
    );
    if (orderList.error) {
      return new Response(JSON.stringify({
        status: "error",
        message: orderList.message || orderList.error,
        data: orderList
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...getCorsHeaders15() }
      });
    }
    let orders = [];
    if (orderList.response?.order_list && orderList.response.order_list.length > 0) {
      const orderSns = orderList.response.order_list.map((order) => order.order_sn);
      const orderDetails = await getOrderDetail(
        partnerId,
        partnerKey,
        accessToken,
        parseInt(shopId),
        orderSns
      );
      if (orderDetails.response?.order_list) {
        orders = orderDetails.response.order_list.map((order) => {
          let totalAmount = 0;
          if (order.total_amount !== void 0 && order.total_amount !== null) {
            totalAmount = parseFloat(order.total_amount) || 0;
          } else if (order.escrow_amount !== void 0) {
            totalAmount = parseFloat(order.escrow_amount) || 0;
          } else if (order.item_list && order.item_list.length > 0) {
            totalAmount = order.item_list.reduce((sum, item) => {
              const price = parseFloat(item.model_discounted_price) || parseFloat(item.model_original_price) || 0;
              const qty = parseInt(item.model_quantity_purchased) || 1;
              return sum + price * qty;
            }, 0);
          }
          return {
            id: order.order_sn,
            customer: order.buyer_username || "\u533F\u540D\u30E6\u30FC\u30B6\u30FC",
            buyer_user_id: order.buyer_user_id,
            items: order.item_list?.length || 0,
            item_list: order.item_list?.map((item) => ({
              name: item.item_name,
              sku: item.item_sku,
              quantity: item.model_quantity_purchased,
              price: parseFloat(item.model_discounted_price) || parseFloat(item.model_original_price) || 0,
              image: item.image_info?.image_url
            })) || [],
            total: totalAmount,
            currency: order.currency || "TWD",
            status: mapOrderStatus(order.order_status),
            order_status: order.order_status,
            date: formatTimestamp(order.create_time),
            create_time: order.create_time,
            update_time: order.update_time,
            shipping: {
              carrier: order.shipping_carrier,
              tracking_number: order.tracking_number,
              recipient_address: order.recipient_address
            },
            payment_method: order.payment_method,
            note: order.note || "",
            message_to_seller: order.message_to_seller || ""
          };
        });
      }
    }
    return new Response(JSON.stringify({
      status: "success",
      message: "\u6CE8\u6587\u4E00\u89A7\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F",
      data: {
        orders,
        more: orderList.response?.more || false,
        next_cursor: orderList.response?.next_cursor || null
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders15() }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      message: `\u30A8\u30E9\u30FC: ${error}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders15() }
    });
  }
}, "onRequest");
async function getOrderList(partnerId, partnerKey, accessToken, shopId, timeFrom, timeTo, orderStatus, pageSize, cursor) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const path = "/api/v2/order/get_order_list";
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const sign = await hmacSha25610(partnerKey, baseString);
  let apiUrl = `${SHOPEE_HOST10}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&time_range_field=create_time&time_from=${timeFrom}&time_to=${timeTo}&page_size=${pageSize}`;
  if (orderStatus && orderStatus !== "ALL") {
    apiUrl += `&order_status=${orderStatus}`;
  }
  if (cursor) {
    apiUrl += `&cursor=${cursor}`;
  }
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  return await response.json();
}
__name(getOrderList, "getOrderList");
async function getOrderDetail(partnerId, partnerKey, accessToken, shopId, orderSns) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const path = "/api/v2/order/get_order_detail";
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const sign = await hmacSha25610(partnerKey, baseString);
  const orderSnList = orderSns.join(",");
  const apiUrl = `${SHOPEE_HOST10}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&order_sn_list=${orderSnList}&response_optional_fields=buyer_username,item_list,recipient_address,note,message_to_seller`;
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  return await response.json();
}
__name(getOrderDetail, "getOrderDetail");
function mapOrderStatus(status) {
  const statusMap = {
    "UNPAID": "pending",
    "READY_TO_SHIP": "processing",
    "PROCESSED": "processing",
    "SHIPPED": "shipped",
    "COMPLETED": "delivered",
    "IN_CANCEL": "cancelled",
    "CANCELLED": "cancelled",
    "INVOICE_PENDING": "pending"
  };
  return statusMap[status] || "pending";
}
__name(mapOrderStatus, "mapOrderStatus");
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1e3);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(/\//g, "-");
}
__name(formatTimestamp, "formatTimestamp");
async function hmacSha25610(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha25610, "hmacSha256");
function getCorsHeaders15() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders15, "getCorsHeaders");

// api/shopee/products.ts
var SHOPEE_HOST11 = "https://partner.shopeemobile.com";
var onRequest17 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders16()
    });
  }
  const accessToken = url.searchParams.get("access_token");
  const shopId = url.searchParams.get("shop_id");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const pageSize = parseInt(url.searchParams.get("page_size") || "20");
  const itemId = url.searchParams.get("item_id");
  if (!accessToken || !shopId) {
    return new Response(JSON.stringify({
      status: "error",
      message: "access_token \u3068 shop_id \u30D1\u30E9\u30E1\u30FC\u30BF\u304C\u5FC5\u8981\u3067\u3059"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders16() }
    });
  }
  try {
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    if (!partnerId || !partnerKey) {
      throw new Error("\u74B0\u5883\u5909\u6570\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093");
    }
    if (itemId) {
      const itemInfo = await getItemBaseInfo2(
        partnerId,
        partnerKey,
        accessToken,
        parseInt(shopId),
        [parseInt(itemId)]
      );
      if (itemInfo.error) {
        return new Response(JSON.stringify({
          status: "error",
          message: itemInfo.message || itemInfo.error,
          data: itemInfo
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...getCorsHeaders16() }
        });
      }
      let products2 = [];
      if (itemInfo.response?.item_list && itemInfo.response.item_list.length > 0) {
        products2 = itemInfo.response.item_list.map((item) => ({
          id: item.item_id,
          item_id: item.item_id,
          name: item.item_name,
          description: item.description || "",
          price: item.price_info?.[0]?.current_price || 0,
          originalPrice: item.price_info?.[0]?.original_price || 0,
          currency: item.price_info?.[0]?.currency || "TWD",
          stock: item.stock_info_v2?.summary_info?.total_available_stock || 0,
          status: mapItemStatus(item.item_status),
          image: item.image?.image_url_list?.[0] || null,
          images: item.image?.image_url_list || [],
          category_id: item.category_id,
          sold: item.sold || 0,
          views: item.views || 0,
          likes: item.likes || 0,
          rating_star: item.rating_star || 0,
          create_time: item.create_time,
          update_time: item.update_time
        }));
      }
      return new Response(JSON.stringify({
        status: "success",
        message: "\u5546\u54C1\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F",
        data: {
          products: products2,
          total: products2.length
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...getCorsHeaders16() }
      });
    }
    const itemList = await getItemList2(
      partnerId,
      partnerKey,
      accessToken,
      parseInt(shopId),
      offset,
      pageSize
    );
    if (itemList.error) {
      return new Response(JSON.stringify({
        status: "error",
        message: itemList.message || itemList.error,
        data: itemList
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...getCorsHeaders16() }
      });
    }
    let products = [];
    if (itemList.response?.item && itemList.response.item.length > 0) {
      const itemIds = itemList.response.item.map((item) => item.item_id);
      const itemInfo = await getItemBaseInfo2(
        partnerId,
        partnerKey,
        accessToken,
        parseInt(shopId),
        itemIds
      );
      if (itemInfo.response?.item_list) {
        products = itemInfo.response.item_list.map((item) => ({
          id: item.item_id,
          item_id: item.item_id,
          name: item.item_name,
          description: item.description,
          price: item.price_info?.[0]?.current_price || 0,
          originalPrice: item.price_info?.[0]?.original_price || 0,
          currency: item.price_info?.[0]?.currency || "TWD",
          stock: item.stock_info_v2?.summary_info?.total_available_stock || 0,
          status: mapItemStatus(item.item_status),
          image: item.image?.image_url_list?.[0] || null,
          images: item.image?.image_url_list || [],
          category_id: item.category_id,
          sold: item.sold || 0,
          views: item.views || 0,
          likes: item.likes || 0,
          rating_star: item.rating_star || 0,
          create_time: item.create_time,
          update_time: item.update_time
        }));
      }
    }
    return new Response(JSON.stringify({
      status: "success",
      message: "\u5546\u54C1\u4E00\u89A7\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F",
      data: {
        products,
        total: itemList.response?.total_count || 0,
        has_next_page: itemList.response?.has_next_page || false,
        next_offset: itemList.response?.next_offset || null
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders16() }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      message: `\u30A8\u30E9\u30FC: ${error}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders16() }
    });
  }
}, "onRequest");
async function getItemList2(partnerId, partnerKey, accessToken, shopId, offset, pageSize) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const path = "/api/v2/product/get_item_list";
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const sign = await hmacSha25611(partnerKey, baseString);
  const apiUrl = `${SHOPEE_HOST11}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&offset=${offset}&page_size=${pageSize}&item_status=NORMAL&item_status=UNLIST`;
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  return await response.json();
}
__name(getItemList2, "getItemList");
async function getItemBaseInfo2(partnerId, partnerKey, accessToken, shopId, itemIds) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const path = "/api/v2/product/get_item_base_info";
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const sign = await hmacSha25611(partnerKey, baseString);
  const itemIdList = itemIds.join(",");
  const apiUrl = `${SHOPEE_HOST11}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}&item_id_list=${itemIdList}&need_tax_info=false&need_complaint_policy=false`;
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  return await response.json();
}
__name(getItemBaseInfo2, "getItemBaseInfo");
function mapItemStatus(status) {
  const statusMap = {
    "NORMAL": "active",
    "UNLIST": "inactive",
    "BANNED": "banned",
    "DELETED": "deleted"
  };
  return statusMap[status] || "unknown";
}
__name(mapItemStatus, "mapItemStatus");
async function hmacSha25611(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha25611, "hmacSha256");
function getCorsHeaders16() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders16, "getCorsHeaders");

// api/shopee/test-connection.ts
var SHOPEE_HOST12 = "https://partner.shopeemobile.com";
var onRequest18 = /* @__PURE__ */ __name(async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders17()
    });
  }
  const accessToken = url.searchParams.get("access_token");
  const shopId = url.searchParams.get("shop_id");
  if (!accessToken || !shopId) {
    return new Response(JSON.stringify({
      status: "error",
      message: "access_token \u3068 shop_id \u30D1\u30E9\u30E1\u30FC\u30BF\u304C\u5FC5\u8981\u3067\u3059",
      usage: "/api/shopee/test-connection?access_token=YOUR_TOKEN&shop_id=YOUR_SHOP_ID"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders17() }
    });
  }
  try {
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    if (!partnerId || !partnerKey) {
      throw new Error("\u74B0\u5883\u5909\u6570\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093");
    }
    const shopInfo = await getShopInfo(
      partnerId,
      partnerKey,
      accessToken,
      parseInt(shopId)
    );
    const isSuccess = !shopInfo.error;
    return new Response(JSON.stringify({
      status: isSuccess ? "success" : "error",
      message: isSuccess ? "\u53F0\u6E7EShopee\u30B7\u30E7\u30C3\u30D7\u3068\u306E\u63A5\u7D9A\u304C\u78BA\u8A8D\u3067\u304D\u307E\u3057\u305F\uFF01" : "\u63A5\u7D9A\u30A8\u30E9\u30FC",
      shop_info: shopInfo,
      tested_at: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      status: isSuccess ? 200 : 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders17() }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "error",
      message: `\u30C6\u30B9\u30C8\u5931\u6557: ${error}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders17() }
    });
  }
}, "onRequest");
async function getShopInfo(partnerId, partnerKey, accessToken, shopId) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const path = "/api/v2/shop/get_shop_info";
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const sign = await hmacSha25612(partnerKey, baseString);
  const apiUrl = `${SHOPEE_HOST12}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${shopId}`;
  console.log("Calling Shop Info API:", apiUrl.replace(accessToken, "***"));
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });
  const result = await response.json();
  console.log("Shop Info Result:", JSON.stringify(result, null, 2));
  return result;
}
__name(getShopInfo, "getShopInfo");
async function hmacSha25612(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha25612, "hmacSha256");
function getCorsHeaders17() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders17, "getCorsHeaders");

// api/shopee/update.ts
var SHOPEE_HOST13 = "https://partner.shopeemobile.com";
var onRequest19 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders18() });
  }
  if (request.method !== "POST") {
    return errorResponse15("Method not allowed", 405);
  }
  try {
    const body = await request.json();
    const { access_token, shop_id, item_id, update_type } = body;
    if (!access_token || !shop_id || !item_id) {
      return errorResponse15("access_token, shop_id, item_id are required", 400);
    }
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    const results = {};
    if (update_type === "item" || update_type === "all") {
      if (body.item_name || body.description) {
        const updateData = { item_id };
        if (body.item_name) updateData.item_name = body.item_name;
        if (body.description) updateData.description = body.description;
        results.item = await callShopeeApi(
          partnerId,
          partnerKey,
          access_token,
          shop_id,
          "/api/v2/product/update_item",
          updateData
        );
      }
    }
    if ((update_type === "price" || update_type === "all") && body.price !== void 0) {
      results.price = await callShopeeApi(
        partnerId,
        partnerKey,
        access_token,
        shop_id,
        "/api/v2/product/update_price",
        {
          item_id,
          price_list: [{
            model_id: 0,
            original_price: body.price
          }]
        }
      );
    }
    if ((update_type === "stock" || update_type === "all") && body.stock !== void 0) {
      results.stock = await callShopeeApi(
        partnerId,
        partnerKey,
        access_token,
        shop_id,
        "/api/v2/product/update_stock",
        {
          item_id,
          stock_list: [{
            model_id: 0,
            seller_stock: [{
              stock: body.stock
            }]
          }]
        }
      );
    }
    const hasError = Object.values(results).some((r) => r?.error);
    if (hasError) {
      return new Response(JSON.stringify({
        status: "partial_error",
        message: "Some updates failed",
        data: results
      }), {
        status: 207,
        headers: { "Content-Type": "application/json", ...getCorsHeaders18() }
      });
    }
    return new Response(JSON.stringify({
      status: "success",
      message: "Product updated on Shopee",
      data: results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders18() }
    });
  } catch (error) {
    console.error("Update error:", error);
    return errorResponse15(`Server Error: ${error}`, 500);
  }
}, "onRequest");
async function callShopeeApi(partnerId, partnerKey, accessToken, shopId, path, body) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const sign = await hmacSha25613(partnerKey, baseString);
  const url = `${SHOPEE_HOST13}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return await response.json();
}
__name(callShopeeApi, "callShopeeApi");
async function hmacSha25613(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha25613, "hmacSha256");
function getCorsHeaders18() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders18, "getCorsHeaders");
function errorResponse15(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders18() }
  });
}
__name(errorResponse15, "errorResponse");

// api/shopee/upload.ts
var SHOPEE_HOST14 = "https://partner.shopeemobile.com";
var onRequest20 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders19() });
  }
  if (request.method !== "POST") {
    return errorResponse16("Method not allowed", 405);
  }
  try {
    const url = new URL(request.url);
    const accessToken = url.searchParams.get("access_token");
    const shopId = url.searchParams.get("shop_id");
    if (!accessToken || !shopId) {
      return errorResponse16("access_token and shop_id are required", 400);
    }
    const formData = await request.formData();
    const image = formData.get("image");
    if (!image) {
      return errorResponse16("image file is required", 400);
    }
    const partnerId = env.SHOPEE_PARTNER_ID;
    const partnerKey = env.SHOPEE_PARTNER_KEY;
    const path = "/api/v2/media_space/upload_image";
    const timestamp = Math.floor(Date.now() / 1e3);
    const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    const sign = await hmacSha25614(partnerKey, baseString);
    const apiUrl = `${SHOPEE_HOST14}${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;
    const shopeeBody = new FormData();
    shopeeBody.append("image", image);
    const response = await fetch(apiUrl, {
      method: "POST",
      body: shopeeBody
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders19() }
    });
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse16(`Server Error: ${error}`, 500);
  }
}, "onRequest");
async function hmacSha25614(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha25614, "hmacSha256");
function getCorsHeaders19() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(getCorsHeaders19, "getCorsHeaders");
function errorResponse16(message, status) {
  return new Response(JSON.stringify({ status: "error", message }), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders19() }
  });
}
__name(errorResponse16, "errorResponse");

// api/callback.ts
var SHOPEE_HOST15 = "https://partner.shopeemobile.com";
var onRequest21 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders20()
    });
  }
  const code = url.searchParams.get("code");
  const shopId = url.searchParams.get("shop_id");
  const mainAccountId = url.searchParams.get("main_account_id");
  console.log("========== Shopee Callback Received ==========");
  console.log(`Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}`);
  console.log(`Method: ${request.method}`);
  console.log(`Code: ${code || "N/A"}`);
  console.log(`Shop ID: ${shopId || "N/A"}`);
  console.log(`Main Account ID: ${mainAccountId || "N/A"}`);
  if (code && shopId) {
    try {
      const tokenResult = await getAccessToken2(
        env.SHOPEE_PARTNER_ID,
        env.SHOPEE_PARTNER_KEY,
        code,
        parseInt(shopId)
      );
      console.log("Token Result:", JSON.stringify(tokenResult, null, 2));
      let d1Saved = false;
      let d1Error = null;
      if (!tokenResult.error && tokenResult.access_token) {
        try {
          await saveTokenToD12(env.DB, {
            shop_id: parseInt(shopId),
            access_token: tokenResult.access_token,
            refresh_token: tokenResult.refresh_token,
            expire_in: tokenResult.expire_in,
            shop_name: null
          });
          d1Saved = true;
          console.log("Token saved to D1 successfully");
        } catch (e) {
          d1Error = String(e);
          console.error("D1 save error:", e);
        }
      }
      return new Response(generateSuccessHtml(tokenResult, shopId, d1Saved, d1Error), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...getCorsHeaders20()
        }
      });
    } catch (error) {
      console.error("Token\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
      return new Response(generateErrorHtml(String(error)), {
        status: 500,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...getCorsHeaders20()
        }
      });
    }
  }
  let requestBody = null;
  if (request.method === "POST") {
    try {
      requestBody = await request.json();
      console.log("Request Body:", JSON.stringify(requestBody, null, 2));
    } catch (e) {
      console.log("Request body is not JSON or empty");
    }
  }
  console.log("===============================================");
  const responseData = {
    status: "success",
    message: "Shopee callback received",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    data: {
      code: code || null,
      shopId: shopId || null,
      mainAccountId: mainAccountId || null
    }
  };
  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders20()
    }
  });
}, "onRequest");
async function saveTokenToD12(db, data) {
  const accessExpires = new Date(Date.now() + data.expire_in * 1e3).toISOString();
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
  await db.prepare(`
        INSERT INTO tokens (shop_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, shop_name, region)
        VALUES (?, ?, ?, ?, ?, ?, 'TW')
        ON CONFLICT(shop_id) DO UPDATE SET
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            access_token_expires_at = excluded.access_token_expires_at,
            refresh_token_expires_at = excluded.refresh_token_expires_at,
            updated_at = datetime('now')
    `).bind(
    data.shop_id,
    data.access_token,
    data.refresh_token,
    accessExpires,
    refreshExpires,
    data.shop_name
  ).run();
}
__name(saveTokenToD12, "saveTokenToD1");
async function getAccessToken2(partnerId, partnerKey, code, shopId) {
  const timestamp = Math.floor(Date.now() / 1e3);
  const path = "/api/v2/auth/token/get";
  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = await hmacSha25615(partnerKey, baseString);
  const tokenUrl = `${SHOPEE_HOST15}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      code,
      shop_id: shopId,
      partner_id: parseInt(partnerId)
    })
  });
  const result = await response.json();
  return result;
}
__name(getAccessToken2, "getAccessToken");
async function hmacSha25615(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha25615, "hmacSha256");
function generateSuccessHtml(tokenResult, shopId, d1Saved, d1Error) {
  const isSuccess = !tokenResult.error;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopee \u8A8D\u8A3C${isSuccess ? "\u6210\u529F" : "\u5931\u6557"}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 16px;
            max-width: 600px;
            text-align: center;
            backdrop-filter: blur(10px);
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: ${isSuccess ? "#22c55e" : "#ef4444"}; margin: 0 0 20px; }
        .info { background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; text-align: left; margin: 20px 0; }
        .label { color: #888; font-size: 12px; }
        .value { font-family: monospace; word-break: break-all; }
        pre { text-align: left; overflow: auto; background: #000; padding: 10px; border-radius: 8px; font-size: 12px; }
        .d1-status { 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0;
            text-align: center;
        }
        .d1-success { background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; }
        .d1-error { background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #6366f1;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 20px;
            font-weight: 600;
        }
        .btn:hover { background: #4f46e5; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${isSuccess ? "\u2705" : "\u274C"}</div>
        <h1>${isSuccess ? "\u30B7\u30E7\u30C3\u30D7\u8A8D\u8A3C\u5B8C\u4E86\uFF01" : "\u8A8D\u8A3C\u30A8\u30E9\u30FC"}</h1>
        <div class="info">
            <div class="label">Shop ID</div>
            <div class="value">${shopId}</div>
        </div>
        ${isSuccess ? `
        <div class="info">
            <div class="label">Access Token</div>
            <div class="value">${tokenResult.access_token || "N/A"}</div>
        </div>
        <div class="info">
            <div class="label">Refresh Token</div>
            <div class="value">${tokenResult.refresh_token || "N/A"}</div>
        </div>
        <div class="info">
            <div class="label">\u6709\u52B9\u671F\u9650</div>
            <div class="value">${tokenResult.expire_in ? Math.floor(tokenResult.expire_in / 3600) + "\u6642\u9593" : "N/A"}</div>
        </div>
        
        <!-- D1\u4FDD\u5B58\u72B6\u614B -->
        <div class="d1-status ${d1Saved ? "d1-success" : "d1-error"}">
            ${d1Saved ? "\u{1F4BE} \u30C8\u30FC\u30AF\u30F3\u306FD1\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u6C38\u7D9A\u4FDD\u5B58\u3055\u308C\u307E\u3057\u305F\uFF01" : `\u26A0\uFE0F D1\u4FDD\u5B58\u30A8\u30E9\u30FC: ${d1Error || "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30B9\u30AD\u30FC\u30DE\u304C\u9069\u7528\u3055\u308C\u3066\u3044\u308B\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"}`}
        </div>
        ` : ""}
        <details>
            <summary>\u8A73\u7D30\u30EC\u30B9\u30DD\u30F3\u30B9</summary>
            <pre>${JSON.stringify(tokenResult, null, 2)}</pre>
        </details>
        <a href="/" class="btn">\u{1F3E0} \u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u3078</a>
    </div>
    
    ${isSuccess ? `
    <script>
        // localStorage\u306B\u3082\u4FDD\u5B58\uFF08\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\uFF09
        try {
            localStorage.setItem('shopee_auth', JSON.stringify({
                shopId: '${shopId}',
                accessToken: '${tokenResult.access_token || ""}',
                refreshToken: '${tokenResult.refresh_token || ""}',
                shopName: null,
                connectedAt: new Date().toISOString()
            }));
            console.log('Saved to localStorage as backup');
        } catch(e) {
            console.error('localStorage save error:', e);
        }
    <\/script>
    ` : ""}
</body>
</html>`;
}
__name(generateSuccessHtml, "generateSuccessHtml");
function generateErrorHtml(error) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>\u30A8\u30E9\u30FC</title>
    <style>
        body { font-family: sans-serif; background: #1a1a2e; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .container { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 16px; text-align: center; }
        h1 { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <h1>\u274C \u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F</h1>
        <p>${error}</p>
    </div>
</body>
</html>`;
}
__name(generateErrorHtml, "generateErrorHtml");
function getCorsHeaders20() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}
__name(getCorsHeaders20, "getCorsHeaders");

// ../.wrangler/tmp/pages-wGQSOj/functionsRoutes-0.7195373961047927.mjs
var routes = [
  {
    routePath: "/api/ai/translate",
    mountPath: "/api/ai",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/db/order-costs",
    mountPath: "/api/db",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/db/price-rules",
    mountPath: "/api/db",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/db/products",
    mountPath: "/api/db",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/db/region-settings",
    mountPath: "/api/db",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  },
  {
    routePath: "/api/db/shops",
    mountPath: "/api/db",
    method: "",
    middlewares: [],
    modules: [onRequest6]
  },
  {
    routePath: "/api/db/sync",
    mountPath: "/api/db",
    method: "",
    middlewares: [],
    modules: [onRequest7]
  },
  {
    routePath: "/api/db/tokens",
    mountPath: "/api/db",
    method: "",
    middlewares: [],
    modules: [onRequest8]
  },
  {
    routePath: "/api/shopee/add_item",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest9]
  },
  {
    routePath: "/api/shopee/attributes",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest10]
  },
  {
    routePath: "/api/shopee/auth",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest11]
  },
  {
    routePath: "/api/shopee/categories",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest12]
  },
  {
    routePath: "/api/shopee/exchange",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest13]
  },
  {
    routePath: "/api/shopee/item_detail",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest14]
  },
  {
    routePath: "/api/shopee/logistics",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest15]
  },
  {
    routePath: "/api/shopee/orders",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest16]
  },
  {
    routePath: "/api/shopee/products",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest17]
  },
  {
    routePath: "/api/shopee/test-connection",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest18]
  },
  {
    routePath: "/api/shopee/update",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest19]
  },
  {
    routePath: "/api/shopee/upload",
    mountPath: "/api/shopee",
    method: "",
    middlewares: [],
    modules: [onRequest20]
  },
  {
    routePath: "/api/callback",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest21]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
