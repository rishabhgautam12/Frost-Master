const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
require("../utils/auditLogger").logActivity = async () => {};
const { updateOrder } = require("../controllers/salesController");

test("order detail edits preserve receipt history and reject payment replacement", async () => {
  const order = new Order({ orderNo:"ORD-TEST", customer:new mongoose.Types.ObjectId(), grandTotal:100,
    amountPaid:100, paymentMode:"Multiple", payments:[
      { amount:70, appliedAmount:70, advanceAmount:0, paymentMode:"Cash", date:new Date("2026-01-01"), notes:"First receipt" },
      { amount:50, appliedAmount:30, advanceAmount:20, paymentMode:"UPI", date:new Date("2026-01-02"), notes:"Second receipt" },
    ] });
  const originalFind = Order.findById, originalCustomerUpdate = Customer.findByIdAndUpdate;
  let saves = 0, newTotal = 100;
  const balanceChanges = [];
  Order.findById = async () => order;
  Customer.findByIdAndUpdate = async (id,update) => { balanceChanges.push(update.$inc.advanceBalance); };
  order.save = async () => { saves++; order.grandTotal = newTotal; return order; };
  order.populate = async () => order;
  async function update(body) {
    let code=200, response;
    await updateOrder({ params:{id:order._id}, body, user:{role:"admin"} }, {status(value){code=value;return this;},json(value){response=value;}});
    return {code,...response};
  }
  const receipts = () => order.payments.map(p => ({ id:String(p._id), amount:p.amount, date:p.date.toISOString(), mode:p.paymentMode, notes:p.notes }));
  const before = receipts();
  try {
    assert.equal((await update({amountPaid:80})).code,400);
    assert.equal((await update({payments:[]})).code,400);
    assert.equal(saves,0);
    assert.equal((await update({notes:"New delivery details",amountPaid:100,paymentMode:"Cash"})).success,true);
    assert.equal(order.paymentMode,"Multiple");
    assert.equal(order.notes,"New delivery details");
    assert.deepEqual(receipts(),before);
    assert.equal((await update({customer:String(new mongoose.Types.ObjectId())})).code,400);
    // Emulate recalculated item totals from the model save hook.
    newTotal=80;
    assert.equal((await update({notes:"Price adjusted"})).success,true);
    assert.equal(order.amountPaid,80);
    assert.equal(order.payments.reduce((sum,p)=>sum+p.advanceAmount,0),40);
    assert.deepEqual(balanceChanges,[20]);
    assert.deepEqual(receipts(),before);
    newTotal=150;
    assert.equal((await update({notes:"Additional item"})).success,true);
    assert.equal(order.amountPaid,120);
    assert.deepEqual(balanceChanges,[20,-40]);
    assert.deepEqual(receipts(),before);
    order.status="Converted";
    newTotal=200;
    assert.equal((await update({notes:"Original order details only"})).success,true);
    assert.deepEqual(receipts(),before);
    assert.deepEqual(balanceChanges,[20,-40]);
  } finally { Order.findById=originalFind; Customer.findByIdAndUpdate=originalCustomerUpdate; }
});
