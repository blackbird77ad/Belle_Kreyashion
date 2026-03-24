export const generateInvoice = (order) => {
  const date = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const isBooking = !!order.bookingId;

  const itemsHtml = isBooking
    ? `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px">${order.trainingTitle || order.consultationTitle || 'Service'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center">1</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right">GHS ${order.amount?.toLocaleString()}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:bold">GHS ${order.amount?.toLocaleString()}</td>
      </tr>`
    : (order.items || []).map(item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px">${item.name}${item.variant ? ` (${item.variant})` : ''}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center">${item.qty}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right">GHS ${item.price?.toLocaleString()}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:bold">GHS ${(item.price * item.qty)?.toLocaleString()}</td>
      </tr>`).join('');

  const total = isBooking ? order.amount : order.total;
  const refId = isBooking ? order.bookingId : order.orderId;
  const type  = isBooking ? (order.type === 'training' ? 'Training Registration' : 'Consultation Booking') : 'Order';
  const customerName  = order.customer?.name;
  const customerPhone = order.customer?.phone;
  const customerAddr  = !isBooking && order.customer?.address && order.customer.address !== 'PICKUP' ? order.customer.address : null;

  const totalsHtml = isBooking
    ? `<tr class="total-row"><td>Total Paid</td><td>GHS ${total?.toLocaleString()}</td></tr>`
    : `<tr><td style="color:#666">Subtotal</td><td>GHS ${order.subtotal?.toLocaleString()}</td></tr>
       <tr><td style="color:#666">Delivery (${order.deliveryZone})</td><td>GHS ${order.deliveryFee || 0}</td></tr>
       <tr class="total-row"><td>Total Paid</td><td>GHS ${total?.toLocaleString()}</td></tr>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Invoice ${refId}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#222;background:#fff;padding:40px;max-width:700px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
.brand{font-size:22px;font-weight:900}.brand span{color:#FDC700}
.inv{text-align:right}.inv h2{font-size:28px;font-weight:900;letter-spacing:2px}.inv p{font-size:13px;color:#666;margin-top:4px}
hr.gold{border:none;border-top:3px solid #FDC700;margin:16px 0}
hr.dark{border:none;border-top:2px solid #000;margin:20px 0}
.info{display:flex;justify-content:space-between;margin-bottom:28px}
.ib p{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.ib h4{font-size:14px;font-weight:bold}.ib span{font-size:13px;color:#444;display:block;line-height:1.6}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#000;color:#fff;padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;text-align:left}
th:nth-child(2){text-align:center}th:nth-child(3),th:nth-child(4){text-align:right}
.totals{margin-left:auto;width:260px}
.totals td{padding:6px 8px;font-size:13px}.totals td:last-child{text-align:right;font-weight:bold}
.total-row td{border-top:2px solid #000;font-size:15px;font-weight:900;padding-top:10px}
.badge{display:inline-block;background:#000;color:#FDC700;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:20px}
.type-badge{display:inline-block;background:#FDC700;color:#000;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:12px;margin-bottom:8px}
.footer{margin-top:36px;text-align:center;color:#aaa;font-size:11px;border-top:1px solid #eee;padding-top:16px}
</style></head><body>
<div class="header">
  <div class="brand">BELLE <span>KREYASHON</span></div>
  <div class="inv"><h2>INVOICE</h2><p>${refId}</p><p>${date}</p></div>
</div>
<hr class="gold"/>
<div class="info">
  <div class="ib">
    <p>Billed To</p>
    <h4>${customerName || ''}</h4>
    <span>${customerPhone || ''}</span>
    ${customerAddr ? `<span>${customerAddr}</span>` : ''}
  </div>
  <div class="ib" style="text-align:right">
    <p>From</p>
    <h4>Belle Kreyashon</h4>
    <span>Osu, Accra, Ghana</span>
    <span>bellekreyashon.com</span>
  </div>
</div>
<div style="margin-bottom:16px"><span class="type-badge">${type}</span></div>
<table>
  <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${itemsHtml}</tbody>
</table>
<table class="totals">${totalsHtml}</table>
<hr class="dark"/>
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
  <div><p style="font-size:11px;color:#888;margin-bottom:4px">Payment Status</p><span class="badge">PAID ✓</span>${order.paymentRef ? `<p style="font-size:11px;color:#aaa;margin-top:4px">Ref: ${order.paymentRef}</p>` : ''}</div>
  <div style="text-align:right"><p style="font-size:11px;color:#888;margin-bottom:4px">Type</p><p style="font-size:13px;font-weight:bold">${type}</p></div>
</div>
<div class="footer">
  <p>Thank you for choosing Belle Kreyashon</p>
  <p style="margin-top:4px">Questions? Contact us on WhatsApp or visit bellekreyashon.com</p>
  <p style="margin-top:8px;color:#ccc">Computer-generated invoice — no signature required.</p>
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
};