const fs = require('fs');
const path = require('path');

function repairDataFiles(dataDir) {
  const ordersFile = path.join(dataDir, 'orders_db.json');
  const invoicesFile = path.join(dataDir, 'invoices_db.json');
  const settingsFile = path.join(dataDir, 'system_settings.json');

  let settings = {
    client_platform_fee_percent: 5,
    vendor_platform_fee_percent: 6,
    vat_percent: 15
  };

  if (fs.existsSync(settingsFile)) {
    try {
      const s = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      settings.client_platform_fee_percent = Number(s.client_platform_fee_percent ?? s.platform_commission_percent ?? 5);
      settings.vendor_platform_fee_percent = Number(s.vendor_platform_fee_percent ?? 6);
      settings.vat_percent = Number(s.vat_percent ?? 15);
    } catch (e) {}
  }

  const vatRate = settings.vat_percent / 100;
  const clientFeeRate = settings.client_platform_fee_percent / 100;
  const vendorFeeRate = settings.vendor_platform_fee_percent / 100;

  let orders = [];
  let invoices = [];

  if (fs.existsSync(ordersFile)) {
    orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
  }
  if (fs.existsSync(invoicesFile)) {
    invoices = JSON.parse(fs.readFileSync(invoicesFile, 'utf8'));
  }

  const orderMap = new Map();

  orders.forEach((o) => {
    // 1. Determine pickup vs delivery
    const isExplicitPickup = (
      o.is_pickup === true ||
      o.delivery_method === 'pickup' ||
      o.delivery_type === 'pickup' ||
      o.fulfillment_method === 'BRANCH_PICKUP' ||
      o.fulfillment_method === 'SELF_PICKUP' ||
      o.settlement_summary?.isPickup === true
    );

    const isExplicitDelivery = (
      o.delivery_method === 'delivery' ||
      o.delivery_type === 'delivery' ||
      o.fulfillment_method === 'DELIVERY' ||
      o.is_pickup === false ||
      o.settlement_summary?.isPickup === false ||
      (o.settlement_summary?.deliveryFee && Number(o.settlement_summary.deliveryFee) > 0)
    );

    const isPickup = isExplicitDelivery ? false : isExplicitPickup;
    o.is_pickup = isPickup;
    o.delivery_method = isPickup ? 'pickup' : 'delivery';
    o.delivery_type = isPickup ? 'pickup' : 'delivery';
    o.fulfillment_method = isPickup ? 'BRANCH_PICKUP' : 'DELIVERY';

    // 2. Resolve delivery fee
    let deliveryFee = 0;
    if (!isPickup) {
      if (o.settlement_summary?.deliveryFee && Number(o.settlement_summary.deliveryFee) > 0) {
        deliveryFee = Number(o.settlement_summary.deliveryFee);
      } else if (o.delivery_fee && Number(o.delivery_fee) > 0) {
        deliveryFee = Number(o.delivery_fee);
      } else if (o.delivery_cost && Number(o.delivery_cost) > 0) {
        deliveryFee = Number(o.delivery_cost);
      } else {
        deliveryFee = 25;
      }
    }
    o.delivery_fee = deliveryFee;
    o.delivery_cost = deliveryFee;

    // 3. Resolve client platform fee percent (NEVER 1.5%)
    let clientFeePercent = settings.client_platform_fee_percent;
    if (o.client_platform_fee_percent && o.client_platform_fee_percent !== 1.5) {
      clientFeePercent = Number(o.client_platform_fee_percent);
    } else if (o.settlement_summary?.clientFeePercent && o.settlement_summary.clientFeePercent !== 1.5) {
      clientFeePercent = Number(o.settlement_summary.clientFeePercent);
    }
    o.client_platform_fee_percent = clientFeePercent;
    o.platform_commission_percent = clientFeePercent;

    // 4. Resolve vendor platform fee percent
    let vendorFeePercent = settings.vendor_platform_fee_percent;
    if (o.vendor_platform_fee_percent && o.vendor_platform_fee_percent > 0) {
      vendorFeePercent = Number(o.vendor_platform_fee_percent);
    } else if (o.settlement_summary?.vendorFeePercent && o.settlement_summary.vendorFeePercent > 0) {
      vendorFeePercent = Number(o.settlement_summary.vendorFeePercent);
    }
    o.vendor_platform_fee_percent = vendorFeePercent;

    // 5. Parts subtotal
    let partsSubtotal = 0;
    if (o.settlement_summary?.partsSubtotal && Number(o.settlement_summary.partsSubtotal) > 0) {
      partsSubtotal = Number(o.settlement_summary.partsSubtotal);
    } else if (Array.isArray(o.items) && o.items.length > 0) {
      partsSubtotal = o.items.reduce((s, it) => s + (Number(it.line_total || ((it.unit_price || 0) * (it.quantity || 1))) || 0), 0);
    } else if (o.parts_subtotal && Number(o.parts_subtotal) > 0 && Number(o.parts_subtotal) <= (Number(o.total_amount || 0) * 0.95)) {
      partsSubtotal = Number(o.parts_subtotal);
    } else if (o.total_amount && Number(o.total_amount) > 0) {
      const net = Math.max(0, Number(o.total_amount) - deliveryFee);
      partsSubtotal = Math.round((net / (1 + (clientFeePercent / 100) + vatRate)) * 100) / 100;
    } else {
      partsSubtotal = 100;
    }

    const partsVat = Number((partsSubtotal * vatRate).toFixed(2));
    const clientFee = Number(((partsSubtotal * clientFeePercent) / 100).toFixed(2));
    const vendorFee = Number(((partsSubtotal * vendorFeePercent) / 100).toFixed(2));
    const grandTotal = Number((partsSubtotal + partsVat + clientFee + deliveryFee).toFixed(2));

    o.parts_subtotal = partsSubtotal;
    o.subtotal = partsSubtotal;
    o.tax_amount = partsVat;
    o.parts_vat = partsVat;
    o.vat_percent = settings.vat_percent;
    o.client_platform_fee = clientFee;
    o.platform_commission = clientFee;
    o.vendor_platform_fee = vendorFee;
    o.total_amount = grandTotal;
    o.total_price = grandTotal;

    // 6. Update settlement summary
    o.settlement_summary = {
      orderId: o.id,
      partsSubtotal: partsSubtotal,
      partsVat: partsVat,
      clientFeePercent: clientFeePercent,
      clientPlatformFee: clientFee,
      vendorFeePercent: vendorFeePercent,
      vendorPlatformFee: vendorFee,
      platformFee: Number((clientFee + vendorFee).toFixed(2)),
      vendorGrossTotal: Number((partsSubtotal + partsVat).toFixed(2)),
      vendorNetParts: Number((partsSubtotal - vendorFee).toFixed(2)),
      vendorTotal: Number((partsSubtotal - vendorFee + partsVat).toFixed(2)),
      deliveryFee: deliveryFee,
      courierFee: deliveryFee,
      clientSubtotalBeforeTax: Number((partsSubtotal + clientFee).toFixed(2)),
      grandTotal: grandTotal,
      isPickup: isPickup,
      vatPercent: settings.vat_percent,
      commissionPercent: clientFeePercent
    };

    orderMap.set(o.id, o);
  });

  invoices.forEach((inv) => {
    const matchedOrder = orderMap.get(inv.order_id) || orderMap.get(String(inv.id).replace('INV-', 'ORD-'));
    if (matchedOrder) {
      inv.is_pickup = matchedOrder.is_pickup;
      inv.delivery_method = matchedOrder.delivery_method;
      inv.delivery_type = matchedOrder.delivery_type;
      inv.fulfillment_method = matchedOrder.fulfillment_method;
      inv.delivery_fee = matchedOrder.delivery_fee;
      inv.delivery_cost = matchedOrder.delivery_fee;
      inv.parts_subtotal = matchedOrder.parts_subtotal;
      inv.subtotal = matchedOrder.parts_subtotal;
      inv.tax_amount = matchedOrder.tax_amount;
      inv.parts_vat = matchedOrder.parts_vat;
      inv.vat_percent = matchedOrder.vat_percent;
      inv.client_platform_fee = matchedOrder.client_platform_fee;
      inv.client_platform_fee_percent = matchedOrder.client_platform_fee_percent;
      inv.platform_commission = matchedOrder.client_platform_fee;
      inv.platform_commission_percent = matchedOrder.client_platform_fee_percent;
      inv.vendor_platform_fee = matchedOrder.vendor_platform_fee;
      inv.vendor_platform_fee_percent = matchedOrder.vendor_platform_fee_percent;
      inv.total_amount = matchedOrder.total_amount;
      inv.grand_total = matchedOrder.total_amount;
    } else {
      const isPickup = inv.is_pickup === true || inv.delivery_method === 'pickup';
      inv.is_pickup = isPickup;
      inv.delivery_method = isPickup ? 'pickup' : 'delivery';
      inv.delivery_fee = isPickup ? 0 : (inv.delivery_fee && inv.delivery_fee > 0 ? inv.delivery_fee : 25);
      inv.delivery_cost = inv.delivery_fee;
      inv.client_platform_fee_percent = settings.client_platform_fee_percent;
      inv.vendor_platform_fee_percent = settings.vendor_platform_fee_percent;
    }
  });

  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), 'utf8');
  fs.writeFileSync(invoicesFile, JSON.stringify(invoices, null, 2), 'utf8');

  console.log(`Successfully repaired ${orders.length} orders and ${invoices.length} invoices in ${dataDir}`);
}

module.exports = { repairDataFiles };

if (require.main === module) {
  const localDataDir = path.join(__dirname, '..', 'data');
  repairDataFiles(localDataDir);
}
