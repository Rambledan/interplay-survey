/**
 * financial.ts
 *
 * Financial opportunity calculator for the Interplay Method results report.
 *
 * Evidence base:
 *   - Friede et al. (2015). "ESG and financial performance: aggregated evidence from
 *     more than 2000 empirical studies." J. Sustainable Finance & Investment, 5(4), 210–233.
 *   - B Lab UK (2025). B Corp Insights Report 2025. bcorporation.uk
 *   - Ellen MacArthur Foundation / McKinsey & Company (2015). Growth Within:
 *     A Circular Economy Vision for a Competitive Europe.
 *   - UN Global Compact (2025). CMO Blueprint for Sustainable Growth. In partnership
 *     with Kantar. Includes data from Kantar BrandZ, PwC, BCG, Baker McKenzie, and
 *     case studies from Intrepid Travel, Zespri, Natura, Nedbank, and Schneider Electric.
 */

// ── Revenue bracket parsing ───────────────────────────────────────────────

export const REVENUE_OPTIONS = [
  'Under £500K',
  '£500K – £1M',
  '£1M – £5M',
  '£5M – £20M',
  '£20M – £100M',
  'Over £100M',
] as const

const REVENUE_MIDPOINTS: Record<string, number> = {
  'Under £500K':    250_000,
  '£500K – £1M':   750_000,
  '£1M – £5M':   3_000_000,
  '£5M – £20M': 12_500_000,
  '£20M – £100M': 60_000_000,
  'Over £100M':  150_000_000,
}

const SCALE_MULTIPLIERS: Record<string, number> = {
  Bn: 1_000_000_000,
  Mn: 1_000_000,
  K:  1_000,
}

