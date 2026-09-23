import fs from "fs";
import path from "path";
import {
  DEFAULT_DELIVERY_RULES,
  DeliveryPricingRule,
  DeliveryAuditLog,
} from "./delivery-engine";

const DATA_DIR = path.join(process.cwd(), "data");
const RULES_FILE = path.join(DATA_DIR, "delivery_rules_db.json");
const AUDIT_FILE = path.join(DATA_DIR, "delivery_audit_logs.json");

function ensureDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

export function getServerDeliveryRules(): DeliveryPricingRule[] {
  try {
    ensureDirectory();
    if (fs.existsSync(RULES_FILE)) {
      const content = fs.readFileSync(RULES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  saveServerDeliveryRules(DEFAULT_DELIVERY_RULES);
  return DEFAULT_DELIVERY_RULES;
}

export function saveServerDeliveryRules(rules: DeliveryPricingRule[]) {
  try {
    ensureDirectory();
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), "utf-8");
  } catch {}
}

export function getServerDeliveryAuditLogs(): DeliveryAuditLog[] {
  try {
    ensureDirectory();
    if (fs.existsSync(AUDIT_FILE)) {
      const content = fs.readFileSync(AUDIT_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

export function saveServerDeliveryAuditLog(log: DeliveryAuditLog) {
  const list = getServerDeliveryAuditLogs();
  const updated = [log, ...list].slice(0, 500); // keep latest 500

  try {
    ensureDirectory();
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch {}
}
