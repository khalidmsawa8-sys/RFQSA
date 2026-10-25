# Antigravity Agent Directives — RFQ Marketplace (RFQSA)

## Mandatory Engineering Rule: Zero-Regression Issue Resolution
Whenever the USER requests any modification, bug fix, or feature enhancement:
1. **Never break existing code**: You MUST follow [ISSUE_RESOLUTION_PLAYBOOK.md](file:///c:/Users/Administrator/.gemini/antigravity-ide/scratch/RFQ/ISSUE_RESOLUTION_PLAYBOOK.md).
2. **Blast Radius Analysis**: Before modifying any function, service, or widget, search across both the Web app (`app/`, `components/`) and the Mobile app (`mobile_app/`) to identify all consumers and guarantee backward compatibility.
3. **Web & Mobile 1:1 Parity**:
   - Financial calculations (Parts subtotal, platform commission, delivery fee, taxable base, VAT 15%, grand total) must match 1:1 between Web and Android app following Saudi ZATCA e-invoicing standards.
   - Dual-pricing (original vs commercial) and fulfillment methods (branch pickup vs delivery) must behave identically on Web and Mobile.
4. **Non-breaking Additive Changes**:
   - Never remove or mutate existing fields in payload contracts or JSON databases (`orders_db.json`, `invoices_db.json`). Add optional fields or support fallback schemas.
5. **End-to-End Verification**:
   - Verify modified files, compile/analyze without errors, sync changes to the VPS, build the APK release, and verify live endpoints return HTTP 200 OK.
