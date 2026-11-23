// GST Desk proposed R2 app-owned quotas. These checks are NOT account-wide billing caps.
// Wire the checks into every authenticated R2 operation, backed by atomic D1 reservations,
// BEFORE deploying any route that writes or reads objects.
export const COST_POLICY = Object.freeze({
  r2StorageBytes: 8_000_000_000, // decimal GB, deliberately below Standard R2 10 GB-month free allowance
  r2ClassAMonthly: 50_000,       // 5% of currently published monthly free allowance
  r2ClassBMonthly: 250_000,      // 2.5% of currently published monthly free allowance
  maxSingleUploadBytes: 50_000_000,
  warningPercentages: Object.freeze([50, 75, 90])
});
function checkedInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid_' + field);
  return value;
}
export function assessR2Admission(usage, planned = {}) {
  if (!usage || typeof usage !== 'object') throw new Error('missing_usage');
  const stored = checkedInteger(usage.storedBytes, 'stored_bytes');
  const reserved = checkedInteger(usage.reservedBytes, 'reserved_bytes');
  const a = checkedInteger(usage.classAMonth, 'class_a_month');
  const b = checkedInteger(usage.classBMonth, 'class_b_month');
  const upload = checkedInteger(planned.uploadBytes ?? 0, 'upload_bytes');
  const newA = checkedInteger(planned.classA ?? 0, 'class_a');
  const newB = checkedInteger(planned.classB ?? 0, 'class_b');
  if (upload > COST_POLICY.maxSingleUploadBytes) return { allowed: false, reason: 'file_too_large' };
  if (stored + reserved + upload > COST_POLICY.r2StorageBytes) return { allowed: false, reason: 'r2_storage_cap' };
  if (a + newA > COST_POLICY.r2ClassAMonthly) return { allowed: false, reason: 'r2_class_a_cap' };
  if (b + newB > COST_POLICY.r2ClassBMonthly) return { allowed: false, reason: 'r2_class_b_cap' };
  return {
    allowed: true, reason: null,
    storagePercent: (stored + reserved + upload) / COST_POLICY.r2StorageBytes * 100,
    classAPercent: (a + newA) / COST_POLICY.r2ClassAMonthly * 100,
    classBPercent: (b + newB) / COST_POLICY.r2ClassBMonthly * 100
  };
}
export function warningLevels(usage) {
  const assessment = assessR2Admission(usage);
  if (!assessment.allowed) return [assessment.reason];
  return COST_POLICY.warningPercentages.filter(level =>
    assessment.storagePercent >= level || assessment.classAPercent >= level || assessment.classBPercent >= level
  );
}
// SECURITY: This pure function cannot reserve quota, count third-party bucket access,
// or account for Cloudflare-wide billing. A browser-supplied usage object is untrusted.
// Live code must atomically reserve against authoritative D1 counters and reconcile with
// R2 before each write; otherwise concurrent writes can bypass the ceiling.
