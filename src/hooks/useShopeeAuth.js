import { useState, useEffect, useCallback } from 'react';
import { testConnection } from '../services/shopeeApi';

const STORAGE_KEY = 'shopee_auth';
const DB_TOKENS_API = '/api/db/tokens';
const DB_SHOPS_API = '/api/db/shops';

/**
 * Shopee認証状態を管理するHook (マルチリージョン対応版)
 * 
 * リージョン切り替え時に自動的にそのリージョンの認証情報を読み込む
 */
export function useShopeeAuth() {
    // アクティブリージョン
    const [activeRegion, setActiveRegion] = useState(() => {
        return localStorage.getItem('shopee_active_region') || 'TW'
    });

    const [authState, setAuthState] = useState({
        accessToken: '',
        refreshToken: '',
        shopId: '',
        shopName: '',
        isConnected: false,
        lastTested: null,
        source: null, // 'localStorage' | 'd1' | null
        region: 'TW'
    });

    // 各リージョンのショップ情報キャッシュ
    const [shopsCache, setShopsCache] = useState({});

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [shopInfo, setShopInfo] = useState(null);

    // リージョン変更イベントをリッスン
    useEffect(() => {
        const handleRegionChange = (e) => {
            const newRegion = e.detail;
            setActiveRegion(newRegion);
        };

        window.addEventListener('regionChanged', handleRegionChange);
        return () => window.removeEventListener('regionChanged', handleRegionChange);
    }, []);

    // リージョン別のショップ情報を読み込み
    const loadShopByRegion = useCallback(async (region) => {
        console.log(`[useShopeeAuth] 🔄 Loading shop for region: ${region}`);
        setIsLoading(true);
        setError(null);

        try {
            // 1. まずtokensテーブルからアクセストークンを取得（優先）
            console.log(`[useShopeeAuth] 📡 Fetching from tokens API: ${DB_TOKENS_API}?region=${region}`);
            const tokensRes = await fetch(`${DB_TOKENS_API}?region=${region}`);
            const tokensData = await tokensRes.json();
            console.log(`[useShopeeAuth] 📦 Tokens API response:`, tokensData);

            if (tokensData.status === 'success' && tokensData.data?.access_token) {
                console.log(`[useShopeeAuth] ✅ Found token for region ${region}, shop_id: ${tokensData.data.shop_id}`);
                const tokenAuth = {
                    accessToken: tokensData.data.access_token,
                    refreshToken: tokensData.data.refresh_token || '',
                    shopId: String(tokensData.data.shop_id),
                    shopName: tokensData.data.shop_name || `${region} Shop`,
                    isConnected: true,
                    lastTested: tokensData.data.updated_at,
                    source: 'd1-tokens',
                    region: region
                };
                console.log(`[useShopeeAuth] 🔐 Setting auth state:`, tokenAuth);
                setAuthState(tokenAuth);
                setShopsCache(prev => ({ ...prev, [region]: tokenAuth }));
                localStorage.setItem(`${STORAGE_KEY}_${region}`, JSON.stringify(tokenAuth));
                return { success: true, shop: tokenAuth };
            }

            // 2. tokensテーブルにない場合、shopsテーブルを確認
            console.log(`[useShopeeAuth] 📡 Fetching from shops API: ${DB_SHOPS_API}?region=${region}&active=true`);
            const response = await fetch(`${DB_SHOPS_API}?region=${region}&active=true`);
            const result = await response.json();
            console.log(`[useShopeeAuth] 📦 Shops API response:`, result);

            if (result.status === 'success' && result.data && result.data.length > 0) {
                const shop = result.data[0];
                if (shop.access_token) {
                    console.log(`[useShopeeAuth] ✅ Found shop with token for region ${region}`);
                    const shopAuth = {
                        accessToken: shop.access_token || '',
                        refreshToken: shop.refresh_token || '',
                        shopId: String(shop.shop_id),
                        shopName: shop.shop_name || `${region} Shop`,
                        isConnected: true,
                        lastTested: shop.updated_at,
                        source: 'd1-shops',
                        region: region
                    };
                    setAuthState(shopAuth);
                    setShopsCache(prev => ({ ...prev, [region]: shopAuth }));
                    localStorage.setItem(`${STORAGE_KEY}_${region}`, JSON.stringify(shopAuth));
                    return { success: true, shop: shopAuth };
                } else {
                    console.log(`[useShopeeAuth] ⚠️ Shop found but no access_token`);
                }
            }

            // 3. D1にない場合、localStorageから読み込み
            console.log(`[useShopeeAuth] 📂 Checking localStorage for ${STORAGE_KEY}_${region}`);
            const savedKey = `${STORAGE_KEY}_${region}`;
            const saved = localStorage.getItem(savedKey);
            console.log(`[useShopeeAuth] 📦 localStorage data:`, saved);
            if (saved) {
                const localAuth = JSON.parse(saved);
                if (localAuth.accessToken) {
                    console.log(`[useShopeeAuth] ✅ Found in localStorage`);
                    setAuthState({ ...localAuth, region });
                    return { success: true, shop: localAuth };
                }
            }

            // 4. 既存のトークンAPIからも試行 (後方互換性)
            if (region === 'TW') {
                const oldSaved = localStorage.getItem(STORAGE_KEY);
                console.log(`[useShopeeAuth] 📂 Checking old localStorage key:`, oldSaved);
                if (oldSaved) {
                    const localAuth = JSON.parse(oldSaved);
                    if (localAuth.accessToken) {
                        console.log(`[useShopeeAuth] ✅ Found in old localStorage`);
                        setAuthState({ ...localAuth, region: 'TW' });
                        return { success: true, shop: localAuth };
                    }
                }
            }

            console.log(`[useShopeeAuth] ❌ No shop found for region ${region}`);
            setAuthState(prev => ({
                ...prev,
                accessToken: '',
                shopId: '',
                isConnected: false,
                region
            }));
            return { success: false, error: `No shop found for region ${region}` };
        } catch (e) {
            console.error('[useShopeeAuth] ❌ Error loading shop:', e);
            setError(e.message);
            return { success: false, error: e.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 初期化 & リージョン変更時にショップ情報を読み込み
    useEffect(() => {
        loadShopByRegion(activeRegion);
    }, [activeRegion, loadShopByRegion]);

    // D1のトークンをリフレッシュ
    const refreshTokenFromD1 = async (shopId) => {
        try {
            const response = await fetch(`${DB_TOKENS_API}?shop_id=${shopId}`, {
                method: 'POST'
            });
            const result = await response.json();

            if (result.status === 'success' && result.data?.access_token) {
                // 現在のショップと同じなら状態更新
                if (String(shopId) === String(authState.shopId)) {
                    setAuthState(prev => ({
                        ...prev,
                        accessToken: result.data.access_token,
                        refreshToken: result.data.refresh_token || prev.refreshToken,
                        isConnected: true,
                        source: 'd1'
                    }));
                }
                console.log('Token refreshed successfully');
                return { success: true, data: result.data };
            }
            return { success: false, error: result.message };
        } catch (e) {
            console.error('Token refresh failed:', e);
            return { success: false, error: e.message };
        }
    };

    // 認証情報を保存
    const saveAuth = useCallback((newState) => {
        const updated = { ...authState, ...newState };
        setAuthState(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }, [authState]);

    // 接続テストを実行
    const testApiConnection = useCallback(async (accessToken, shopId) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await testConnection(accessToken, shopId);

            if (result.status === 'success') {
                const newState = {
                    accessToken,
                    shopId,
                    shopName: result.shop_info?.shop_name || '',
                    isConnected: true,
                    lastTested: new Date().toISOString(),
                    source: 'localStorage'
                };
                saveAuth(newState);
                setShopInfo(result.shop_info);
                return { success: true, shopInfo: result.shop_info };
            } else {
                setError(result.message || '接続に失敗しました');
                saveAuth({ isConnected: false });
                return { success: false, error: result.message };
            }
        } catch (e) {
            const errorMessage = e.message || '接続エラーが発生しました';
            setError(errorMessage);
            saveAuth({ isConnected: false });
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [saveAuth]);

    // 切断
    const disconnect = useCallback(async () => {
        // D1からも削除
        if (authState.shopId) {
            try {
                await fetch(`${DB_TOKENS_API}?shop_id=${authState.shopId}`, {
                    method: 'DELETE'
                });
            } catch (e) {
                console.error('Failed to delete from D1:', e);
            }
        }

        setAuthState({
            accessToken: '',
            refreshToken: '',
            shopId: '',
            shopName: '',
            isConnected: false,
            lastTested: null,
            source: null
        });
        setShopInfo(null);
        localStorage.removeItem(STORAGE_KEY);
    }, [authState.shopId]);

    // トークンを更新
    const updateTokens = useCallback((accessToken, refreshToken) => {
        saveAuth({ accessToken, refreshToken });
    }, [saveAuth]);

    // 認証コードを交換（フロントエンド認証フロー用）
    const exchangeFullAuth = useCallback(async (code, shopId, region = 'TW') => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/shopee/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, shop_id: parseInt(shopId), region })
            });
            const result = await response.json();

            if (result.status === 'success' && result.data?.access_token) {
                const d1Auth = {
                    accessToken: result.data.access_token,
                    refreshToken: result.data.refresh_token || '',
                    shopId: String(result.data.shop_id),
                    shopName: '', // 後で更新
                    isConnected: true,
                    lastTested: new Date().toISOString(),
                    source: 'd1',
                    region: region
                };
                setAuthState(d1Auth);
                setActiveRegion(region);
                localStorage.setItem(`shopee_auth_${region}`, JSON.stringify(d1Auth));
                localStorage.setItem('shopee_active_region', region);

                // キャッシュを更新
                shopsCache[region] = d1Auth;

                return { success: true, region };
            }
            return { success: false, error: result.message || 'Authentication failed' };
        } catch (e) {
            return { success: false, error: e.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // D1からトークンを読み込み
    const loadFromD1 = useCallback(async (shopId) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${DB_TOKENS_API}?shop_id=${shopId}`);
            const result = await response.json();

            if (result.status === 'success' && result.data?.access_token) {
                const d1Auth = {
                    accessToken: result.data.access_token,
                    refreshToken: result.data.refresh_token || '',
                    shopId: String(result.data.shop_id),
                    shopName: result.data.shop_name || '',
                    isConnected: !result.data.is_expired,
                    lastTested: result.data.updated_at,
                    source: 'd1'
                };
                setAuthState(d1Auth);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(d1Auth));
                return { success: true };
            }
            return { success: false, error: 'Token not found in D1' };
        } catch (e) {
            return { success: false, error: e.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        // 状態
        accessToken: authState.accessToken,
        refreshToken: authState.refreshToken,
        shopId: authState.shopId,
        shopName: authState.shopName,
        isConnected: authState.isConnected,
        lastTested: authState.lastTested,
        source: authState.source, // 'localStorage' | 'd1'
        activeRegion, // 現在のアクティブリージョン
        region: authState.region,
        isLoading,
        error,
        shopInfo,
        shopsCache, // 全リージョンのショップ情報キャッシュ

        // アクション
        testConnection: testApiConnection,
        disconnect,
        updateTokens,
        saveAuth,
        refreshToken: () => refreshTokenFromD1(authState.shopId),
        refreshShopToken: refreshTokenFromD1,
        loadFromD1,
        exchangeFullAuth,
        loadShopByRegion, // リージョン別ショップ読み込み
        setActiveRegion   // リージョン変更
    };
}
