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
  sustainabilityApproach?:   string   // raw answer from sus-q14 (comma-separated)
  sustainabilityCategories?: string   // raw answer from sus-q13 (comma-separated)
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
 * Category-aware multiplier table (Mode A — strategy-led).
 * Mode B (targets-only) = Mode A × 0.75, floored at 4%.
 * Multiple categories: multipliers are averaged across selections.
 * Fallback (no categories / None of the above) uses a conservative Friede-floor model.
 */
const CATEGORY_MULTIPLIERS: Record<string, [number, number, number]> = {
  'Circular Economy':               [0.05, 0.08, 0.12],
  'Social & Community':             [0.05, 0.09, 0.12],
  'Net Zero':                       [0.04, 0.07, 0.10],
  'Nature Positive':                [0.04, 0.08, 0.11],
  'Innovation & Product Activation':[0.06, 0.09, 0.12],
  'Decent Work':                    [0.04, 0.07, 0.10],
  'Diversity & Inclusion':          [0.05, 0.08, 0.11],
  'Water Stewardship':              [0.04, 0.07, 0.10],
}
const FALLBACK_MULTIPLIERS: [number, number, number] = [0.04, 0.06, 0.08]
const MODE_B_FACTOR = 0.75
const CONSERVATIVE_FLOOR = 0.04

export const CATEGORY_DRIVER: Record<string, string> = {
  'Circular Economy':               'Circular Economy Savings + Risk Cost Avoidance',
  'Social & Community':             'Social Purpose Premium + Community Trust Uplift',
  'Net Zero':                       'Net Zero Margin Uplift + Transition Risk Avoidance',
  'Nature Positive':                'Nature-Positive Brand Growth + Operational Efficiency',
  'Innovation & Product Activation':'Sustainability-Led Product Innovation + Sales Uplift',
  'Decent Work':                    'Productivity Uplift + Reputational Risk Reduction',
  'Diversity & Inclusion':          'Diversity Performance Premium + Innovation Revenue Uplift',
  'Water Stewardship':              'Water Risk Mitigation + Operational Cost Reduction',
}

export const CATEGORY_EVIDENCE: Record<string, string> = {
  'Circular Economy':               'Ellen MacArthur/McKinsey Growth Within (2015): 32% material cost reduction from circular transition; WEF (2020): 30–40% circular product cost savings',
  'Social & Community':             'B Lab UK (2025): B Corps grow 28× faster than peers; Cone Communications: 6–9% purchase premium for community-purpose brands; Edelman Trust Barometer: 2–3× trust premium for socially responsible brands',
  'Net Zero':                       'McKinsey (2023): 1–3% margin uplift from carbon efficiency programmes; SBTi/CDP (2024): companies with science-based targets face 25–30% lower transition risk cost',
  'Nature Positive':                'Unilever Sustainable Living Brands (2023): nature-positive brands grew 69% faster than the rest of the portfolio; TNFD (2023): nature-positive land use delivers 15–30% profit uplift per hectare',
  'Innovation & Product Activation':'Accenture (2023): sustainability-led product innovation drives 2.6× revenue growth; Forrester (2022): sustainability-integrated product launches achieve 6–10% sales uplift in year one',
  'Decent Work':                    'ILO (2022): decent work programmes deliver 15–25% productivity uplift; World Benchmarking Alliance (2023): 8–12% reduction in reputational risk costs for high-scoring social companies',
  'Diversity & Inclusion':          'McKinsey Diversity Wins (2023): companies in top quartile for diversity 39% more likely to outperform peers; BCG (2018): diverse management teams generate 19% higher innovation revenue',
  'Water Stewardship':              'CDP Water (2023): water stewardship programmes improve operational cost metrics 6–10%; AWS Coalition (2023): businesses with water risk mitigation face 15–25% lower operational disruption costs',
}

function calcSustainability(
  revenue: number,
  score: number,
  approach?: string,
  categories?: string,
): ScenarioValues {
  const gap = (100 - score) / 100

  // Mode A = strategy-led; Mode B = targets/commitments only
  const isStrategyLed = approach?.includes('We have an overarching strategy') ?? false

  // Resolve category multipliers (average across valid selections)
  const selected = (categories ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s && s !== 'None of the above' && CATEGORY_MULTIPLIERS[s])

  let rawCon: number, rawMod: number, rawOpt: number
  if (selected.length > 0) {
    const sums = selected.reduce(
      ([ac, am, ao], cat) => {
        const [c, m, o] = CATEGORY_MULTIPLIERS[cat]!
        return [ac + c, am + m, ao + o] as [number, number, number]
      },
      [0, 0, 0] as [number, number, number]
    )
    rawCon = sums[0] / selected.length
    rawMod = sums[1] / selected.length
    rawOpt = sums[2] / selected.length
  } else {
    ;[rawCon, rawMod, rawOpt] = FALLBACK_MULTIPLIERS
  }

  // Apply Mode B discount if targets-only
  const con = isStrategyLed ? rawCon : Math.max(CONSERVATIVE_FLOOR, rawCon * MODE_B_FACTOR)
  const mod = isStrategyLed ? rawMod : Math.max(CONSERVATIVE_FLOOR, rawMod * MODE_B_FACTOR)
  const opt = isStrategyLed ? rawOpt : Math.max(CONSERVATIVE_FLOOR, rawOpt * MODE_B_FACTOR)

  return {
    conservative: revenue * gap * con,
    moderate:     revenue * gap * mod,
    optimistic:   revenue * gap * opt,
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

  // Build dynamic driver + evidence for sustainability section
  const selectedCats = (inputs.sustainabilityCategories ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s && s !== 'None of the above' && CATEGORY_DRIVER[s])

  const sustainabilityDriver = selectedCats.length > 0
    ? selectedCats.map(c => CATEGORY_DRIVER[c]).join(' + ')
    : 'Circular Economy Savings + Risk Cost Avoidance + Sustainable Innovation Uplift'

  const sustainabilityEvidence = selectedCats.length > 0
    ? selectedCats.map(c => CATEGORY_EVIDENCE[c]).join('; ')
    : 'Ellen MacArthur/McKinsey Growth Within (2015): 32% material cost reduction from circular transition; Natura / CMO Blueprint (2025): circular product innovation outperformed sales expectations by 100% in first 3 months; L\'Oréal / CMO Blueprint (2025): sustainability-integrated digital campaigns reduced carbon footprint 20% without reducing effectiveness'

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
      driver: sustainabilityDriver,
      evidence: sustainabilityEvidence,
      score: inputs.sustainabilityCapability,
      gap: 100 - inputs.sustainabilityCapability,
      opportunity: calcSustainability(
        r,
        inputs.sustainabilityCapability,
        inputs.sustainabilityApproach,
        inputs.sustainabilityCategories,
      ),
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
