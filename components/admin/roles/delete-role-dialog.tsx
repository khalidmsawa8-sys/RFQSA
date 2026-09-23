"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Loader2, X, Lock, Users } from "lucide-react";
import { CustomRoleDefinition } from "@/lib/rbac/permissions";

interface DeleteRoleDialogProps {
  open: boolean;
  onClose: () => void;
  role: CustomRoleDefinition | null;
  onDeleted: (roleId: string) => void;
}

export function DeleteRoleDialog({
  open,
  onClose,
  role,
  onDeleted,
}: DeleteRoleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!role) return null;

  const hasMembers = (role.members_count || 0) > 0;
  const isSystem = role.is_system;

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/roles/${role.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل حذف الدور");
      }

      onDeleted(role.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-slate-900 border-slate-800 text-white shadow-2xl" dir="rtl">
        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center text-base font-black text-white">
            حذف الدور الوظيفي [{role.name_ar}]
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {isSystem ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                لا يمكن حذف هذا الدور لأنه دور نظام أساسي معتمد ومحمي (System Protected Role).
              </span>
            </div>
          ) : hasMembers ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <span>يوجد ({role.members_count}) عضو مسند لهم هذا الدور حالياً.</span>
              </div>
              <p className="text-[11px] text-amber-200/80 font-normal leading-relaxed">
                حفاظاً على سلامة الصلاحيات، يمنع النظام حذف الدور قبل نقل أو تغيير أدوار كافة الأعضاء المرتبطين به إلى دور بديل.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-300 text-center leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا الدور المخصص نهائياً؟ سيتم إلغاء كافة ارتباطات الصلاحيات المرتبطة به. لا يمكن التراجع عن هذا الإجراء.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer transition-all"
          >
            إلغاء
          </button>

          {!isSystem && !hasMembers && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>تأكيد الحذف النهائي</span>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
