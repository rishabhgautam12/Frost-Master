const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Sale = require("../models/Sale");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const { applyRefund, balances } = require("../utils/refundAccounting");
require("../utils/auditLogger").logActivity = async () => {};
const { createRefund, protectRefundHistory } = require("../controllers/refundController");

const body = overrides => ({ amount:20, type:"Extra Payment", method:"UPI", date:"2026-01-01", notes:"Duplicate transfer returned", requestId:"test-refund-request-0001", ...overrides });
const order = () => new Order({ grandTotal:100, amountPaid:100, payments:[{amount:80,appliedAmount:80},{amount:50,appliedAmount:20,advanceAmount:30}] });

test("extra refund keeps original receipts and bill settlement, reduces only extra advance", () => {
  const doc = order(), ids = doc.payments.map(p => String(p._id));
  const result = applyRefund(doc,body());
  assert.deepEqual(result.before,{ received:130,applied:100,advance:30 });
  assert.deepEqual(result.after,{ received:110,applied:100,advance:10 });
  assert.deepEqual(doc.payments.map(p=>p.amount),[80,50]);
  assert.deepEqual(doc.payments.map(p=>String(p._id)),ids);
  assert.equal(doc.payments[1].refundedAmount,20);
  assert.equal(doc.amountPaid,100);
});

test("optional receipt reference is enforced and cannot exceed that receipt", () => {
  const doc=order();
  applyRefund(doc,body({paymentId:String(doc.payments[0]._id)}));
  assert.equal(doc.payments[0].refundedAmount,20);
  assert.equal(doc.payments[1].refundedAmount,0);
  assert.throws(()=>applyRefund(doc,body({type:"Cancellation",amount:61,paymentId:String(doc.payments[0]._id)})),/selected payment/);
  assert.throws(()=>applyRefund(doc,body({paymentId:String(new mongoose.Types.ObjectId()),amount:1})),/not found/);
});

test("partial and final cancellation refunds cannot return the same money twice", () => {
  const doc=order();
  applyRefund(doc,body({type:"Cancellation",amount:100}));
  doc.status="Cancelled";
  assert.deepEqual(balances(doc),{received:30,applied:30,advance:0});
  applyRefund(doc,body({type:"Cancellation",amount:30}));
  assert.deepEqual(balances(doc),{received:0,applied:0,advance:0});
  assert.throws(()=>applyRefund(doc,body({type:"Cancellation",amount:0.01})),/Maximum refundable/);
  assert.throws(()=>applyRefund(doc,body({amount:1})),/Use Cancellation/);
});

test("reject invalid money, missing reasons, invalid dates and excessive refunds before changing receipts", () => {
  for (const input of [{amount:-1},{amount:Infinity},{amount:0.001},{amount:31},{notes:" "},{date:"invalid"},{method:"Other"},{type:"Return"},{requestId:""}]) {
    const doc=order(), before=JSON.stringify(doc.payments);
    assert.throws(()=>applyRefund(doc,body(input)));
    assert.equal(JSON.stringify(doc.payments),before);
  }
});

test("currency accounting uses paise without accumulating floating point refund errors", () => {
  const doc=new Order({ grandTotal:1, amountPaid:1, payments:[{amount:1.3}] });
  for(let i=0;i<3;i++) applyRefund(doc,body({amount:0.1}));
  assert.deepEqual(balances(doc),{received:1,applied:1,advance:0});
  assert.equal(doc.payments[0].refundedAmount,0.3);
});

test("controller: admin restriction, converted order canonicalization, cancellation, stock and idempotency", async () => {
  const source=order(), customer=new Customer({name:"Test",phone:"9999999999",totalBilled:100,totalReceived:100,advanceBalance:30});
  const product=new Product({name:"TV",modelNumber:"REFUND-TEST",purchasePrice:0,stock:5,warehouses:[{warehouse:"Main Warehouse",stock:5}]});
  const sale=new Sale({invoiceNo:"INV-REFUND",grandTotal:100,amountPaid:100,status:"Paid",sourceOrder:source._id,customer:customer._id,
    items:[{product:product._id,qty:1,rate:100,total:100,warehouse:"Main Warehouse"}],payments:source.payments.map(p=>p.toObject())});
  source.status="Converted"; source.convertedSale=sale._id;
  const originals={session:mongoose.startSession,order:Order.findById,sale:Sale.findById,customer:Customer.findById,product:Product.findById};
  let transactions=0;
  const session={withTransaction:async fn=>{transactions++;await fn();},endSession:async()=>{}};
  const query = value => ({ session:async()=>value, then:resolve=>resolve(value) });
  mongoose.startSession=async()=>session;
  Order.findById=()=>query(source); Sale.findById=()=>query(sale); Customer.findById=()=>query(customer); Product.findById=()=>query(product);
  for(const doc of [source,sale,customer,product]) doc.save=async options=>{assert.equal(options.session,session);return doc;};
  const invoke=async(role,input)=>{
    let status=200,response;
    await createRefund({params:{kind:"orders",id:source._id},body:input,user:{role,_id:new mongoose.Types.ObjectId(),name:"Admin"}},
      {status(code){status=code;return this;},json(value){response=value;}});
    return {status,response};
  };
  try {
    assert.equal((await invoke("staff",body())).status,403);
    assert.equal(transactions,0);
    assert.equal((await invoke("admin",body())).status,200);
    assert.equal(customer.advanceBalance,10); assert.equal(customer.totalReceived,100);
    assert.equal(source.payments[1].refundedAmount,20);
    assert.equal(source.refunds.length,1); assert.equal(sale.refunds.length,1);
    await invoke("admin",body());
    assert.equal(sale.refunds.length,1); assert.equal(customer.advanceBalance,10);
    assert.equal((await invoke("admin",body({amount:10}))).status,409);
    const cancellation=body({type:"Cancellation",amount:60,requestId:"test-refund-request-0002"});
    assert.equal((await invoke("admin",cancellation)).status,200);
    assert.equal(sale.status,"Cancelled"); assert.equal(product.stock,6);
    assert.equal(source.status,"Cancelled");
    assert.equal(customer.totalBilled,0); assert.equal(customer.totalReceived,0); assert.equal(customer.advanceBalance,0);
    assert.equal((await invoke("admin",body({type:"Cancellation",amount:50,requestId:"test-refund-request-0003"}))).status,200);
    assert.equal(product.stock,6); assert.equal(sale.amountPaid,0);
    assert.equal((await invoke("admin",body({type:"Cancellation",amount:1,requestId:"test-refund-request-0004"}))).status,400);
    let blocked=0;
    await protectRefundHistory("orders")({params:{id:source._id}},{status(code){blocked=code;return this;},json(){}},()=>assert.fail("Refund history must not be overwritten"));
    assert.equal(blocked,409);
  } finally {
    mongoose.startSession=originals.session; Order.findById=originals.order; Sale.findById=originals.sale; Customer.findById=originals.customer; Product.findById=originals.product;
  }
});
