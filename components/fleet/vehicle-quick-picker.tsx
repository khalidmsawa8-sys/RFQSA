"use client";

import React, { useState, useEffect } from "react";
import { VehicleEntity, VehicleSnapshotDTO } from "@/lib/bounded-contexts/fleet/fleet.types";
import { fleetRepository } from "@/lib/bounded-contexts/fleet/fleet.repository";
import { Car, Search, Star, Check, Sparkles, Plus, Clock, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

interface VehicleQuickPickerProps {
  onSelectVehicle: (vehicle: VehicleEntity, snapshot: VehicleSnapshotDTO) => void;
  selectedVehicleId?: string;
}

export default function VehicleQuickPicker({ onSelectVehicle, selectedVehicleId }: VehicleQuickPickerProps) {
  const [vehicles, setVehicles] = useState<VehicleEntity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fleetRepository.searchVehicles({
        organization_id: "org-national-procurement",
        search_term: searchTerm,
        limit: 20,
      });
      setVehicles(res.vehicles);
      setLoading(false);
    }
    load();
  }, [searchTerm]);

  const favorites = vehicles.filter((v) => v.is_favorite);

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-5 md:p-6 border border-slate-800 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              منتقي المركبات والأساطيل الذكي (Fleet Quick Picker)
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                تعبئة بنقرة واحدة ⚡
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              اختر مركبتك المحفوظة من الكراج لتعبئة الـ VIN ورقم اللوحة والبيانات وتأكيد النسخة المعتمدة
            </p>
          </div>
        </div>

        <Link
          href="/client/garage"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          إضافة سيارة للكراج
        </Link>
      </div>

      {/* Favorites Quick Chips */}
      {favorites.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            مركباتك المفضلة والشائعة:
          </p>
          <div className="flex flex-wrap gap-2">
            {favorites.map((v) => {
              const isSelected = selectedVehicleId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVehicle(v, fleetRepository.createVehicleSnapshot(v))}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border ${
                    isSelected
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-105"
                      : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>{v.brand_name} {v.model_name} {v.year}</span>
                  <span className="text-[10px] opacity-75 font-mono">({v.plate_number})</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Input FTS */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ابحث برقم الشاصي (VIN) أو رقم اللوحة أو اسم الموديل والشركة..."
          className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-2xl py-2.5 pr-10 pl-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
        />
      </div>

      {/* Vehicles Grid / List */}
      <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">جاري البحث في كراج الأسطول...</div>
        ) : vehicles.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
            لم يتم العثور على سيارات مطابقة. <Link href="/client/garage" className="text-emerald-400 underline font-bold">أضفها الآن للكراج</Link>
          </div>
        ) : (
          vehicles.map((v) => {
            const isSelected = selectedVehicleId === v.id;
            return (
              <div
                key={v.id}
                onClick={() => onSelectVehicle(v, fleetRepository.createVehicleSnapshot(v))}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-950/40 border-emerald-500/80 shadow-md"
                    : "bg-slate-950/40 hover:bg-slate-800/50 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isSelected ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                  }`}>
                    {v.brand_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-white">{v.brand_name} {v.model_name} {v.year}</span>
                      {v.trim && <span className="text-[10px] text-slate-400 font-medium">({v.trim})</span>}
                      {v.is_default && <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">الافتراضية</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                      <span>اللوحة: <strong className="text-slate-200">{v.plate_number}</strong></span>
                      <span>VIN: <strong className="text-slate-300">{v.vin}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-emerald-500 text-slate-950 shadow-sm"
                        : "bg-slate-800 text-slate-300 hover:bg-emerald-500 hover:text-slate-950"
                    }`}
                  >
                    {isSelected ? "تم الاختيار ✓" : "اختيار وتعبئة"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
