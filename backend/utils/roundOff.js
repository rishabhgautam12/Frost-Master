// Rounds a document's grand total to the nearest rupee and records the difference.
// Only applied when the document is new or its items changed, so totals already
// posted to customer/vendor ledgers are never silently altered.
function applyRoundOff(doc, rawTotal) {
  if (!doc.isNew && !doc.isModified("items")) return;
  const exact = Math.round((+rawTotal || 0) * 100) / 100;
  const rounded = Math.round(exact);
  doc.grandTotal = rounded;
  doc.roundOff = Math.round((rounded - exact) * 100) / 100;
}

module.exports = { applyRoundOff };
