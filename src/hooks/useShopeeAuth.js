import { useState, useEffect, useCallback } from 'react';
import { testConnection } from '../services/shopeeApi';

const STORAGE_KEY = 'shopee_auth';

/**
 * Shopee認証状態を管理するHook
 */
export function useShopeeAuth() {
    const [authState, setAuthState] = useState(() => {
        // localStorageから初期値を読み込み
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load auth state:', e);
        }
        return {
            accessToken: '',
            refreshToken: '',
            shopId: '',
            shopName: '',
            isConnected: false,
            lastTested: null
        };
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shopInfo, setShopInfo] = useState(null);

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
                    lastTested: new Date().toISOString()
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
    const disconnect = useCallback(() => {
        setAuthState({
            accessToken: '',
            refreshToken: '',
            shopId: '',
            shopName: '',
            isConnected: false,
            lastTested: null
        });
        setShopInfo(null);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    // トークンを更新
    const updateTokens = useCallback((accessToken, refreshToken) => {
        saveAuth({ accessToken, refreshToken });
    }, [saveAuth]);

    return {
        // 状態
        accessToken: authState.accessToken,
        refreshToken: authState.refreshToken,
        shopId: authState.shopId,
        shopName: authState.shopName,
        isConnected: authState.isConnected,
        lastTested: authState.lastTested,
        isLoading,
        error,
        shopInfo,

        // アクション
        testConnection: testApiConnection,
        disconnect,
        updateTokens,
        saveAuth
    };
}
