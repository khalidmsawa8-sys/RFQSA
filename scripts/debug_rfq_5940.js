const rfq = {
  id: "RFQ-5940",
  created_at: "2026-09-13T19:14:18.799Z",
  status: "open",
  car_make: "تويوتا",
  car_model: "كامري",
  car_year: 2023,
  parts_description: "[{\"partName\":\"ببب\",\"name\":\"ببب\",\"partNumber\":\"4111\",\"partType\":\"original\",\"partTypeName\":\"أصلي\",\"commercialBrand\":null,\"quantity\":1,\"images\":[],\"imagePathname\":null,\"imageUrl\":null,\"imagePreview\":null,\"notes\":null,\"isUrgent\":false,\"rfqType\":\"public\",\"targetVendorId\":null,\"targetVendorName\":null,\"deliveryLocation\":\"طريق خريص - حي المنار\",\"recipientName\":\"جاسر\",\"recipientPhone\":\"0533555\",\"deliveryMethod\":\"delivery\",\"fulfillmentMethod\":\"DELIVERY\",\"source\":\"DIRECT\"}]",
  delivery_location: "طريق خريص - حي المنار",
  delivery_city: "الرياض",
  delivery_district: "حي المنار",
  expires_at: "2026-09-13T19:39:18.798Z",
  expiry_hours: 0.4
};

function parseRFQExtraDetails(parts_description, delivery_location) {
  if (!parts_description)
    return { deliveryLocation: delivery_location, isUrgent: false, rfqType: 'public', deliveryMethod: 'delivery' };
  try {
    const parsed = JSON.parse(parts_description);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const item0 = parsed[0] || {};
      return {
        recipientName: item0.recipientName || undefined,
        recipientPhone: item0.recipientPhone || undefined,
        deliveryLocation: delivery_location || item0.deliveryLocation || undefined,
        isUrgent: Boolean(item0.isUrgent),
        rfqType: item0.rfqType || 'public',
        targetVendorName: item0.targetVendorName || undefined,
        deliveryMethod: item0.deliveryMethod || (item0.fulfillmentMethod === 'SELF_PICKUP' ? 'pickup' : 'delivery'),
        fulfillmentMethod: item0.fulfillmentMethod || (item0.deliveryMethod === 'pickup' ? 'SELF_PICKUP' : 'DELIVERY'),
        source: item0.source || undefined,
        pickupSnapshot: item0.pickupSnapshot || undefined,
      };
    }
  } catch {}
  return { deliveryLocation: delivery_location, isUrgent: false, rfqType: 'public', deliveryMethod: 'delivery' };
}

function parseParts(raw) {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(arr)) {
      return arr.map((p, idx) => {
        const rawImages =
          Array.isArray(p.images) && p.images.length > 0
            ? p.images
            : p.imagePathname || p.imagePreview || p.imageUrl || p.image_url
            ? [String(p.imagePathname || p.imagePreview || p.imageUrl || p.image_url)]
            : [];

        return {
          partName: String(p.partName || p.part_name || p.name || p.title || ('قطعة غيار #' + (idx + 1))),
          partNumber: String(p.partNumber || p.part_number || ''),
          partType:
            p.partType === 'commercial' ||
            p.part_type === 'commercial' ||
            p.partTypeName === 'تجاري'
              ? 'commercial'
              : 'original',
          commercialBrand: p.commercialBrand || p.commercial_brand || p.brand || null,
          quantity: Number(p.quantity || 1),
          images: rawImages,
          imagePathname: rawImages.length > 0 ? rawImages[0] : null,
          notes: p.notes ? String(p.notes) : null,
        };
      });
    }
  } catch {}
  return [];
}

console.log('Extra details:', parseRFQExtraDetails(rfq.parts_description, rfq.delivery_location));
console.log('Parsed parts:', parseParts(rfq.parts_description));

// Test delivery engine
const { calculateDeliveryCost } = require('../lib/delivery-engine');
const calc = calculateDeliveryCost({
  source_city: 'الرياض',
  source_coords: null,
  destination_city: rfq.delivery_city,
  destination_coords: null,
  destination_location_text: rfq.delivery_location
});
console.log('Delivery calculation:', calc);
