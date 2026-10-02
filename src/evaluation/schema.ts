import { z } from "zod";

/**
 * HIGH = hard block, no NFA (Note for Approval) at any level.
 * MEDIUM = permitted only with NFA / approval.
 * LOW = documentation / verification item.
 * This taxonomy comes directly from the bank guideline, not invented here.
 */
export const SeveritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type Severity = z.infer<typeof SeveritySchema>;

// A plain string that must parse as a real date, e.g. "2024-01-01".
const isoDateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "must be a parseable ISO 8601 date string",
});

/**
 * Gates whether a rule runs at all for a given report — e.g. a commercial
 * BUA rule should not fire on a residential report. Exactly one of `in` /
 * `notIn` must be given: `in` for "only these categories", `notIn` for
 * "everything except these categories" (needed for guideline language like
 * "other than Residential or Commercial property").
 */
export const AppliesWhenSchema = z
  .object({
    field: z.string().min(1),
    in: z.array(z.string()).min(1).optional(),
    notIn: z.array(z.string()).min(1).optional(),
  })
  .refine((condition) => (condition.in !== undefined) !== (condition.notIn !== undefined), {
    message: "applies_when must define exactly one of in or notIn",
  });
export type AppliesWhen = z.infer<typeof AppliesWhenSchema>;

/**
 * A rule may need more than one simultaneous condition (e.g. "residential
 * AND on wet land"). Accepting a single condition OR an array of them (all
 * must match — AND) keeps the common single-condition case boilerplate-free
 * while still allowing compound gating when a clause needs it.
 */
const AppliesWhenFieldSchema = z.union([AppliesWhenSchema, z.array(AppliesWhenSchema).min(2)]);

const baseRuleFields = {
  id: z.string().min(1),
  description: z.string().min(1),
  severity: SeveritySchema,
  effective_from: isoDateString,
  field: z.string().min(1),
  clause_ref: z.string().min(1),
  applies_when: AppliesWhenFieldSchema.optional(),
};

export const MaxAgeDaysParamsSchema = z.object({
  maxDays: z.number().positive(),
  asOfField: z.string().min(1).optional(),
});
export type MaxAgeDaysParams = z.infer<typeof MaxAgeDaysParamsSchema>;

export const InRangeParamsSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    minExclusive: z.boolean().optional(),
    maxExclusive: z.boolean().optional(),
  })
  .refine((params) => params.min !== undefined || params.max !== undefined, {
    message: "in_range params must define at least one of min or max",
  });
export type InRangeParams = z.infer<typeof InRangeParamsSchema>;

export const InBlocklistParamsSchema = z.object({
  blocklist: z.array(z.string()).min(1),
  caseSensitive: z.boolean().optional(),
});
export type InBlocklistParams = z.infer<typeof InBlocklistParamsSchema>;

// Same idea as in_blocklist, but each entry keeps its own clause_ref so one
// rule can cover a whole group of blocked values (e.g. every Category B
// property-sub-type block) without losing which guideline clause each
// value came from.
export const BlocklistEntrySchema = z.object({
  value: z.string().min(1),
  clause_ref: z.string().min(1),
});
export type BlocklistEntry = z.infer<typeof BlocklistEntrySchema>;

export const InBlocklistGroupedParamsSchema = z.object({
  blocklist: z.array(BlocklistEntrySchema).min(1),
  caseSensitive: z.boolean().optional(),
});
export type InBlocklistGroupedParams = z.infer<typeof InBlocklistGroupedParamsSchema>;

export const ThresholdByCityTierParamsSchema = z.object({
  tierField: z.string().min(1),
  thresholds: z.record(z.number()),
  comparison: z.enum(["max", "min"]),
});
export type ThresholdByCityTierParams = z.infer<typeof ThresholdByCityTierParamsSchema>;

export const FieldsMatchWithinToleranceParamsSchema = z.object({
  compareField: z.string().min(1),
  tolerance: z.number().nonnegative(),
  mode: z.enum(["absolute", "percentage"]).optional(),
  /** Status to report when the tolerance is breached. Defaults to FAIL. */
  onMismatch: z.enum(["FAIL", "NEEDS_REVIEW"]).optional(),
});
export type FieldsMatchWithinToleranceParams = z.infer<typeof FieldsMatchWithinToleranceParamsSchema>;

export const NotEqualsParamsSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
});
export type NotEqualsParams = z.infer<typeof NotEqualsParamsSchema>;

export const RatioInRangeParamsSchema = z
  .object({
    denominatorField: z.string().min(1),
    /** min/max are plain percentages (e.g. 20 means 20%), consistent with
     * fields_match_within_tolerance's percentage mode. */
    min: z.number().optional(),
    max: z.number().optional(),
    minExclusive: z.boolean().optional(),
    maxExclusive: z.boolean().optional(),
  })
  .refine((params) => params.min !== undefined || params.max !== undefined, {
    message: "ratio_in_range params must define at least one of min or max",
  });
export type RatioInRangeParams = z.infer<typeof RatioInRangeParamsSchema>;

// Every rule has the same base fields (id, description, severity, etc.) but
// a different `params` shape depending on which check it uses — e.g.
// in_range needs { min, max }, in_blocklist needs { blocklist }. A
// discriminated union lets Zod pick the right params shape to validate
// against based on the rule's own `check` field, so a typo like using
// in_range's params on an in_blocklist rule is rejected immediately.
export const RuleSchema = z.discriminatedUnion("check", [
  z.object({ ...baseRuleFields, check: z.literal("max_age_days"), params: MaxAgeDaysParamsSchema }),
  z.object({ ...baseRuleFields, check: z.literal("in_range"), params: InRangeParamsSchema }),
  z.object({ ...baseRuleFields, check: z.literal("in_blocklist"), params: InBlocklistParamsSchema }),
  z.object({
    ...baseRuleFields,
    check: z.literal("in_blocklist_grouped"),
    params: InBlocklistGroupedParamsSchema,
  }),
  z.object({
    ...baseRuleFields,
    check: z.literal("threshold_by_city_tier"),
    params: ThresholdByCityTierParamsSchema,
  }),
  z.object({
    ...baseRuleFields,
    check: z.literal("fields_match_within_tolerance"),
    params: FieldsMatchWithinToleranceParamsSchema,
  }),
  z.object({ ...baseRuleFields, check: z.literal("not_equals"), params: NotEqualsParamsSchema }),
  z.object({ ...baseRuleFields, check: z.literal("ratio_in_range"), params: RatioInRangeParamsSchema }),
]);
export type Rule = z.infer<typeof RuleSchema>;

/** Derived from the schema (not hand-maintained) so the two can never drift. */
export type CheckName = Rule["check"];

export const RuleSetSchema = z.object({
  version: z.string().min(1),
  effective_from: isoDateString,
  rules: z.array(RuleSchema).superRefine((rules, ctx) => {
    const seenIds = new Set<string>();
    rules.forEach((rule, index) => {
      if (seenIds.has(rule.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate rule id "${rule.id}"`,
          path: [index, "id"],
        });
      }
      seenIds.add(rule.id);
    });
  }),
});
export type RuleSet = z.infer<typeof RuleSetSchema>;
