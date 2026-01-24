import { useState, useEffect, useCallback } from 'react';
import { testConnection } from '../services/shopeeApi';

const STORAGE_KEY = 'shopee_auth';
const DB_TOKENS_API = '/api/db/tokens';

/**
 * Shopee認証状態を管理するHook (D1永続化対応版)
 * 
 * 優先順位:
 * 1. D1データベース (永続)
 * 2. localStorage (バックアップ)
 */
export function useShopeeAuth() {
    const [authState, setAuthState] = useState({
        accessToken: '',
        refreshToken: '',
        shopId: '',
        shopName: '',
        isConnected: false,
        lastTested: null,
        source: null // 'localStorage' | 'd1' | null
    });

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [shopInfo, setShopInfo] = useState(null);

    // 初期化: D1 -> localStorage の順でトークンを読み込み
    useEffect(() => {
        const loadAuth = async () => {
            setIsLoading(true);

            // まずlocalStorageをチェック
            let localAuth = null;
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    localAuth = JSON.parse(saved);
                }
            } catch (e) {
                console.error('Failed to load from localStorage:', e);
            }

            // shop_idがあればD1をチェック
            const shopId = localAuth?.shopId;
            if (shopId) {
                try {
                    const response = await fetch(`${DB_TOKENS_API}?shop_id=${shopId}`);
                    const result = await response.json();

                    if (result.status === 'success' && result.data?.access_token) {
                        // D1からトークンを読み込み
                        const d1Auth = {
                            accessToken: result.data.access_token,
                            refreshToken: result.data.refresh_token || '',
                            shopId: String(result.data.shop_id),
                            shopName: result.data.shop_name || localAuth?.shopName || '',
                            isConnected: !result.data.is_expired,
                            lastTested: result.data.updated_at,
                            source: 'd1'
                        };
                        setAuthState(d1Auth);

                        // トークンが期限切れならリフレッシュを試行
                        if (result.data.is_expired && result.data.refresh_token) {
                            console.log('Token expired, attempting refresh...');
                            refreshTokenFromD1(shopId);
                        }

                        setIsLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error('Failed to load from D1:', e);
                }
            }

            // D1になければlocalStorageを使用
            if (localAuth) {
                setAuthState({
                    ...localAuth,
                    source: 'localStorage'
                });
            }

            setIsLoading(false);
        };

        loadAuth();
    }, []);

    // D1のトークンをリフレッシュ
    const refreshTokenFromD1 = async (shopId) => {
        try {
            const response = await fetch(`${DB_TOKENS_API}?shop_id=${shopId}`, {
                method: 'POST'
            });
            const result = await response.json();

            if (result.status === 'success' && result.data?.access_token) {
                setAuthState(prev => ({
                    ...prev,
                    accessToken: result.data.access_token,
                    refreshToken: result.data.refresh_token || prev.refreshToken,
                    isConnected: true,
                    source: 'd1'
                }));
                console.log('Token refreshed successfully');
                return { success: true };
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
        isLoading,
        error,
        shopInfo,

        // アクション
        testConnection: testApiConnection,
        disconnect,
        updateTokens,
        saveAuth,
        refreshToken: () => refreshTokenFromD1(authState.shopId),
        loadFromD1
    };
}
