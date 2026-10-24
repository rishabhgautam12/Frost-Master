import { Badge, Btn, Modal, formatRoundOff } from "./Shared";
import frostMasterLogo from "../assets/frost-master-logo.webp";
import { RefundHistory } from "./RefundModal";

const money = value => `₹${(+value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const date = value => value ? new Date(value).toLocaleDateString("en-IN") : "-";
const safeName = value => String(value || "document").replace(/[^a-z0-9_-]+/gi, "-");
const display = value => value || "-";

function PartyCard({ title, party = {} }) {
  return <div style={{ border:"1px solid #d9deea", borderRadius:8, padding:12, minHeight:105 }}>
    <div style={{ color:"#6b7392", fontSize:10, fontWeight:800, textTransform:"uppercase" }}>{title}</div>
    <div style={{ fontWeight:800, fontSize:15, marginTop:5 }}>{display(party.name)}</div>
    <div style={{ whiteSpace:"pre-wrap", color:"#4a5272", marginTop:3 }}>{display(party.address)}</div>
    <div style={{ marginTop:5 }}><strong>GSTIN:</strong> {display(party.gstin)}</div>
    <div><strong>State:</strong> {display(party.stateName)} {party.stateCode ? `(${party.stateCode})` : ""}</div>
  </div>;
}

export default function TransactionDetailsModal({ record, type, onClose }) {
  if (!record) return null;
  const isSale = type === "sale";
  const isQuotation = type === "quotation";
  const number = isSale ? record.invoiceNo : isQuotation ? record.quotationNo : record.orderNo;
  const documentTitle = isSale ? "Sale" : isQuotation ? "Quotation" : "Order";
  const details = record.invoiceDetails || {};
  const partyName = record.customer?.name || record.customerName || "Walk-in";
  const payments = record.payments || [];
  const showCompanyHeader = record.saleType === "GST Invoice";
  const summary = [
    ["Subtotal",record.subtotal],["Discount",record.totalDiscount],["Transport",record.transportTotal],["GST",record.totalGST],
    ...(+record.roundOff ? [["Round Off",record.roundOff,formatRoundOff]] : []),
    ["Grand Total",record.grandTotal],
  ];

  const downloadImage = async () => {
    const width = 1100, scale = 2, pad = 36;
    const showCompanyHeader = record.saleType === "GST Invoice";
    const companyHeaderHeight = showCompanyHeader ? 125 : 0;
    const itemRows = Math.max(1, (record.items || []).length);
    const paymentRows = Math.max(1, payments.length);
    const height = 700 + companyHeaderHeight + itemRows * 48 + paymentRows * 38 + (record.refunds?.length || 0) * 145;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale; canvas.height = height * scale;
    const ctx = canvas.getContext("2d"); ctx.scale(scale, scale);
    const rect = (x,y,w,h,fill,stroke) => { ctx.fillStyle=fill; ctx.fillRect(x,y,w,h); if(stroke){ctx.strokeStyle=stroke;ctx.strokeRect(x,y,w,h);} };
    const text = (value,x,y,size=13,weight=400,color="#0f1535",align="left") => { ctx.fillStyle=color;ctx.font=`${weight} ${size}px Segoe UI, Arial`;ctx.textAlign=align;ctx.fillText(String(value ?? "-"),x,y); };
    const wrapped = (value,x,y,maxWidth,lineHeight=17,maxLines=4) => {
      const words=String(value || "-").split(/\s+/); let line="", lineNo=0;
      for(const word of words){const test=`${line}${line ? " " : ""}${word}`;if(ctx.measureText(test).width>maxWidth && line){text(line,x,y+lineNo*lineHeight,12,400,"#4a5272");line=word;if(++lineNo>=maxLines)return;}else line=test;}
      text(line,x,y+lineNo*lineHeight,12,400,"#4a5272");
    };
    rect(0,0,width,height,"#f7f8fc");
    if (showCompanyHeader) {
      rect(0,0,width,companyHeaderHeight,"#fff","#0f1535");
      const logo = new Image();
      logo.src = frostMasterLogo;
      await new Promise((resolve) => { logo.onload = resolve; logo.onerror = resolve; });
      if (logo.complete && logo.naturalWidth) ctx.drawImage(logo,pad,24,390,75);
      text("FROST MASTER PRIVATE LIMITED",475,52,22,900,"#0f1535");
      text("GSTIN/UIN: 07AAECF4100D1ZC",475,84,17,700,"#0f1535");
    }
    rect(0,companyHeaderHeight,width,100,"#4c1d95");
    text(isSale ? "SALE INVOICE" : isQuotation ? "QUOTATION" : "ORDER DETAILS",pad,companyHeaderHeight+38,13,800,"#ddd6fe"); text(number,pad,companyHeaderHeight+72,27,900,"#fff");
    text(date(record.date),width-pad,companyHeaderHeight+45,15,700,"#fff","right"); text(record.status || "",width-pad,companyHeaderHeight+70,12,800,"#d1fae5","right");
    const top=companyHeaderHeight+125, cardW=(width-pad*2-16)/2;
    rect(pad,top,cardW,122,"#fff","#d9deea"); rect(pad+cardW+16,top,cardW,122,"#fff","#d9deea");
    text("BUYER (BILL TO)",pad+15,top+23,10,800,"#6b7392"); text(details.billTo?.name || partyName,pad+15,top+48,16,800); wrapped(details.billTo?.address || record.customer?.address,pad+15,top+70,cardW-30);
    text(`GSTIN: ${details.billTo?.gstin || record.customer?.gstin || "-"}`,pad+15,top+108,11,600,"#4a5272");
    const sx=pad+cardW+31; text("CONSIGNEE (SHIP TO)",sx,top+23,10,800,"#6b7392"); text(details.shipTo?.name || partyName,sx,top+48,16,800); wrapped(details.shipTo?.address || record.customer?.address,sx,top+70,cardW-30);
    text(`GSTIN: ${details.shipTo?.gstin || record.customer?.gstin || "-"}`,sx,top+108,11,600,"#4a5272");
    const dispatchY=top+142; rect(pad,dispatchY,width-pad*2,70,"#f5f3ff","#a5f3fc");
    [["E-Way Bill No.",details.eWayBillNo],["Destination",details.destination],["Motor Vehicle No.",details.motorVehicleNo],["Payment Mode",record.paymentMode]].forEach(([label,value],i)=>{const x=pad+18+i*(width-pad*2)/4;text(label,x,dispatchY+23,10,800,"#6b7392");text(display(value),x,dispatchY+48,13,700);});
    let y=dispatchY+98; const cols=[pad,pad+330,pad+510,pad+600,pad+700,pad+810,width-pad];
    rect(pad,y,width-pad*2,34,"#e6e9f2"); ["Product / Description","Warehouse","Qty","Rate","GST","Transport","Total"].forEach((h,i)=>text(h,cols[i]+6,y+22,10,800,"#3a4260",i===6?"right":"left")); y+=34;
    (record.items || []).forEach(item=>{rect(pad,y,width-pad*2,48,"#fff","#e6e9f2");text(item.productName || item.product?.name || "Product",cols[0]+6,y+19,12,700);text(`HSN: ${item.hsnCode || item.product?.hsnCode || "-"}  ${String(item.description || "").slice(0,32)}`,cols[0]+6,y+37,10,400,"#6b7392");text(display(item.warehouse),cols[1]+6,y+27,11);text(item.qty,cols[2]+6,y+27,11);text(money(item.rate),cols[3]+6,y+27,11);text(`${item.gstRate || 0}%`,cols[4]+6,y+27,11);text(money(item.transportAmount),cols[5]+6,y+27,11);const total=(+item.total||0)+(+item.gstAmount||0)+(+item.transportAmount||0)+(+item.transportGstAmount||0);text(money(total),cols[6],y+27,11,800,"#0f1535","right");y+=48;});
    y+=18; const summaryX=width-390-pad;
    rect(summaryX,y,390,summary.length*24+22,"#fff","#d9deea");
    summary.forEach(([label,value,format],i)=>{const isGrand=label==="Grand Total";text(label,summaryX+18,y+24+i*24,12,isGrand?800:500);text(format?format(value):money(value),summaryX+372,y+24+i*24,12,800,isGrand?"#7c3aed":"#0f1535","right");});
    text("Notes",pad,y+22,10,800,"#6b7392");wrapped(record.notes,pad,y+45,summaryX-pad-30,18,5);
    y+=168;
    text(isSale ? "PAYMENT HISTORY" : "ADVANCE PAYMENT HISTORY",pad,y,11,800,"#3a4260");y+=15;(payments.length?payments:[{amount:record.amountPaid,paymentMode:record.paymentMode,date:record.date,notes:isSale?"Previously paid":"Order advance"}]).filter(p => +p.amount > 0).forEach(p=>{rect(pad,y,width-pad*2,32,"#fff","#e6e9f2");text(date(p.date),pad+10,y+21,11);text(p.paymentMode || "Cash",pad+150,y+21,11);text(p.notes || "",pad+300,y+21,10,400,"#6b7392");text(money(p.amount),width-pad-10,y+21,11,800,"#17855a","right");y+=32;});
    if (record.refunds?.length) {
      y+=24; text("REFUND HISTORY",pad,y,12,800,"#9a3412"); y+=16;
      for (const refund of record.refunds) {
        rect(pad,y,width-pad*2,135,"#fff7ed","#fed7aa");
        text(`${date(refund.date)} · ${refund.type} · ${refund.method}`,pad+12,y+23,12,700);
        text(`${money(refund.amount)} refunded`,width-pad-12,y+23,13,800,"#9a3412","right");
        wrapped(refund.notes,pad+12,y+46,width-pad*2-24,17,3);
        text(`Original payment: ${refund.paymentId || "No specific reference"}`,pad+12,y+108,11);
        text(`Recorded by ${refund.recordedByName || "Admin"}`,pad+12,y+125,11);
        y+=145;
      }
    }
    const link=document.createElement("a");link.download=`${safeName(number)}-${isSale?"sale":isQuotation?"quotation":"order"}.png`;link.href=canvas.toDataURL("image/png");link.click();
  };

  return <Modal open wide title={`${documentTitle} Details - ${number}`} onClose={onClose}>
    <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}><Btn color="teal" onClick={downloadImage}>Download as Image</Btn></div>
    {showCompanyHeader && <div style={{background:"#fff",border:"1px solid #0f1535",padding:14,display:"flex",gap:28,alignItems:"center",marginBottom:0}}>
      <img src={frostMasterLogo} alt="Frost Master" style={{width:300,maxWidth:"48%",height:"auto"}} />
      <div style={{color:"#0f1535",lineHeight:1.5}}><div style={{fontSize:18,fontWeight:900}}>FROST MASTER PRIVATE LIMITED</div><div><strong>GSTIN/UIN:</strong> 07AAECF4100D1ZC</div></div>
    </div>}
    <div style={{ background:"#4c1d95", color:"#fff", borderRadius:9, padding:18, display:"flex", justifyContent:"space-between", gap:12, marginBottom:14 }}><div><div style={{ color:"#ddd6fe", fontSize:10, fontWeight:800 }}>{isSale ? "SALE INVOICE" : isQuotation ? "QUOTATION" : "ORDER"}</div><div style={{ fontSize:22, fontWeight:900 }}>{number}</div><div>{partyName}</div></div><div style={{ textAlign:"right" }}><div>{date(record.date)}</div><div style={{ marginTop:7 }}><Badge color={record.status === "Paid" || record.status === "Converted" ? "green" : "yellow"}>{record.status}</Badge></div></div></div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))", gap:12, marginBottom:12 }}><PartyCard title="Buyer (Bill To)" party={{name:partyName,...details.billTo}} /><PartyCard title="Consignee (Ship To)" party={{name:partyName,...details.shipTo}} /></div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8, background:"#f5f3ff", border:"1px solid #a5f3fc", padding:12, borderRadius:8, marginBottom:12 }}>{[["E-Way Bill No.",details.eWayBillNo],["Sale Made By",record.salesEmployee?.name || record.salesEmployeeName],["Incentive",isSale ? `${record.incentivePercent || 0}% (${money(record.incentiveAmount)})` : "Calculated after conversion"],["Incentive Product Value",isSale ? money(record.incentiveBaseAmount ?? (record.items || []).reduce((sum,item) => sum + ((+item.rate || 0) * (+item.qty || 0)), 0)) : "-"],["Dispatched Through",details.dispatchedThrough],["Destination",details.destination],["Motor Vehicle No.",details.motorVehicleNo],["Payment Mode",record.paymentMode],["Sale Type",record.saleType]].map(([label,value])=><div key={label}><div style={{fontSize:9,fontWeight:800,color:"#6b7392",textTransform:"uppercase"}}>{label}</div><strong>{display(value)}</strong></div>)}</div>
    <div style={{ overflowX:"auto", marginBottom:14 }}><table style={{ width:"100%", minWidth:950, borderCollapse:"collapse", fontSize:11 }}><thead><tr>{["Product","HSN Code","Type","Description","Warehouse","Qty","Rate","Billing Rate","Discount","GST","Transport","Incentive","Total"].map(h=><th key={h} style={{padding:8,background:"#e6e9f2",textAlign:"left"}}>{h}</th>)}</tr></thead><tbody>{(record.items||[]).map((item,i)=>{const total=(+item.total||0)+(+item.gstAmount||0)+(+item.transportAmount||0)+(+item.transportGstAmount||0);return <tr key={item._id||i}>{[item.productName||item.product?.name||"Product",item.hsnCode||item.product?.hsnCode||"-",item.productType||"Manufacturing",item.description||"-",item.warehouse||"-",item.qty,money(item.rate),money(item.billingRate),`${item.discount||0}%`,`${item.gstRate||0}%`,money(item.transportAmount),isSale?`${item.incentivePercent||0}% (${money(item.incentiveAmount)})`:"-",money(total)].map((v,j)=><td key={j} style={{padding:8,borderBottom:"1px solid #e6e9f2"}}>{v}</td>)}</tr>})}</tbody></table></div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr minmax(260px,360px)", gap:16 }}><div><strong>Notes</strong><div style={{whiteSpace:"pre-wrap",color:"#6b7392",marginTop:5}}>{display(record.notes)}</div></div><div style={{background:"#f7f8fc",padding:12,borderRadius:8}}>{summary.map(([label,value,format])=><div key={label} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:label==="Grand Total"?15:12,borderTop:label==="Grand Total"?"1px solid #d9deea":"none",color:label==="Round Off"?"#6b7392":undefined}}><span>{label}</span><strong>{format?format(value):money(value)}</strong></div>)}<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",color:"#17855a"}}><span>{isSale ? "Paid" : "Advance Paid"}</span><strong>{money(record.amountPaid)}</strong></div>{isSale&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",color:"#d0433d"}}><span>Due</span><strong>{money(record.amountDue)}</strong></div>}</div></div>
    <div style={{marginTop:16}}><strong>{isSale ? "Payment History" : "Advance Payment History"}</strong>{payments.length?payments.map((p,i)=><div key={p._id||i} style={{display:"grid",gridTemplateColumns:"120px 120px 1fr 110px",gap:8,padding:9,borderBottom:"1px solid #e6e9f2"}}><span>{date(p.date)}</span><span>{p.paymentMode}</span><span>{p.notes||"-"}</span><strong style={{color:"#17855a",textAlign:"right"}}>{money(p.amount)}</strong></div>):<div style={{color:"#9aa1b9",padding:10}}>No itemized payment records.</div>}</div>
    <RefundHistory record={record} />
  </Modal>;
}
