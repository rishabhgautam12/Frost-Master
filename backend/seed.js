/**
 * HomeTrack Seed Script
 * Run: node seed.js
 * Populates MongoDB with sample Indian business data for testing.
 * Delete all data: node seed.js --wipe
 */

require("dotenv").config();
const mongoose  = require("mongoose");
const bcrypt    = require("bcryptjs");

const User        = require("./models/User");
const Vendor      = require("./models/Vendor");
const Product     = require("./models/Product");
const Customer    = require("./models/Customer");
const VendorLedger= require("./models/VendorLedger");
const Sale        = require("./models/Sale");
const Purchase    = require("./models/Purchase");

const WIPE_ONLY = process.argv.includes("--wipe");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Wipe all collections
  await Promise.all([
    User.deleteMany({}), Vendor.deleteMany({}), Product.deleteMany({}),
    Customer.deleteMany({}), VendorLedger.deleteMany({}),
    Sale.deleteMany({}), Purchase.deleteMany({}),
  ]);
  console.log("🗑️  Wiped all collections");
  if (WIPE_ONLY) { await mongoose.disconnect(); console.log("Done."); return; }

  // ── 1. USERS ──────────────────────────────────────────────
  const users = await User.insertMany([
    { name: "Sahil Gupta",  username: "admin",  password: await bcrypt.hash("admin123",  10), role: "admin",  isActive: true },
    { name: "Priya Sharma", username: "priya",  password: await bcrypt.hash("priya123",  10), role: "staff",  isActive: true },
  ]);
  console.log(`👤 Users: ${users.length}`);

  // ── 2. VENDORS ────────────────────────────────────────────
  const vendorData = [
    { name:"Rohan Sharma",   company:"Rohan Traders",    phone:"9876543210", email:"rohan@rohantraders.in",   city:"Delhi",     gstin:"07AABCT1332L1ZV", status:"Active",   totalPurchased:125000, totalPaid:95000  },
    { name:"Suresh Singh",   company:"SS Kitchens",      phone:"9812345678", email:"suresh@sskitchens.com",   city:"Mumbai",    gstin:"27AACCS3840Q1ZO", status:"Active",   totalPurchased:88000,  totalPaid:60000  },
    { name:"Meena Joshi",    company:"MetalMart India",  phone:"9934567890", email:"meena@metalmart.in",      city:"Jaipur",    gstin:"08AACFM4521R1ZK", status:"Active",   totalPurchased:210000, totalPaid:210000 },
    { name:"Ankit Patel",    company:"WoodCraft Co.",    phone:"9023456789", email:"ankit@woodcraft.co.in",   city:"Ahmedabad", gstin:"24AAHFP3920K1ZE", status:"Active",   totalPurchased:42000,  totalPaid:42000  },
    { name:"Priya Nair",     company:"ElectraHome",      phone:"8965432100", email:"priya@electrahome.in",    city:"Bangalore", gstin:"29AAACE3098P1Z5", status:"Inactive", totalPurchased:67800,  totalPaid:67800  },
    { name:"Kavita Rao",     company:"HomeEssentials",   phone:"9543210987", email:"kavita@homeessentials.in",city:"Chennai",   gstin:"33AAAIH5678R1ZQ", status:"Active",   totalPurchased:56000,  totalPaid:36000  },
  ];
  const vendors = await Vendor.insertMany(vendorData);
  console.log(`🏪 Vendors: ${vendors.length}`);

  const [vRohan, vSS, vMetal, vWood, vElectra, vHome] = vendors;

  // ── 3. PRODUCTS ───────────────────────────────────────────
  const productData = [
    { name:"Iron Tawa 30cm",          modelNumber:"RT-TW-030",  brand:"Prestige",  vendor:vRohan._id, purchasePrice:280,  sellingPrice:349,  stock:85,  minStockAlert:15, gstRate:18 },
    { name:"Steel Kadai 2L",          modelNumber:"RT-KD-02L",  brand:"Hawkins",   vendor:vRohan._id, purchasePrice:420,  sellingPrice:549,  stock:42,  minStockAlert:10, gstRate:18 },
    { name:"Pressure Cooker 5L",      modelNumber:"RT-PC-05L",  brand:"Prestige",  vendor:vRohan._id, purchasePrice:850,  sellingPrice:1099, stock:28,  minStockAlert:8,  gstRate:18 },
    { name:"Non-stick Pan 24cm",      modelNumber:"SK-NS-024",  brand:"Wonderchef",vendor:vSS._id,    purchasePrice:350,  sellingPrice:459,  stock:60,  minStockAlert:12, gstRate:18 },
    { name:"Dinner Plate Set (6pcs)", modelNumber:"SK-DP-S06",  brand:"Borosil",   vendor:vSS._id,    purchasePrice:650,  sellingPrice:899,  stock:35,  minStockAlert:10, gstRate:12 },
    { name:"Serving Bowl Set",        modelNumber:"SK-SB-S04",  brand:"Borosil",   vendor:vSS._id,    purchasePrice:280,  sellingPrice:399,  stock:55,  minStockAlert:10, gstRate:12 },
    { name:"Stainless Steel Thali",   modelNumber:"MM-TH-001",  brand:"Vinod",     vendor:vMetal._id, purchasePrice:180,  sellingPrice:249,  stock:120, minStockAlert:20, gstRate:18 },
    { name:"Steel Glass Set (6pcs)",  modelNumber:"MM-GS-S06",  brand:"Vinod",     vendor:vMetal._id, purchasePrice:220,  sellingPrice:299,  stock:90,  minStockAlert:15, gstRate:18 },
    { name:"Wooden Cutting Board",    modelNumber:"WC-CB-001",  brand:"Trebonn",   vendor:vWood._id,  purchasePrice:180,  sellingPrice:259,  stock:3,   minStockAlert:10, gstRate:12 },
    { name:"Wooden Spoon Set",        modelNumber:"WC-SP-S05",  brand:"Trebonn",   vendor:vWood._id,  purchasePrice:120,  sellingPrice:179,  stock:45,  minStockAlert:10, gstRate:12 },
    { name:"Rice Cooker 1.8L",        modelNumber:"EH-RC-018",  brand:"Philips",   vendor:vElectra._id,purchasePrice:1200, sellingPrice:1599, stock:18,  minStockAlert:5,  gstRate:18 },
    { name:"Electric Kettle 1.5L",    modelNumber:"EH-EK-015",  brand:"Philips",   vendor:vElectra._id,purchasePrice:780,  sellingPrice:999,  stock:22,  minStockAlert:5,  gstRate:18 },
    { name:"Casserole Set 3pcs",      modelNumber:"HE-CS-003",  brand:"Cello",     vendor:vHome._id,  purchasePrice:480,  sellingPrice:649,  stock:0,   minStockAlert:8,  gstRate:18 },
    { name:"Water Bottle 1L",         modelNumber:"HE-WB-01L",  brand:"Milton",    vendor:vHome._id,  purchasePrice:150,  sellingPrice:199,  stock:4,   minStockAlert:20, gstRate:18 },
  ];
  const products = await Product.insertMany(productData);
  console.log(`📦 Products: ${products.length}`);

  // ── 4. VENDOR LEDGER ──────────────────────────────────────
  const ledgerEntries = [
    { vendor:vRohan._id, type:"Purchase", invoiceNo:"INV-R-2401", date:new Date("2026-05-02"), amount:45000, paid:45000 },
    { vendor:vRohan._id, type:"Purchase", invoiceNo:"INV-R-2402", date:new Date("2026-05-10"), amount:38000, paid:18000 },
    { vendor:vRohan._id, type:"Payment",  invoiceNo:"PMT-R-1001", date:new Date("2026-05-12"), amount:18000, paid:18000 },
    { vendor:vSS._id,    type:"Purchase", invoiceNo:"INV-S-1101", date:new Date("2026-04-28"), amount:32000, paid:32000 },
    { vendor:vSS._id,    type:"Purchase", invoiceNo:"INV-S-1102", date:new Date("2026-05-08"), amount:28000, paid:10000 },
    { vendor:vSS._id,    type:"Payment",  invoiceNo:"PMT-S-0501", date:new Date("2026-05-13"), amount:10000, paid:10000 },
    { vendor:vMetal._id, type:"Purchase", invoiceNo:"INV-M-3301", date:new Date("2026-04-20"), amount:55000, paid:55000 },
    { vendor:vMetal._id, type:"Purchase", invoiceNo:"INV-M-3302", date:new Date("2026-05-05"), amount:45000, paid:45000 },
    { vendor:vMetal._id, type:"Debit Note",invoiceNo:"DN-M-0011", date:new Date("2026-05-09"), amount:5000,  paid:5000  },
    { vendor:vWood._id,  type:"Purchase", invoiceNo:"INV-W-0701", date:new Date("2026-05-01"), amount:22000, paid:22000 },
    { vendor:vWood._id,  type:"Payment",  invoiceNo:"PMT-W-0301", date:new Date("2026-05-05"), amount:20000, paid:20000 },
    { vendor:vHome._id,  type:"Purchase", invoiceNo:"INV-H-0901", date:new Date("2026-04-25"), amount:36000, paid:16000 },
    { vendor:vHome._id,  type:"Purchase", invoiceNo:"INV-H-0902", date:new Date("2026-05-07"), amount:20000, paid:0     },
  ];
  const ledger = await VendorLedger.insertMany(ledgerEntries);
  console.log(`📒 Ledger entries: ${ledger.length}`);

  // ── 5. CUSTOMERS ──────────────────────────────────────────
  const customerData = [
    { name:"Amit Sharma",   phone:"9876540001", email:"amit@gmail.com",   customerType:"Retail",    city:"Delhi",     gstin:"",                     creditLimit:10000,  status:"Active", totalBilled:18450,  totalReceived:18450 },
    { name:"Priya Nair",    phone:"9812340002", email:"priya@gmail.com",  customerType:"Retail",    city:"Mumbai",    gstin:"",                     creditLimit:5000,   status:"Active", totalBilled:9800,   totalReceived:9800  },
    { name:"Vikram Singh",  phone:"9934560003", email:"vikram@biz.com",   customerType:"Wholesale", city:"Jaipur",    gstin:"08ABCDE1234F1Z5",       creditLimit:50000,  status:"Active", totalBilled:78500,  totalReceived:78500 },
    { name:"Anjali Mehta",  phone:"9023450004", email:"anjali@gmail.com", customerType:"VIP",       city:"Ahmedabad", gstin:"",                     creditLimit:25000,  status:"VIP",    totalBilled:42000,  totalReceived:35000 },
    { name:"Ravi Kumar",    phone:"8965430005", email:"ravi@shop.com",    customerType:"Dealer",    city:"Bangalore", gstin:"29ABCFG2345H1Z8",       creditLimit:100000, status:"Active", totalBilled:125000, totalReceived:125000},
    { name:"Sunita Patel",  phone:"9543210006", email:"sunita@gmail.com", customerType:"Retail",    city:"Chennai",   gstin:"",                     creditLimit:8000,   status:"Active", totalBilled:6500,   totalReceived:6500  },
    { name:"Deepak Joshi",  phone:"9711220007", email:"deepak@store.com", customerType:"Wholesale", city:"Pune",      gstin:"27ABCHJ3456I1Z2",       creditLimit:75000,  status:"Active", totalBilled:58000,  totalReceived:50000 },
    { name:"Meera Reddy",   phone:"9900110008", email:"meera@gmail.com",  customerType:"Online",    city:"Hyderabad", gstin:"",                     creditLimit:5000,   status:"Active", totalBilled:3200,   totalReceived:3200  },
  ];
  const customers = await Customer.insertMany(customerData);
  console.log(`👤 Customers: ${customers.length}`);

  const [cAmit, cPriya, cVikram, cAnjali, cRavi, cSunita, cDeepal, cMeera] = customers;

  // ── 6. SALES ──────────────────────────────────────────────
  // Helper to build a sale object (pre-calculated)
  function makeSale({ invoiceNo, customer, customerName, saleType, paymentMode, date, items, isInterState, notes }) {
    const enrichedItems = items.map(i => {
      const grossAmount = i.rate * i.qty;
      const discountAmount = (grossAmount * (i.discount || 0)) / 100;
      const subtotal = grossAmount - discountAmount;
      const gstAmount = (subtotal * i.gstRate) / 100;
      return { ...i, discountAmount, total: subtotal, gstAmount };
    });
    const subtotal     = enrichedItems.reduce((s,i) => s + i.total + i.discountAmount, 0);
    const totalDiscount= enrichedItems.reduce((s,i) => s + i.discountAmount, 0);
    const totalGST     = enrichedItems.reduce((s,i) => s + i.gstAmount, 0);
    const grandTotal   = subtotal - totalDiscount + totalGST;
    const amountPaid   = items[0]._amountPaid !== undefined ? items[0]._amountPaid : grandTotal;
    const amountDue    = Math.max(0, grandTotal - amountPaid);
    const cgst  = isInterState ? 0 : totalGST / 2;
    const sgst  = isInterState ? 0 : totalGST / 2;
    const igst  = isInterState ? totalGST : 0;
    const status = amountDue === 0 ? "Paid" : amountPaid > 0 ? "Partial" : "Pending";
    return {
      invoiceNo, customer, customerName, saleType: saleType||"GST Invoice",
      paymentMode: paymentMode||"Cash", date, items: enrichedItems,
      subtotal, totalDiscount, totalGST, grandTotal, amountPaid, amountDue,
      cgst, sgst, igst, isInterState: !!isInterState,
      notes: notes||"", status,
    };
  }

  const p = products; // shorthand
  const salesDocs = [
    makeSale({ invoiceNo:"INV-2026-0001", customer:cAmit._id,   date:new Date("2026-05-01"), paymentMode:"Cash",
      items:[{ product:p[0]._id, productName:p[0].name, qty:2, rate:349,  discount:0, gstRate:18, _amountPaid:822 },
             { product:p[1]._id, productName:p[1].name, qty:1, rate:549,  discount:0, gstRate:18 }] }),

    makeSale({ invoiceNo:"INV-2026-0002", customer:cVikram._id, date:new Date("2026-05-03"), paymentMode:"Bank Transfer",
      saleType:"GST Invoice",
      items:[{ product:p[6]._id, productName:p[6].name, qty:20, rate:249, discount:5, gstRate:18, _amountPaid:5310 },
             { product:p[7]._id, productName:p[7].name, qty:15, rate:299, discount:5, gstRate:18 }] }),

    makeSale({ invoiceNo:"INV-2026-0003", customer:cPriya._id,  date:new Date("2026-05-04"), paymentMode:"UPI",
      items:[{ product:p[4]._id, productName:p[4].name, qty:2, rate:899, discount:0, gstRate:12 },
             { product:p[5]._id, productName:p[5].name, qty:3, rate:399, discount:0, gstRate:12 }] }),

    makeSale({ invoiceNo:"INV-2026-0004", customer:cRavi._id,   date:new Date("2026-05-05"), paymentMode:"Cheque",
      saleType:"GST Invoice",
      items:[{ product:p[10]._id, productName:p[10].name, qty:5, rate:1599, discount:5, gstRate:18 },
             { product:p[11]._id, productName:p[11].name, qty:8, rate:999,  discount:3, gstRate:18 }] }),

    makeSale({ invoiceNo:"INV-2026-0005", date:new Date("2026-05-06"), customerName:"Walk-in Customer",
      saleType:"Cash Sale", paymentMode:"Cash",
      items:[{ product:p[0]._id, productName:p[0].name, qty:1, rate:349, discount:0, gstRate:18 },
             { product:p[9]._id, productName:p[9].name, qty:2, rate:179, discount:0, gstRate:12 }] }),

    makeSale({ invoiceNo:"INV-2026-0006", customer:cAnjali._id, date:new Date("2026-05-07"), paymentMode:"UPI",
      items:[{ product:p[2]._id, productName:p[2].name, qty:3, rate:1099, discount:0, gstRate:18, _amountPaid:9000 }] }),

    makeSale({ invoiceNo:"INV-2026-0007", customer:cDeepal._id, date:new Date("2026-05-08"), paymentMode:"Credit",
      items:[{ product:p[3]._id, productName:p[3].name, qty:10, rate:459, discount:5, gstRate:18, _amountPaid:35000 },
             { product:p[8]._id, productName:p[8].name, qty:5,  rate:259, discount:4, gstRate:12 }] }),

    makeSale({ invoiceNo:"INV-2026-0008", customer:cSunita._id, date:new Date("2026-05-09"), paymentMode:"Cash",
      items:[{ product:p[13]._id, productName:p[13].name, qty:5, rate:199, discount:0, gstRate:18 }] }),

    makeSale({ invoiceNo:"INV-2026-0009", customer:cMeera._id,  date:new Date("2026-05-10"), paymentMode:"UPI",
      items:[{ product:p[5]._id, productName:p[5].name, qty:2, rate:399, discount:0, gstRate:12 }] }),

    makeSale({ invoiceNo:"INV-2026-0010", customer:cAmit._id,   date:new Date("2026-05-11"), paymentMode:"Cash",
      items:[{ product:p[1]._id, productName:p[1].name, qty:2, rate:549, discount:0, gstRate:18 },
             { product:p[6]._id, productName:p[6].name, qty:3, rate:249, discount:0, gstRate:18 }] }),

    makeSale({ invoiceNo:"INV-2026-0011", customer:cVikram._id, date:new Date("2026-05-12"), paymentMode:"Bank Transfer",
      saleType:"GST Invoice", isInterState:true,
      items:[{ product:p[2]._id, productName:p[2].name, qty:10, rate:1099, discount:5, gstRate:18 }] }),

    makeSale({ invoiceNo:"INV-2026-0012", customer:cRavi._id,   date:new Date("2026-05-14"), paymentMode:"Cheque",
      items:[{ product:p[10]._id, productName:p[10].name, qty:10, rate:1599, discount:6, gstRate:18 },
             { product:p[11]._id, productName:p[11].name, qty:10, rate:999,  discount:5,  gstRate:18 }] }),

    // Few from previous months for trend graph
    makeSale({ invoiceNo:"INV-2026-M001", customer:cVikram._id, date:new Date("2026-04-10"), paymentMode:"Bank Transfer",
      items:[{ product:p[6]._id, productName:p[6].name, qty:30, rate:249, discount:5, gstRate:18 }] }),
    makeSale({ invoiceNo:"INV-2026-M002", customer:cRavi._id,   date:new Date("2026-04-18"), paymentMode:"Cheque",
      items:[{ product:p[3]._id, productName:p[3].name, qty:15, rate:459, discount:5, gstRate:18 }] }),
    makeSale({ invoiceNo:"INV-2026-M003", customer:cAnjali._id, date:new Date("2026-03-15"), paymentMode:"UPI",
      items:[{ product:p[4]._id, productName:p[4].name, qty:5, rate:899, discount:0, gstRate:12 }] }),
    makeSale({ invoiceNo:"INV-2026-M004", customer:cAmit._id,   date:new Date("2026-03-22"), paymentMode:"Cash",
      items:[{ product:p[0]._id, productName:p[0].name, qty:3, rate:349, discount:0, gstRate:18 }] }),
    makeSale({ invoiceNo:"INV-2026-M005", customer:cDeepal._id, date:new Date("2026-02-14"), paymentMode:"Credit",
      items:[{ product:p[7]._id, productName:p[7].name, qty:20, rate:299, discount:5, gstRate:18, _amountPaid:50000 }] }),
    makeSale({ invoiceNo:"INV-2026-M006", customer:cVikram._id, date:new Date("2026-01-20"), paymentMode:"Bank Transfer",
      items:[{ product:p[2]._id, productName:p[2].name, qty:8, rate:1099, discount:0, gstRate:18 }] }),
  ];

  const sales = await Sale.insertMany(salesDocs);
  console.log(`🧾 Sales: ${sales.length}`);

  // ── 7. PURCHASES ─────────────────────────────────────────
  function makePurchase({ purchaseNo, vendor, invoiceNo, date, items, amountPaid, paymentMode }) {
    const enriched = items.map(i => ({
      ...i,
      total:     i.rate * i.qty,
      gstRate:   18,
      gstAmount: (i.rate * i.qty * 18) / 100,
    }));
    const subtotal  = enriched.reduce((s,i) => s+i.total, 0);
    const totalGST  = enriched.reduce((s,i) => s+i.gstAmount, 0);
    const grand     = subtotal + totalGST;
    return { purchaseNo, vendor, invoiceNo, date, items: enriched,
             subtotal, totalGST, grandTotal: grand,
             amountPaid: amountPaid ?? grand, paymentMode: paymentMode||"Credit", status:"Received" };
  }

  const purchaseDocs = [
    makePurchase({ purchaseNo:"PUR-2026-0001", vendor:vRohan._id, invoiceNo:"INV-R-2401", date:new Date("2026-05-02"),
      items:[{ product:p[0]._id, productName:p[0].name, qty:50, rate:280 },
             { product:p[1]._id, productName:p[1].name, qty:20, rate:420 }], amountPaid:45000 }),
    makePurchase({ purchaseNo:"PUR-2026-0002", vendor:vSS._id,    invoiceNo:"INV-S-1102", date:new Date("2026-05-08"),
      items:[{ product:p[3]._id, productName:p[3].name, qty:30, rate:350 },
             { product:p[5]._id, productName:p[5].name, qty:25, rate:280 }], amountPaid:10000, paymentMode:"Credit" }),
    makePurchase({ purchaseNo:"PUR-2026-0003", vendor:vMetal._id, invoiceNo:"INV-M-3302", date:new Date("2026-05-05"),
      items:[{ product:p[6]._id, productName:p[6].name, qty:50, rate:180 },
             { product:p[7]._id, productName:p[7].name, qty:40, rate:220 }] }),
    makePurchase({ purchaseNo:"PUR-2026-0004", vendor:vHome._id,  invoiceNo:"INV-H-0902", date:new Date("2026-05-07"),
      items:[{ product:p[12]._id, productName:p[12].name, qty:15, rate:480 },
             { product:p[13]._id, productName:p[13].name, qty:50, rate:150 }], amountPaid:0, paymentMode:"Credit" }),
  ];

  const purchases = await Purchase.insertMany(purchaseDocs);
  console.log(`🛒 Purchases: ${purchases.length}`);

  console.log(`
╔══════════════════════════════════════════╗
║   ✅ Seed Complete — HomeTrack           ║
╠══════════════════════════════════════════╣
║  Login credentials:                      ║
║  👤 admin   /  admin123   (Admin)        ║
║  👤 priya   /  priya123   (Staff)        ║
╚══════════════════════════════════════════╝
  `);

  await mongoose.disconnect();
}

main().catch(err => { console.error("❌ Seed error:", err.message); process.exit(1); });
