const Sale     = require("../models/Sale");
const Purchase = require("../models/Purchase");
const Product  = require("../models/Product");
const Customer = require("../models/Customer");
const Vendor   = require("../models/Vendor");

exports.getDashboardStats = async (req, res) => {
  try {
    const today        = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth    = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      totalProducts, totalVendors, totalCustomers,
      monthlySales, monthlyPurchases, lastMonthSales,
      lowStockProducts, recentSales, topProducts,
      paymentStatusBreakdown, customerTypeBreakdown,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Vendor.countDocuments({ status: "Active" }),
      Customer.countDocuments(),

      Sale.aggregate([
        { $match: { date: { $gte: startOfMonth }, status: { $ne: "Cancelled" } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 }, received: { $sum: "$amountPaid" }, due: { $sum: "$amountDue" } } },
      ]),
      Purchase.aggregate([
        { $match: { date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: lastMonth, $lte: lastMonthEnd }, status: { $ne: "Cancelled" } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),

      Product.find({ $expr: { $lte: ["$stock", "$minStockAlert"] } }).populate("vendor","name").limit(10),

      Sale.find({ status: { $ne: "Cancelled" } })
        .populate("customer","name").sort({ date: -1 }).limit(6),

      Sale.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $unwind: "$items" },
        { $group: { _id: "$items.product", name: { $first: "$items.productName" }, totalQty: { $sum: "$items.qty" }, totalRevenue: { $sum: "$items.total" } } },
        { $sort: { totalRevenue: -1 } }, { $limit: 6 },
      ]),

      // Sale status breakdown for donut
      Sale.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$grandTotal" } } },
      ]),

      // Customer type breakdown
      Customer.aggregate([
        { $group: { _id: "$customerType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Monthly trend last 6 months
    const monthlyTrend = await Sale.aggregate([
      { $match: { date: { $gte: new Date(today.getFullYear(), today.getMonth() - 5, 1) }, status: { $ne: "Cancelled" } } },
      { $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          revenue: { $sum: "$grandTotal" }, orders: { $sum: 1 },
          received: { $sum: "$amountPaid" },
      }},
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Payment mode breakdown
    const paymentModes = await Sale.aggregate([
      { $match: { status: { $ne: "Cancelled" }, date: { $gte: startOfMonth } } },
      { $group: { _id: "$paymentMode", count: { $sum: 1 }, amount: { $sum: "$grandTotal" } } },
      { $sort: { amount: -1 } },
    ]);

    // Vendor outstanding
    const vendorOutstanding = await Vendor.aggregate([
      { $project: { name: 1, outstanding: { $subtract: ["$totalPurchased", "$totalPaid"] } } },
      { $match: { outstanding: { $gt: 0 } } },
      { $sort: { outstanding: -1 } }, { $limit: 5 },
    ]);

    const thisMonthRev  = monthlySales[0]?.total || 0;
    const lastMonthRev  = lastMonthSales[0]?.total || 0;
    const growthPct     = lastMonthRev > 0
      ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1)
      : null;

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts, totalVendors, totalCustomers,
          monthlyRevenue:    thisMonthRev,
          monthlySalesCount: monthlySales[0]?.count || 0,
          monthlyReceived:   monthlySales[0]?.received || 0,
          monthlyDue:        monthlySales[0]?.due || 0,
          monthlyPurchases:  monthlyPurchases[0]?.total || 0,
          growthPct,
        },
        lowStockProducts,
        recentSales,
        topProducts,
        monthlyTrend,
        paymentStatusBreakdown,
        paymentModes,
        customerTypeBreakdown,
        vendorOutstanding,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
