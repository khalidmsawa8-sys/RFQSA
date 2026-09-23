import 'package:flutter/material.dart';

/// Fulfillment Method for the order
enum FulfillmentMethod {
  delivery,
  branchPickup,
}

/// Actor Role executing the transition
enum OrderActorRole {
  client,
  vendor,
  courier,
  admin,
}

/// Canonical Order Status enum
enum CanonicalOrderStatus {
  pending,
  preparing,
  ready,
  assigned,
  shipping,
  outForDelivery,
  delivered,
  readyForPickup,
  pickupInProgress,
  pickedUp,
  awaitingConfirmation,
  received,
  completed,
  cancelled,
}

/// Status Metadata for display in UI
class OrderStatusMetadata {
  final String key;
  final String labelAr;
  final String descriptionAr;
  final int stepIndex; // 1 to 4 or 1 to 6
  final Color badgeBg;
  final Color badgeText;
  final Color dotColor;
  final IconData icon;

  const OrderStatusMetadata({
    required this.key,
    required this.labelAr,
    required this.descriptionAr,
    required this.stepIndex,
    required this.badgeBg,
    required this.badgeText,
    required this.dotColor,
    required this.icon,
  });
}

/// Central Order State Machine & RBAC Enforcer (1:1 with Web State Machine)
class OrderStateMachine {
  OrderStateMachine._();

  static const Map<String, OrderStatusMetadata> metadata = {
    'pending': OrderStatusMetadata(
      key: 'pending',
      labelAr: 'قيد الانتظار',
      descriptionAr: 'تم إنشاء أمر الشراء وبانتظار بدء التجهيز من المورد',
      stepIndex: 1,
      badgeBg: Color(0xFFEFF6FF),
      badgeText: Color(0xFF1D4ED8),
      dotColor: Color(0xFF2563EB),
      icon: Icons.hourglass_top_rounded,
    ),
    'preparing': OrderStatusMetadata(
      key: 'preparing',
      labelAr: 'جاري التجهيز',
      descriptionAr: 'المورد يقوم حالياً بفحص وتجهيز وتغليف قطع الغيار بالمستودع',
      stepIndex: 1,
      badgeBg: Color(0xFFFEF3C7),
      badgeText: Color(0xFFB45309),
      dotColor: Color(0xFFF59E0B),
      icon: Icons.inventory_2_rounded,
    ),
    'ready': OrderStatusMetadata(
      key: 'ready',
      labelAr: 'جاهز للشحن',
      descriptionAr: 'تم تجهيز الشحنة وهي بانتظار استلام مندوب أسطول رفق',
      stepIndex: 2,
      badgeBg: Color(0xFFF0FDF4),
      badgeText: Color(0xFF15803D),
      dotColor: Color(0xFF16A34A),
      icon: Icons.check_circle_outline_rounded,
    ),
    'assigned': OrderStatusMetadata(
      key: 'assigned',
      labelAr: 'تم تعيين المندوب',
      descriptionAr: 'تم إسناد الشحنة لمندوب التوصيل للتحرك لمقر المورد',
      stepIndex: 2,
      badgeBg: Color(0xFFEEF2FF),
      badgeText: Color(0xFF4338CA),
      dotColor: Color(0xFF4F46E5),
      icon: Icons.person_pin_circle_rounded,
    ),
    'shipped': OrderStatusMetadata(
      key: 'shipped',
      labelAr: 'تم الشحن والنقل',
      descriptionAr: 'المندوب استلم القطع من المورد وبدأت مرحلة النقل الميداني',
      stepIndex: 2,
      badgeBg: Color(0xFFFAF5FF),
      badgeText: Color(0xFF7E22CE),
      dotColor: Color(0xFF9333EA),
      icon: Icons.local_shipping_rounded,
    ),
    'in_transit': OrderStatusMetadata(
      key: 'in_transit',
      labelAr: 'في الطريق للعميل',
      descriptionAr: 'المندوب متوجه حالياً لموقع العميل للتسليم المباشر',
      stepIndex: 3,
      badgeBg: Color(0xFFF0F9FF),
      badgeText: Color(0xFF0369A1),
      dotColor: Color(0xFF0284C7),
      icon: Icons.navigation_rounded,
    ),
    'en_route_delivery': OrderStatusMetadata(
      key: 'en_route_delivery',
      labelAr: 'في الطريق للعميل',
      descriptionAr: 'المندوب متوجه حالياً لموقع العميل للتسليم المباشر',
      stepIndex: 3,
      badgeBg: Color(0xFFF0F9FF),
      badgeText: Color(0xFF0369A1),
      dotColor: Color(0xFF0284C7),
      icon: Icons.navigation_rounded,
    ),
    'delivered': OrderStatusMetadata(
      key: 'delivered',
      labelAr: 'تم التسليم بالـ OTP',
      descriptionAr: 'وصلت الشحنة لموقع العميل وبانتظار تأكيد الاستلام',
      stepIndex: 3,
      badgeBg: Color(0xFFECFDF5),
      badgeText: Color(0xFF047857),
      dotColor: Color(0xFF059669),
      icon: Icons.shield_rounded,
    ),
    'ready_for_pickup': OrderStatusMetadata(
      key: 'ready_for_pickup',
      labelAr: 'جاهز للاستلام من الفرع',
      descriptionAr: 'تم تجهيز القطع ويمكن للعميل الحضور لمقر الفرع للاستلام',
      stepIndex: 3,
      badgeBg: Color(0xFFF0FDFA),
      badgeText: Color(0xFF0F766E),
      dotColor: Color(0xFF0D9488),
      icon: Icons.storefront_rounded,
    ),
    'pickup_in_progress': OrderStatusMetadata(
      key: 'pickup_in_progress',
      labelAr: 'جاري الاستلام بالفرع',
      descriptionAr: 'العميل متواجد بالفرع ويجري فحص وتسليم القطع',
      stepIndex: 3,
      badgeBg: Color(0xFFFFFBEB),
      badgeText: Color(0xFFB45309),
      dotColor: Color(0xFFD97706),
      icon: Icons.storefront_rounded,
    ),
    'picked_up': OrderStatusMetadata(
      key: 'picked_up',
      labelAr: 'تم الاستلام من الفرع',
      descriptionAr: 'تم تسليم القطع للعميل من الفرع بنجاح',
      stepIndex: 4,
      badgeBg: Color(0xFFECFDF5),
      badgeText: Color(0xFF047857),
      dotColor: Color(0xFF059669),
      icon: Icons.check_circle_rounded,
    ),
    'completed': OrderStatusMetadata(
      key: 'completed',
      labelAr: 'مكتمل ومستلم نهائياً',
      descriptionAr: 'تم تأكيد الاستلام وفحص القطع وتقييم التجربة بنجاح',
      stepIndex: 4,
      badgeBg: Color(0xFFECFDF5),
      badgeText: Color(0xFF065F46),
      dotColor: Color(0xFF10B981),
      icon: Icons.verified_rounded,
    ),
    'cancelled': OrderStatusMetadata(
      key: 'cancelled',
      labelAr: 'ملغي',
      descriptionAr: 'تم إلغاء الطلب وتحرير المبلغ أو إعادته',
      stepIndex: 0,
      badgeBg: Color(0xFFFEF2F2),
      badgeText: Color(0xFFB91C1C),
      dotColor: Color(0xFFEF4444),
      icon: Icons.cancel_rounded,
    ),
  };

