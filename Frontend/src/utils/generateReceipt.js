const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const money = (value = 0) => `GHS ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const generateReceipt = (order) => {
  if (!order) return;
  const receiptWindow = window.open('', '_blank', 'width=820,height=900');
  if (!receiptWindow) return;
  const itemRows = (order.items || []).map((item) => `
    <tr><td>${escapeHtml(item.name)}${item.variant ? ` - ${escapeHtml(item.variant)}` : ''}</td><td>${Number(item.qty) || 1}</td><td>${money(item.price)}</td><td>${money((Number(item.price) || 0) * (Number(item.qty) || 1))}</td></tr>
  `).join('');
  receiptWindow.document.write(`<!doctype html><html><head><title>Receipt ${escapeHtml(order.orderId || '')}</title><style>
    body{font-family:Arial,sans-serif;color:#111;padding:40px;max-width:760px;margin:auto}h1{margin:0}.muted{color:#6b7280}.header{display:flex;justify-content:space-between;gap:24px}.card{border:1px solid #e5e7eb;border-radius:18px;padding:18px;margin-top:22px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;padding:10px;border-bottom:1px solid #eee;font-size:13px}th{font-size:11px;text-transform:uppercase;color:#6b7280}.totals{margin-left:auto;width:300px;margin-top:18px}.totals div{display:flex;justify-content:space-between;padding:6px 0}.grand{font-size:18px;font-weight:800;border-top:2px solid #111;margin-top:6px;padding-top:10px!important}.badge{display:inline-block;padding:7px 12px;border-radius:999px;background:#dcfce7;color:#166534;font-weight:700}@media print{body{padding:0}.actions{display:none}}
  </style></head><body>
    <div class="header"><div><p class="muted">BELLE KREYASHON</p><h1>Payment Receipt</h1><p class="muted">${escapeHtml(order.orderId || '')}</p></div><div><span class="badge">${order.paymentStatus === 'paid' ? 'PAID' : escapeHtml(order.paymentStatus || 'PENDING').toUpperCase()}</span><p class="muted">${new Date(order.paidAt || order.createdAt || Date.now()).toLocaleString()}</p></div></div>
    <div class="card"><strong>Customer</strong><p>${escapeHtml(order.customer?.name || '')}<br>${escapeHtml(order.customer?.email || '')}<br>${escapeHtml(order.customer?.phone || '')}${order.customer?.billingAddress ? `<br>Billing: ${escapeHtml(order.customer.billingAddress)}` : ''}</p><p class="muted">Payment reference: ${escapeHtml(order.paymentRef || '')}<br>Method: ${escapeHtml(order.paymentMethod || order.paymentChannel || '')}</p></div>
    <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table>
    <div class="totals"><div><span>Subtotal</span><strong>${money(order.subtotal)}</strong></div><div><span>Delivery</span><strong>${money(order.deliveryFee)}</strong></div>${Number(order.discountTotal) > 0 ? `<div><span>Discount</span><strong>-${money(order.discountTotal)}</strong></div>` : ''}<div class="grand"><span>Total</span><span>${money(order.total)}</span></div></div>
    <div class="card"><strong>Receipt verification</strong><p class="muted">This receipt was generated from order ${escapeHtml(order.orderId || '')}. Payment reference: ${escapeHtml(order.paymentRef || '')}.</p></div>
    <p class="actions"><button onclick="window.print()">Print or save as PDF</button></p>
  </body></html>`);
  receiptWindow.document.close();
  receiptWindow.focus();
  setTimeout(() => receiptWindow.print(), 300);
};
