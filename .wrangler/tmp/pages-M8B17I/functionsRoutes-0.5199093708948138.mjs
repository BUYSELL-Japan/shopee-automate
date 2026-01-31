import { onRequest as __api_ai_translate_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\ai\\translate.ts"
import { onRequest as __api_db_price_rules_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\db\\price-rules.ts"
import { onRequest as __api_db_products_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\db\\products.ts"
import { onRequest as __api_db_sync_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\db\\sync.ts"
import { onRequest as __api_db_tokens_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\db\\tokens.ts"
import { onRequest as __api_shopee_add_item_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\add_item.ts"
import { onRequest as __api_shopee_attributes_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\attributes.ts"
import { onRequest as __api_shopee_auth_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\auth.ts"
import { onRequest as __api_shopee_categories_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\categories.ts"
import { onRequest as __api_shopee_exchange_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\exchange.ts"
import { onRequest as __api_shopee_item_detail_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\item_detail.ts"
import { onRequest as __api_shopee_logistics_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\logistics.ts"
import { onRequest as __api_shopee_orders_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\orders.ts"
import { onRequest as __api_shopee_products_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\products.ts"
import { onRequest as __api_shopee_search_brands_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\search_brands.ts"
import { onRequest as __api_shopee_test_connection_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\test-connection.ts"
import { onRequest as __api_shopee_update_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\update.ts"
import { onRequest as __api_shopee_upload_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\shopee\\upload.ts"
import { onRequest as __api_callback_ts_onRequest } from "C:\\Users\\buyse\\OneDrive\\デスクトップ\\Antigravity\\Shopee Auto\\project\\functions\\api\\callback.ts"

export const routes = [
    {
      routePath: "/api/ai/translate",
      mountPath: "/api/ai",
      method: "",
      middlewares: [],
      modules: [__api_ai_translate_ts_onRequest],
    },
  {
      routePath: "/api/db/price-rules",
      mountPath: "/api/db",
      method: "",
      middlewares: [],
      modules: [__api_db_price_rules_ts_onRequest],
    },
  {
      routePath: "/api/db/products",
      mountPath: "/api/db",
      method: "",
      middlewares: [],
      modules: [__api_db_products_ts_onRequest],
    },
  {
      routePath: "/api/db/sync",
      mountPath: "/api/db",
      method: "",
      middlewares: [],
      modules: [__api_db_sync_ts_onRequest],
    },
  {
      routePath: "/api/db/tokens",
      mountPath: "/api/db",
      method: "",
      middlewares: [],
      modules: [__api_db_tokens_ts_onRequest],
    },
  {
      routePath: "/api/shopee/add_item",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_add_item_ts_onRequest],
    },
  {
      routePath: "/api/shopee/attributes",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_attributes_ts_onRequest],
    },
  {
      routePath: "/api/shopee/auth",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_auth_ts_onRequest],
    },
  {
      routePath: "/api/shopee/categories",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_categories_ts_onRequest],
    },
  {
      routePath: "/api/shopee/exchange",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_exchange_ts_onRequest],
    },
  {
      routePath: "/api/shopee/item_detail",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_item_detail_ts_onRequest],
    },
  {
      routePath: "/api/shopee/logistics",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_logistics_ts_onRequest],
    },
  {
      routePath: "/api/shopee/orders",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_orders_ts_onRequest],
    },
  {
      routePath: "/api/shopee/products",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_products_ts_onRequest],
    },
  {
      routePath: "/api/shopee/search_brands",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_search_brands_ts_onRequest],
    },
  {
      routePath: "/api/shopee/test-connection",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_test_connection_ts_onRequest],
    },
  {
      routePath: "/api/shopee/update",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_update_ts_onRequest],
    },
  {
      routePath: "/api/shopee/upload",
      mountPath: "/api/shopee",
      method: "",
      middlewares: [],
      modules: [__api_shopee_upload_ts_onRequest],
    },
  {
      routePath: "/api/callback",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_callback_ts_onRequest],
    },
  ]