export function parseRevenue(answer: string | null | undefined): number | null {
  if (!answer) return null

  // New format: "{currency}|{figure}|{scale}"  e.g. "£|5|Mn"
  if (answer.includes('|')) {
    const parts = answer.split('|')
    if (parts.length === 3) {
      const figure = parseFloat(parts[1])
      const multiplier = SCALE_MULTIPLIERS[parts[2]] ?? 1
      if (!isNaN(figure) && figure > 0) return figure * multiplier
    }
    return null
  }

  // Legacy bracket format (backward compat)
  return REVENUE_MIDPOINTS[answer] ?? null
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface ScenarioValues {
  conservative: number
  moderate: number
  optimistic: number
}

export interface SectionOpportunity {
  label: string
  driver: string
  evidence: string
  score: number
  gap: number             // 0–100 percentage points unrealised
  opportunity: ScenarioValues
}

export interface FinancialModel {
  annualRevenue: number
  currencySymbol: string   // £, $, € extracted from the revenue answer
  sections: Record<string, SectionOpportunity>
  totals: ScenarioValues
  totalsAsPercentOfRevenue: { conservative: string; moderate: string; optimistic: string }
}

export interface SurveyInputs {
  annualRevenue: number
  currencySymbol?: string
  appetiteForGrowth: number
  accelerationWithAI: number
  sustainabilityCapability: number
  brandCapability: number
  businessCapability: number
}

// ── Formatting helpers ────────────────────────────────────────────────────

/** Extract currency symbol from a stored revenue answer (new or legacy format). */
export function parseCurrencySymbol(answer: string | null | undefined): string {
  if (!answer) return '£'
  if (answer.includes('|')) return answer.split('|')[0] ?? '£'
  return '£'  // legacy bracket answers were always GBP
}

export function formatCurrency(n: number, symbol = '£'): string {
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${symbol}${Math.round(n / 1_000)}K`
  return `${symbol}${Math.round(n).toLocaleString()}`
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

// ── Section calculators ───────────────────────────────────────────────────

/**
 * Section 1: Appetite for Growth
 * Driver: Revenue Growth Premium
 * Evidence: PwC (CMO Blueprint 2025) — products with sustainability attributes achieve
 * 6–25%+ revenue premium. B Lab UK (2025) — B Corps grow revenue 20% vs 3% (+17pp).
 * Conservative uses PwC 6% floor; optimistic uses the full B Corp 17pp premium.
 */
function calcAppetite(revenue: number, score: number): ScenarioValues {
  const gap = (100 - score) / 100
  return {
    conservative: revenue * gap * 0.06 * 0.20,   // PwC 6% premium × 20% realisation
    moderate:     revenue * gap * 0.11 * 0.35,   // PwC midpoint 11% × 35% realisation
    optimistic:   revenue * gap * 0.17 * 0.50,   // B Corp 17pp premium × 50% realisation
  }
}

/**
 * Section 2: Acceleration of Growth with AI
 * Driver: Operational Efficiency + Innovation Acceleration
 * Evidence: McKinsey (2023) — AI reduces sustainability reporting overhead 20–40%.
 * BCG (CMO Blueprint 2025) — sustainability companies 1.4× more likely to achieve
 * innovative breakthroughs. Schneider Electric — 20–30% maintenance cost savings.
 */
function calcAI(revenue: number, score: number): ScenarioValues {
  const gap = (100 - score) / 100
  return {
    conservative: revenue * gap * ((0.10 * 0.01) + 0.002),   // efficiency + 0.2% innovation
    moderate:     revenue * gap * ((0.25 * 0.02) + 0.005),   // efficiency + 0.5% innovation
    optimistic:   revenue * gap * ((0.35 * 0.03) + 0.014),   // efficiency + BCG 1.4× on 1%
  }
}

/**
 * Section 3: Sustainability Capability
 * Driver: Circular Economy Savings + Risk Cost Avoidance + Sustainable Innovation Uplift
 * Evidence: Ellen MacArthur / McKinsey "Growth Within" (2015) — 32% material cost reduction.
 * Natura (CMO Blueprint 2025) — circular product outperformed sales 100% in first 3 months.
 * L'Oréal (CMO Blueprint 2025) — 20% carbon reduction without reducing campaign effectiveness.
 */
function calcSustainability(revenue: number, score: number): ScenarioValues {
  const gap = (100 - score) / 100
  const CIRCULAR_SAVING = 0.32
  return {
    conservative: revenue * gap * ((CIRCULAR_SAVING * 0.05) + 0.003),          // savings + risk
    moderate:     revenue * gap * ((CIRCULAR_SAVING * 0.12) + 0.005 + 0.005),  // + Natura uplift
    optimistic:   revenue * gap * ((CIRCULAR_SAVING * 0.20) + 0.008 + 0.010),  // + full innovation
  }
}

/**
 * Section 4: Brand Capability
 * Driver: Market Share Gain + Price Premium via Consumer Sustainability Preference
 * Evidence: Kantar BrandZ (CMO Blueprint 2025) — 0.7 correlation: sustainability
 * perceptions → Demand Power. Nedbank (CMO Blueprint 2025) — purpose-led rebrand
 * lifted Brand Preference 17%→28%, Brand Loyalty 65%→75%. Multipliers upgraded v1→v2:
 * conservative 0.5%→0.8%, moderate 1.5%→2.0%, optimistic 2.5%→3.5%.
 */
function calcBrand(revenue: number, score: number): ScenarioValues {
  const gap = (100 - score) / 100
  return {
    conservative: revenue * gap * 0.008,   // Kantar demand correlation, early activation
    moderate:     revenue * gap * 0.020,   // Active brand sustainability programme
    optimistic:   revenue * gap * 0.035,   // Nedbank-level brand transformation + price premium
  }
}

/**
 * Section 5: Business Capability
 * Driver: Enterprise Value Uplift + Talent Retention + Capital & Partnership Access
 * Evidence: Intrepid Travel (CMO Blueprint 2025) — >$600M revenue, eNPS 64, 80% purpose
 * retention. Zespri (CMO Blueprint 2025) — doubled revenue to NZ$5B. Baker McKenzie
 * (CMO Blueprint 2025) — 73% of leaders willing to collaborate on net-zero. Multipliers
 * upgraded v1→v2: conservative 0.5%→0.6%, moderate 1.0%→1.2%, optimistic 2.0%→2.5%.
 */
function calcBusiness(revenue: number, score: number): ScenarioValues {
  const gap = (100 - score) / 100
  return {
    conservative: revenue * gap * 0.006,
    moderate:     revenue * gap * 0.012,
    optimistic:   revenue * gap * 0.025,
  }
}

// ── Main calculator ───────────────────────────────────────────────────────

export function calculateFinancialOpportunity(inputs: SurveyInputs): FinancialModel {
  const { annualRevenue: r } = inputs

  const sections: Record<string, SectionOpportunity> = {
    appetiteForGrowth: {
      label: 'Appetite for Growth',
      driver: 'Revenue Growth Premium',
      evidence: 'PwC (CMO Blueprint, UN Global Compact 2025): products with sustainability attributes achieve 6–25%+ revenue premium; B Lab UK (2025): B Corps grow revenue 20% vs 3% for peers (+17pp premium); Kantar BrandZ (CMO Blueprint 2025): sustainability perceptions = 45% of corporate reputation',
      score: inputs.appetiteForGrowth,
      gap: 100 - inputs.appetiteForGrowth,
      opportunity: calcAppetite(r, inputs.appetiteForGrowth),
    },
    accelerationWithAI: {
      label: 'Acceleration with AI',
      driver: 'Operational Efficiency + Innovation Acceleration',
      evidence: 'McKinsey (2023): AI reduces sustainability reporting/compliance overhead 20–40%; BCG (CMO Blueprint, UN Global Compact 2025): sustainability companies 1.4× more likely to achieve innovative breakthroughs; Schneider Electric / CMO Blueprint (2025): sustainability-led product innovation delivers 20–30% maintenance cost savings',
      score: inputs.accelerationWithAI,
      gap: 100 - inputs.accelerationWithAI,
      opportunity: calcAI(r, inputs.accelerationWithAI),
    },
    sustainabilityCapability: {
      label: 'Sustainability Capability',
      driver: 'Circular Economy Savings + Risk Cost Avoidance + Sustainable Innovation Uplift',
      evidence: 'Ellen MacArthur/McKinsey Growth Within (2015): 32% material cost reduction from circular transition; Natura / CMO Blueprint (2025): circular product innovation outperformed sales expectations by 100% in first 3 months; L\'Oréal / CMO Blueprint (2025): sustainability-integrated digital campaigns reduced carbon footprint 20% without reducing effectiveness',
      score: inputs.sustainabilityCapability,
      gap: 100 - inputs.sustainabilityCapability,
      opportunity: calcSustainability(r, inputs.sustainabilityCapability),
    },
    brandCapability: {
      label: 'Brand Capability',
      driver: 'Market Share Gain + Price Premium via Consumer Sustainability Preference',
      evidence: 'Kantar BrandZ (CMO Blueprint, UN Global Compact 2025): 0.7 correlation between sustainability perceptions and Demand Power (purchase intent); Kantar Sustainability Sector Index (CMO Blueprint 2025): 0.9 correlation between perceived greenwashing and consumers dropping brands; Nedbank (CMO Blueprint 2025): purpose-led rebrand increased Brand Preference from 17% to 28% and Brand Loyalty from 65% to 75%',
      score: inputs.brandCapability,
      gap: 100 - inputs.brandCapability,
      opportunity: calcBrand(r, inputs.brandCapability),
    },
    businessCapability: {
      label: 'Business Capability',
      driver: 'Enterprise Value Uplift + Talent Retention + Capital & Partnership Access',
      evidence: 'Friede et al. (2015): 62.6% of ESG studies show positive CFP correlation; Intrepid Travel (CMO Blueprint 2025): purpose-led business model → >$600M revenue, eNPS 64, 80% retention driven by purpose; Zespri (CMO Blueprint 2025): embedded sustainability → doubled revenue to NZ$5B, #1 fruit brand across 15 markets; Baker McKenzie (CMO Blueprint 2025): 73% of business leaders willing to collaborate with competitors on net-zero',
      score: inputs.businessCapability,
      gap: 100 - inputs.businessCapability,
      opportunity: calcBusiness(r, inputs.businessCapability),
    },
  }

  const totals: ScenarioValues = { conservative: 0, moderate: 0, optimistic: 0 }
  for (const s of Object.values(sections)) {
    totals.conservative += s.opportunity.conservative
    totals.moderate     += s.opportunity.moderate
    totals.optimistic   += s.opportunity.optimistic
  }

  return {
    annualRevenue: r,
    currencySymbol: inputs.currencySymbol ?? '£',
    sections,
    totals,
    totalsAsPercentOfRevenue: {
      conservative: pct(totals.conservative / r),
      moderate:     pct(totals.moderate / r),
      optimistic:   pct(totals.optimistic / r),
    },
  }
}

// ── Narrative generator ───────────────────────────────────────────────────

export interface FinancialNarratives {
  summary: string
  sections: Record<string, string>
}

export function generateFinancialNarrative(model: FinancialModel): FinancialNarratives {
  const { annualRevenue, sections, totals, totalsAsPercentOfRevenue } = model

  const summary = `Based on your annual revenue of ${formatCurrency(annualRevenue)} and your current maturity scores across the five Interplay capability areas, we estimate a total financial opportunity of between ${formatCurrency(totals.conservative)} and ${formatCurrency(totals.optimistic)}, representing ${totalsAsPercentOfRevenue.conservative} to ${totalsAsPercentOfRevenue.optimistic} of revenue. The moderate scenario — which assumes focused but realistic improvement across all five areas — points to ${formatCurrency(totals.moderate)} in accessible value. These estimates are grounded in four independent bodies of evidence: Friede et al. (2015) meta-analysis of 2,200+ ESG studies; B Lab UK's 2025 B Corp performance data; the Ellen MacArthur Foundation / McKinsey 'Growth Within' circular economy model; and the UN Global Compact CMO Blueprint for Sustainable Growth (2025), drawing on Kantar BrandZ, PwC, BCG, and Baker McKenzie research.`

  const sectionNarratives: Record<string, string> = {}
  for (const [key, s] of Object.entries(sections)) {
    sectionNarratives[key] = `With a current score of ${s.score}/100, there is a ${s.gap}-point opportunity gap in ${s.label}. Closing this gap could unlock between ${formatCurrency(s.opportunity.conservative)} (conservative) and ${formatCurrency(s.opportunity.optimistic)} (optimistic) in additional value, driven by ${s.driver}. This estimate is grounded in ${s.evidence}.`
  }

  return { summary, sections: sectionNarratives }
}

// ── Slug → formula key mapping ────────────────────────────────────────────

export const SLUG_TO_FINANCIAL_KEY: Record<string, keyof SurveyInputs> = {
  'appetite':                   'appetiteForGrowth',
  'scale-and-delivery':         'accelerationWithAI',
  'capability-sustainability':  'sustainabilityCapability',
  'capability-brand':           'brandCapability',
  'capability-business':        'businessCapability',
}

export const SLUG_TO_SECTION_KEY: Record<string, string> = {
  'appetite':                   'appetiteForGrowth',
  'scale-and-delivery':         'accelerationWithAI',
  'capability-sustainability':  'sustainabilityCapability',
  'capability-brand':           'brandCapability',
  'capability-business':        'businessCapability',
}