  /// Normalizes any raw status string to a standard lowercase key
  static String normalizeStatus(String? raw) {
    if (raw == null || raw.trim().isEmpty) return 'pending';
    final s = raw.trim().toLowerCase();
    if (s == 'confirmed' || s == 'preparing') return 'preparing';
    if (s == 'ready' || s == 'processing') return 'ready';
    if (s == 'assigned') return 'assigned';
    if (s == 'shipped' || s == 'shipping') return 'shipped';
    if (s == 'in_transit' || s == 'out_for_delivery' || s == 'en_route_delivery') return 'in_transit';
    if (s == 'delivered') return 'delivered';
    if (s == 'ready_for_pickup') return 'ready_for_pickup';
    if (s == 'pickup_in_progress') return 'pickup_in_progress';
    if (s == 'picked_up') return 'picked_up';
    if (s == 'completed' || s == 'received' || s == 'closed') return 'completed';
    if (s == 'cancelled' || s == 'expired') return 'cancelled';
    return s;
  }

  /// Get status metadata
  static OrderStatusMetadata getMetadata(String? status) {
    final norm = normalizeStatus(status);
    return metadata[norm] ?? metadata['pending']!;
  }

  /// Check if the actor is permitted to transition from [currentStatus] to [nextStatus]
  static bool isTransitionAllowed({
    required String currentStatus,
    required String nextStatus,
    required FulfillmentMethod fulfillmentMethod,
    required OrderActorRole actorRole,
  }) {
    final cur = normalizeStatus(currentStatus);
    final nxt = normalizeStatus(nextStatus);

    if (actorRole == OrderActorRole.admin) return true;

    // Terminal states cannot transition
    if (cur == 'completed' || cur == 'cancelled') return false;

    // Cancellation rule
    if (nxt == 'cancelled') {
      return ['pending', 'preparing', 'ready_for_pickup'].contains(cur);
    }

    if (fulfillmentMethod == FulfillmentMethod.delivery) {
      // ── DELIVERY WORKFLOW ──
      switch (actorRole) {
        case OrderActorRole.vendor:
          if (cur == 'pending' && nxt == 'preparing') return true;
          if (cur == 'preparing' && nxt == 'ready') return true;
          // Vendor handing over to courier
          if (cur == 'ready' && nxt == 'shipped') return true;
          return false;

        case OrderActorRole.courier:
          if (cur == 'ready' && (nxt == 'assigned' || nxt == 'shipped')) return true;
          if (cur == 'assigned' && nxt == 'shipped') return true;
          if (cur == 'shipped' && nxt == 'in_transit') return true;
          if (cur == 'in_transit' && nxt == 'delivered') return true;
          return false;

        case OrderActorRole.client:
          if ((cur == 'delivered' || cur == 'awaiting_confirmation') && nxt == 'completed') return true;
          return false;

        case OrderActorRole.admin:
          return true;
      }
    } else {
      // ── BRANCH PICKUP WORKFLOW ──
      switch (actorRole) {
        case OrderActorRole.vendor:
          if (cur == 'pending' && nxt == 'preparing') return true;
          if ((cur == 'pending' || cur == 'preparing') && (nxt == 'ready_for_pickup' || nxt == 'ready')) return true;
          if ((cur == 'ready_for_pickup' || cur == 'ready') && (nxt == 'completed' || nxt == 'picked_up' || nxt == 'pickup_in_progress')) return true;
          if ((cur == 'pickup_in_progress' || cur == 'picked_up') && nxt == 'completed') return true;
          return false;

        case OrderActorRole.client:
          if ((cur == 'picked_up' || cur == 'ready_for_pickup' || cur == 'ready' || cur == 'delivered') && nxt == 'completed') return true;
          return false;

        case OrderActorRole.courier:
          return false; // Courier has no role in branch pickup

        case OrderActorRole.admin:
          return true;
      }
    }
  }

