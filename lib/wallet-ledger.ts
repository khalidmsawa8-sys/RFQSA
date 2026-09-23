import { createClient } from "@/lib/supabase/server";
import { logActivityEvent } from "./audit-logger";

export interface LedgerTransactionRecord {
  id: string;
  user_id: string;
  type: "credit" | "debit";
  direction: "inflow" | "outflow";
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference: string;
  invoice_number?: string | null;
  order_id?: string | null;
  performed_by: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ExecuteTransactionParams {
  userId: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  reference?: string;
  invoiceNumber?: string | null;
  orderId?: string | null;
  performedBy?: string;
  actorRole?: string;
  actorName?: string;
  metadata?: Record<string, any>;
}

export interface ExecuteTransferParams {
  fromUserId: string;
  toUserId: string;
  amount: number;
  description: string;
  performedBy?: string;
  actorRole?: string;
  actorName?: string;
  metadata?: Record<string, any>;
}

/**
 * Executes a single atomic wallet transaction on the central database ledger.
 */
export async function executeLedgerTransaction(
  params: ExecuteTransactionParams
): Promise<{ success: boolean; transaction?: LedgerTransactionRecord; error?: string }> {
  const { userId, type, amount, description, reference, invoiceNumber, orderId, performedBy, actorRole, actorName } = params;

  if (amount <= 0) {
    return { success: false, error: "المبلغ يجب أن يكون أكبر من الصفر" };
  }

  const supabase = await createClient();

  // 1. Fetch current user profile to get balance_before
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, full_name, role, ref_code, balance, wallet_balance")
    .eq("id", userId)
    .maybeSingle();

  if (profErr || !profile) {
    return { success: false, error: "المستخدم غير موجود" };
  }

  // Check latest transaction in wallet_transactions for authoritative balance
  const { data: latestTx } = await supabase
    .from("wallet_transactions")
    .select("balance_after")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const balanceBefore =
    latestTx && latestTx.length > 0 && latestTx[0].balance_after !== undefined
      ? Number(latestTx[0].balance_after)
      : Number(profile.balance ?? profile.wallet_balance ?? 0);

  if (type === "debit" && balanceBefore < amount) {
    return {
      success: false,
      error: `الرصيد المتاح (${balanceBefore.toLocaleString("ar-SA")} ر.س) غير كافٍ لإتمام العملية`,
    };
  }

  const balanceAfter = type === "credit" ? balanceBefore + amount : balanceBefore - amount;
  const txId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  const record: LedgerTransactionRecord = {
    id: txId,
    user_id: userId,
    type,
    direction: type === "credit" ? "inflow" : "outflow",
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    description,
    reference: reference || txId,
    invoice_number: invoiceNumber || null,
    order_id: orderId || null,
    performed_by: performedBy || userId,
    metadata: params.metadata || {},
    created_at: timestamp,
  };

  // 2. Persist ledger transaction
  const { error: insErr } = await supabase.from("wallet_transactions").insert(record);
  if (insErr) {
    return { success: false, error: "فشل تسجيل الحركة المالية في سجل العمليات: " + insErr.message };
  }

  // 3. Update profile balance
  await supabase
    .from("profiles")
    .update({ balance: balanceAfter, wallet_balance: balanceAfter, updated_at: timestamp })
    .eq("id", userId);

  // 4. Log immutable audit activity event
  await logActivityEvent({
    actorId: performedBy || userId,
    actorName: actorName || profile.full_name,
    actorRole: actorRole || profile.role,
    actorRefCode: profile.ref_code,
    action: type === "credit" ? "WALLET_DEPOSIT_CREDIT" : "WALLET_WITHDRAWAL_DEBIT",
    entityType: "wallet",
    entityId: txId,
    details: `${description} بمبلغ ${amount} ر.س. الرصيد قبل: ${balanceBefore} ر.س، الرصيد بعد: ${balanceAfter} ر.س`,
    beforeState: { balance: balanceBefore },
    afterState: { balance: balanceAfter, transaction_id: txId },
    metadata: { orderId, invoiceNumber, amount, type },
  });

  return { success: true, transaction: record };
}

/**
 * Executes an atomic transfer between two wallets
 */
export async function executeLedgerTransfer(
  params: ExecuteTransferParams
): Promise<{ success: boolean; senderTx?: LedgerTransactionRecord; receiverTx?: LedgerTransactionRecord; error?: string }> {
  const { fromUserId, toUserId, amount, description, performedBy, actorRole, actorName } = params;

  if (amount <= 0) {
    return { success: false, error: "مبلغ التحويل يجب أن يكون أكبر من الصفر" };
  }

  if (fromUserId === toUserId) {
    return { success: false, error: "لا يمكن التحويل لنفس المحفظة" };
  }

  const supabase = await createClient();

  // Fetch both profiles
  const [{ data: sender }, { data: receiver }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, ref_code, balance, wallet_balance").eq("id", fromUserId).maybeSingle(),
    supabase.from("profiles").select("id, full_name, role, ref_code, balance, wallet_balance").eq("id", toUserId).maybeSingle(),
  ]);

