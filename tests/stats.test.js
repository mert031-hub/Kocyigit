// Test edilecek fonksiyon simülasyonu
const calculateRevenue = (orders) => {
    return orders
        .filter(o => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + o.totalAmount, 0);
};

describe('LUXE BERLIN - Dashboard İstatistik Mantığı', () => {

    it('İptal edilen (Cancelled) siparişleri ciroya dahil etmemeli', () => {
        const mockOrders = [
            { totalAmount: 1000, status: 'Delivered' },
            { totalAmount: 500, status: 'Cancelled' }, // Bu dahil olmamalı
            { totalAmount: 200, status: 'Pending' }
        ];

        const total = calculateRevenue(mockOrders);
        expect(total).toBe(1200); // 1000 + 200
    });

    it('Sipariş listesi boşsa ciro 0 dönmeli', () => {
        expect(calculateRevenue([])).toBe(0);
    });
});