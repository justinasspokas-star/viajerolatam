/**
 * INTERWELT plan display guard — provider-confirmed commercial rules, Oct 2026.
 *
 * This is a conservative SECOND check of what may be displayed, NOT a
 * replacement for INTERWELT's API eligibility checks. The provider's
 * /api/quotes 'plans' array remains the source of eligible offers.
 *
 * No PDF is stored or linked by this module.
 */
export const PLAN_DISPLAY_RULES = Object.freeze({
  205: Object.freeze({ name: "ESTELAR", maxAge: 99, minDays: 1, maxDays: 90 }),
  206: Object.freeze({ name: "SOMOS EUROPA*", maxAge: 99, minDays: 1, maxDays: 365 }),
  207: Object.freeze({ name: "INTERWELT 40", maxAge: 85, minDays: 1, maxDays: 120 }),
  208: Object.freeze({ name: "INTERWELT 60", maxAge: 74, minDays: 1, maxDays: 120 }),
  209: Object.freeze({ name: "INTERWELT 100", maxAge: 74, minDays: 1, maxDays: 120 }),
  221: Object.freeze({ name: "LONG TRIP BASIC", maxAge: 74, minDays: 30, maxDays: 365 }),
  225: Object.freeze({ name: "ENTRE MUNDOS", maxAge: 50, minDays: 30, maxDays: 365 })
});

function comparableName(name) {
  return String(name || "")
    .normalize("NFKC")
    .replace(/[*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Confirm only a plan known to this rollout, with an exact ID/name,
 * and age/length bounds consistent with the provider's commercial catalog.
 * Unknown/new plans are withheld until they have been reviewed.
 */
export function approvedForDisplay(plan, search) {
  if (!plan || !Number.isSafeInteger(plan.id)) return false;
  const rule = PLAN_DISPLAY_RULES[plan.id];
  if (!rule || comparableName(rule.name) !== comparableName(plan.name)) return false;
  if (!Number.isSafeInteger(search?.days) ||
      search.days < rule.minDays || search.days > rule.maxDays) return false;
  if (!Array.isArray(search.ages) || search.ages.length < 1 ||
      !search.ages.every(age => Number.isInteger(age) &&
        age >= 0 && age <= rule.maxAge)) return false;
  return true;
}