  if (!sender) return { success: false, error: "حساب المرسل غير موجود" };
  if (!receiver) return { success: false, error: "حساب المستلم غير موجود" };

  const senderBalBefore = Number(sender.balance ?? sender.wallet_balance ?? 0);
  if (senderBalBefore < amount) {
    return { success: false, error: `رصيد المرسل (${senderBalBefore.toLocaleString("ar-SA")} ر.س) غير كافٍ لإتمام التحويل` };
  }

  const receiverBalBefore = Number(receiver.balance ?? receiver.wallet_balance ?? 0);
  const senderBalAfter = senderBalBefore - amount;
  const receiverBalAfter = receiverBalBefore + amount;

  const transferCode = `TRF-${Date.now().toString().slice(-6)}`;
  const timestamp = new Date().toISOString();

  // Sender Debit Record
  const senderTx: LedgerTransactionRecord = {
    id: `TXN-${Date.now()}-A`,
    user_id: fromUserId,
    type: "debit",
    direction: "outflow",
    amount,
    balance_before: senderBalBefore,
    balance_after: senderBalAfter,
    description: `تحويل مالي إلى ${receiver.full_name} (${receiver.ref_code || ""}) - ${description}`,
    reference: transferCode,
    performed_by: performedBy || fromUserId,
    created_at: timestamp,
  };

  // Receiver Credit Record
  const receiverTx: LedgerTransactionRecord = {
    id: `TXN-${Date.now()}-B`,
    user_id: toUserId,
    type: "credit",
    direction: "inflow",
    amount,
    balance_before: receiverBalBefore,
    balance_after: receiverBalAfter,
    description: `استلام تحويل مالي من ${sender.full_name} (${sender.ref_code || ""}) - ${description}`,
    reference: transferCode,
    performed_by: performedBy || fromUserId,
    created_at: timestamp,
  };

  // Atomic insert & update
  await supabase.from("wallet_transactions").insert([senderTx, receiverTx]);
  await Promise.all([
    supabase.from("profiles").update({ balance: senderBalAfter, wallet_balance: senderBalAfter, updated_at: timestamp }).eq("id", fromUserId),
    supabase.from("profiles").update({ balance: receiverBalAfter, wallet_balance: receiverBalAfter, updated_at: timestamp }).eq("id", toUserId),
  ]);

  // Log Audit
  await logActivityEvent({
    actorId: performedBy || fromUserId,
    actorName: actorName || sender.full_name,
    actorRole: actorRole || sender.role,
    actorRefCode: sender.ref_code,
    action: "WALLET_TRANSFER",
    entityType: "wallet",
    entityId: transferCode,
    details: `تحويل ${amount} ر.س من ${sender.full_name} إلى ${receiver.full_name}`,
    metadata: { fromUserId, toUserId, amount, transferCode },
  });

  return { success: true, senderTx, receiverTx };
}