  /// Whether the client can click "تأكيد واستلام الطلب"
  static bool canClientConfirmReceipt(String? status, {bool isPickup = false}) {
    final norm = normalizeStatus(status);
    if (norm == 'completed' || norm == 'cancelled') return false;
    if (isPickup) {
      return norm == 'picked_up' || norm == 'ready_for_pickup';
    }
    // Strict Web Parity: Client cannot confirm until order is delivered by courier
    return norm == 'delivered' || norm == 'awaiting_confirmation';
  }

  /// Reason why client cannot confirm yet (for user guidance)
  static String getClientConfirmDisabledReason(String? status, {bool isPickup = false}) {
    final norm = normalizeStatus(status);
    if (norm == 'completed') return 'تم تأكيد الاستلام وإغلاق الطلب مسبقاً ✅';
    if (norm == 'cancelled') return 'الطلب ملغي ❌';
    if (isPickup) {
      if (norm == 'pending' || norm == 'preparing') {
        return 'الطلب قيد التجهيز بالفرع، سيتفعّل التأكيد عند استلامك للقطع 🏬';
      }
      return 'تأكيد الاستلام متاح بعد فحص واستلام القطع من الفرع';
    } else {
      if (norm == 'pending' || norm == 'preparing') {
        return 'الطلب قيد التجهيز لدى المورد، سيتفعّل التأكيد فور وصول المندوب 📦';
      }
      if (norm == 'ready' || norm == 'assigned') {
        return 'الطلب بانتظار استلام المندوب، سيتفعّل التأكيد فور وصول الشحنة لموقعك 🚚';
      }
      if (norm == 'shipped' || norm == 'in_transit') {
        return 'المندوب في الطريق لموقعك، سيتفعّل التأكيد فور تسليم الشحنة وتأكيد رمز OTP 📍';
      }
      return 'تأكيد الاستلام متاح فور تسليم الشحنة';
    }
  }

  /// Whether cancellation is allowed for this status
  static bool canCancelOrder(String? status) {
    final norm = normalizeStatus(status);
    return ['pending', 'preparing', 'ready_for_pickup'].contains(norm);
  }
}
