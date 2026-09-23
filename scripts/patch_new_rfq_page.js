const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'client', 'new-rfq', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Ensure import of VendorBranchesSelector
if (!content.includes('import { VendorBranchesSelector }')) {
  content = content.replace(
    'import { VendorBranchMapModal } from "@/components/vendor-branch-map-modal";',
    'import { VendorBranchMapModal } from "@/components/vendor-branch-map-modal";\nimport { VendorBranchesSelector } from "@/components/vendor-branches-selector";'
  );
}

// 2. Replace the pickup block between "{deliveryMethod === \"pickup\" && (" and the following "{/* Additional Notes */}"
const pickupStartMarker = '{/* Pickup Details & Branch Picker (Requirement 11) */}';
const notesMarker = '{/* Additional Notes */}';

const startIndex = content.indexOf(pickupStartMarker);
const notesIndex = content.indexOf(notesMarker);

if (startIndex !== -1 && notesIndex !== -1 && notesIndex > startIndex) {
  const newPickupBlock = `${pickupStartMarker}
                {deliveryMethod === "pickup" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <VendorBranchesSelector
                      branches={vendorBranches}
                      selectedBranchId={selectedVendorBranchId}
                      onSelectBranch={setSelectedVendorBranchId}
                      clientCoords={clientReferenceCoord}
                      selectedVendor={selectedVendor}
                      verifiedMapVendor={verifiedMapVendor}
                      locationName={locationName}
                      isLoading={isLoadingBranches}
                    />
                  </div>
                )}

                `;
  content = content.slice(0, startIndex) + newPickupBlock + content.slice(notesIndex);
  console.log('✅ Replaced pickup section with VendorBranchesSelector.');
} else {
  console.error('❌ Could not find markers for pickup section:', { startIndex, notesIndex });
}

// 3. Update summary sidebar for pickup to show selected branch name
const oldSummaryPickup = `deliveryMethod === "delivery" ? (
                            \`توصيل مباشر إلى (\${deliveryCity || "الرياض"})\`
                          ) : (
                            "استلام مباشر من فرع المورد"
                          )`;

const newSummaryPickup = `deliveryMethod === "delivery" ? (
                            \`توصيل مباشر إلى (\${deliveryCity || "الرياض"})\`
                          ) : (
                            <div>
                              <p className="text-emerald-300 font-extrabold">استلام مباشر من فرع المورد</p>
                              {(() => {
                                const sel = vendorBranches.find((b: any) => b.id === selectedVendorBranchId);
                                if (!sel) return null;
                                return (
                                  <p className="text-[10px] text-slate-300 font-medium mt-0.5 truncate">
                                    الفرع: {sel.name}
                                  </p>
                                );
                              })()}
                            </div>
                          )`;

if (content.includes(oldSummaryPickup)) {
  content = content.replace(oldSummaryPickup, newSummaryPickup);
  console.log('✅ Updated summary sidebar for selected branch.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('🎉 Successfully patched app/client/new-rfq/page.tsx.');
