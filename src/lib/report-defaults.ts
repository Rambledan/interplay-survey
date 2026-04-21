/**
 * report-defaults.ts
 *
 * Default report content (SECTION_META text + evidence references).
 * Used by the CMS API to seed the editor with current defaults, and by
 * the PDF route as a fallback when no template override is stored.
 */

import { SECTION_META } from './score'
import type { HowWeCanHelpBand } from './score'

// ── Shared types ───────────────────────────────────────────────────────────────

export type { HowWeCanHelpBand, HowWeCanHelpItem } from './score'

/** Global report template — all overrideable content, keyed by section slug */
export interface ReportTemplateContent {
  sections?: Record<string, {
    insights?: string[]           // 4 items, one per band [0-39, 40-59, 60-79, 80-100]
    actions?: string[]            // 3 items, one per action band [0-39, 40-59, 60+]
    howWeCanHelp?: HowWeCanHelpBand[]  // 3 items, one per action band [0-39, 40-59, 60+]
  }>
  evidence?: string[]             // reference strings shown on the evidence page
}

/** Per-respondent report overrides — replaces the band-selected content for one person */
export interface ReportOverrideContent {
  sections?: Record<string, {
    insight?: string
    action?: string
    howWeCanHelp?: HowWeCanHelpBand   // replaces the whole band-selected howWeCanHelp
  }>
}

// ── Default evidence references ────────────────────────────────────────────────

export const DEFAULT_EVIDENCE = [
  'Friede, G., Busch, T. & Bassen, A. (2015). "ESG and financial performance: aggregated evidence from more than 2000 empirical studies." Journal of Sustainable Finance & Investment, 5(4), 210–233.',
  'B Lab UK (2025). B Corp Insights Report 2025. bcorporation.uk — B Corps grow 28× faster than UK GDP; 17pp employee retention premium.',
  'Ellen MacArthur Foundation / McKinsey & Company (2015). Growth Within: A Circular Economy Vision for a Competitive Europe. Circular economy could reduce material costs by 32% by 2030.',
  'UN Global Compact (2025). CMO Blueprint for Sustainable Growth (in partnership with Kantar). Brands with strong sustainability credentials command 0.7 Kantar BrandZ correlation to brand value; sustainable product lines growing 5–7× market average.',
]

// ── Build default template from SECTION_META ──────────────────────────────────

export function getDefaultTemplate(): ReportTemplateContent {
  return {
    sections: Object.fromEntries(
      Object.entries(SECTION_META).map(([slug, meta]) => [
        slug,
        {
          insights: [...meta.insights] as string[],
          actions: [...meta.actions] as string[],
          howWeCanHelp: meta.howWeCanHelp.map(band => ({
            intro: band.intro ?? '',
            items: (band.items ?? []).map(item => ({ title: item.title, content: item.content })),
          })) as HowWeCanHelpBand[],
        },
      ])
    ),
    evidence: [...DEFAULT_EVIDENCE],
  }
}

// ── Deep-merge helper (saved overrides defaults) ───────────────────────────────

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
