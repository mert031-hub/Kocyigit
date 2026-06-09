const Order = require('../models/Order');
const User = require('../models/User');
const Review = require('../models/Review');

/**
 * LUXE BERLIN - ADMIN DASHBOARD CONTROLLER (BACKEND)
 * Dashboard istatistiklerini, özet listeleri ve grafik verilerini sağlar.
 */

exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Temel İstatistikler
        const totalOrders = await Order.countDocuments({ isArchived: false });
        const pendingOrders = await Order.countDocuments({ status: 'Pending' });

        // Sadece iptal edilmemiş siparişlerin cirosu
        const ordersForRevenue = await Order.find({ status: { $ne: 'Cancelled' } });
        const totalRevenue = ordersForRevenue.reduce((sum, order) => sum + order.totalAmount, 0);

        // 2. Grafik Verisi (Son 6 Ayın Satışları - Senior Logic)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const salesChartData = await Order.aggregate([
            { $match: { date: { $gte: sixMonthsAgo }, status: { $ne: 'Cancelled' } } },
            {
                $group: {
                    _id: { month: { $month: "$date" }, year: { $year: "$date" } },
                    total: { $sum: "$totalAmount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // 3. Özet Listeler
        const recentOrders = await Order.find({ isArchived: false })
            .sort({ date: -1 })
            .limit(10);

        const admins = await User.find({}, 'username _id createdAt');

        const recentReviews = await Review.find()
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({
            success: true,
            stats: {
                totalOrders,
                revenue: totalRevenue,
                pendingOrders
            },
            salesChart: salesChartData, // Grafik için veri gönderiliyor
            recentOrders,
            admins,
            reviews: recentReviews
        });

    } catch (err) {
        console.error("Dashboard Stats Error:", err.message);
        res.status(500).json({ success: false, message: "Serverfehler beim Laden der Statistiken." });
    }
};