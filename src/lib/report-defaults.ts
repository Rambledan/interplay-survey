/**
 * report-defaults.ts
 *
 * Default report content (SECTION_META text + evidence references).
 * Used by the CMS API to seed the editor with current defaults, and by
 * the PDF route as a fallback when no template override is stored.
 *
 * Shared types are defined here so they can be imported by db.ts,
 * InterplayReport.tsx, and the admin API without circular dependencies.
 */

import { SECTION_META } from './score'

// ── Shared types ──────────────────────────────────────────────────────────────

/** Global report template — all overrideable content, keyed by section slug */
export interface ReportTemplateContent {
  sections?: Record<string, {
    insights?: string[]    // 4 items, one per band [0-39, 40-59, 60-79, 80-100]
    actions?: string[]     // 3 items, one per action band [0-39, 40-59, 60+]
    howWeCanHelp?: string[] // 3 items, same mapping as actions
  }>
  evidence?: string[]      // 4 reference strings shown on the evidence page
}

/** Per-respondent report overrides — flat override for each section's rendered text */
export interface ReportOverrideContent {
  sections?: Record<string, {
    insight?: string       // replaces the band-selected insight for this person
    action?: string        // replaces the band-selected action
    howWeCanHelp?: string  // replaces the band-selected howWeCanHelp
  }>
}

// ── Default evidence references ───────────────────────────────────────────────

export const DEFAULT_EVIDENCE = [
  'Friede, G., Busch, T. & Bassen, A. (2015). "ESG and financial performance: aggregated evidence from more than 2000 empirical studies." Journal of Sustainable Finance & Investment, 5(4), 210–233.',
  'B Lab UK (2025). B Corp Insights Report 2025. bcorporation.uk — B Corps grow 28× faster than UK GDP; 17pp employee retention premium.',
  'Ellen MacArthur Foundation / McKinsey & Company (2015). Growth Within: A Circular Economy Vision for a Competitive Europe. Circular economy could reduce material costs by 32% by 2030.',
  'UN Global Compact (2025). CMO Blueprint for Sustainable Growth (in partnership with Kantar). Brands with strong sustainability credentials command 0.7 Kantar BrandZ correlation to brand value; sustainable product lines growing 5–7× market average.',
]

// ── Build default template from SECTION_META ─────────────────────────────────

export function getDefaultTemplate(): ReportTemplateContent {
  return {
    sections: Object.fromEntries(
      Object.entries(SECTION_META).map(([slug, meta]) => [
        slug,
        {
          insights: [...meta.insights] as string[],
          actions: [...meta.actions] as string[],
          howWeCanHelp: [...meta.howWeCanHelp] as string[],
        },
      ])
    ),
    evidence: [...DEFAULT_EVIDENCE],
  }
}

// ── Deep-merge helper (saved overrides defaults) ──────────────────────────────

export function mergeWithDefaults(
  defaults: ReportTemplateContent,
  saved: ReportTemplateContent
): ReportTemplateContent {
  const merged: ReportTemplateContent = {
    evidence: saved.evidence ?? defaults.evidence ?? [],
    sections: { ...(defaults.sections ?? {}) },
  }

  for (const [slug, defSection] of Object.entries(defaults.sections ?? {})) {
    const savedSection = saved.sections?.[slug]
    merged.sections![slug] = {
      insights: savedSection?.insights ?? defSection.insights ?? [],
      actions: savedSection?.actions ?? defSection.actions ?? [],
      howWeCanHelp: savedSection?.howWeCanHelp ?? defSection.howWeCanHelp ?? [],
    }
  }

  return merged
}
