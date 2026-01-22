// Mock data for development
export const mockStats = {
    totalProducts: 156,
    activeListings: 142,
    pendingOrders: 23,
    totalSales: 2847500
};

export const mockProducts = [
    {
        id: 1,
        name: '高品質ワイヤレスイヤホン Bluetooth 5.0',
        price: 3980,
        stock: 45,
        status: 'active',
        sales: 234,
        image: null
    },
    {
        id: 2,
        name: 'スマートウォッチ 防水 心拍計測',
        price: 5980,
        stock: 32,
        status: 'active',
        sales: 189,
        image: null
    },
    {
        id: 3,
        name: 'ポータブル充電器 20000mAh 急速充電対応',
        price: 2480,
        stock: 0,
        status: 'out_of_stock',
        sales: 567,
        image: null
    },
    {
        id: 4,
        name: 'LEDデスクライト 調光可能 USB充電',
        price: 1980,
        stock: 78,
        status: 'active',
        sales: 123,
        image: null
    },
    {
        id: 5,
        name: 'ミニ空気清浄機 USB給電 車載可能',
        price: 4580,
        stock: 15,
        status: 'low_stock',
        sales: 89,
        image: null
    },
    {
        id: 6,
        name: 'スマホスタンド 折りたたみ式 角度調整可能',
        price: 980,
        stock: 200,
        status: 'active',
        sales: 445,
        image: null
    }
];

export const mockOrders = [
    {
        id: 'SO-2026012201',
        customer: '田中太郎',
        items: 2,
        total: 7960,
        status: 'pending',
        date: '2026-01-22 09:30'
    },
    {
        id: 'SO-2026012202',
        customer: '鈴木花子',
        items: 1,
        total: 5980,
        status: 'shipped',
        date: '2026-01-22 08:15'
    },
    {
        id: 'SO-2026012203',
        customer: '佐藤次郎',
        items: 3,
        total: 8440,
        status: 'processing',
        date: '2026-01-21 16:45'
    },
    {
        id: 'SO-2026012204',
        customer: '高橋美咲',
        items: 1,
        total: 3980,
        status: 'delivered',
        date: '2026-01-21 14:20'
    },
    {
        id: 'SO-2026012205',
        customer: '渡辺健一',
        items: 5,
        total: 12380,
        status: 'pending',
        date: '2026-01-21 11:00'
    }
];

export const mockCategories = [
    { id: 1, name: '電子機器', count: 45 },
    { id: 2, name: 'スマホアクセサリー', count: 38 },
    { id: 3, name: '家電製品', count: 27 },
    { id: 4, name: 'ファッション', count: 22 },
    { id: 5, name: '美容・健康', count: 18 },
    { id: 6, name: 'ホーム・キッチン', count: 6 }
];

export const getStatusBadge = (status) => {
    const statusMap = {
        active: { label: '出品中', className: 'badge-success' },
        out_of_stock: { label: '在庫切れ', className: 'badge-error' },
        low_stock: { label: '残りわずか', className: 'badge-warning' },
        pending: { label: '保留中', className: 'badge-warning' },
        processing: { label: '処理中', className: 'badge-info' },
        shipped: { label: '発送済み', className: 'badge-info' },
        delivered: { label: '配達完了', className: 'badge-success' }
    };
    return statusMap[status] || { label: status, className: 'badge-info' };
};

export const formatPrice = (price) => {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY'
    }).format(price);
};
