const moneyFormatter = new Intl.NumberFormat('en-IN');

export const MONTHLY_FEE_MIN = 500;
export const MONTHLY_FEE_MAX = 1500;

export const MEMBERSHIP_FEE_PLANS = [
  {
    name: 'Starter',
    price: MONTHLY_FEE_MIN,
    blurb: 'Best for first-timers',
    items: ['Gym access', 'Friendly onboarding support', 'Beginner-friendly training structure']
  },
  {
    name: 'Standard',
    price: 1000,
    blurb: 'Most chosen',
    highlight: true,
    items: ['Everything in Starter', 'Trainer guidance', 'Regular progress follow-up']
  },
  {
    name: 'Transformation',
    price: MONTHLY_FEE_MAX,
    blurb: 'For serious goals',
    items: ['Everything in Standard', 'Focused fat loss or strength block', 'Priority support and review']
  }
] as const;

export function formatRupees(value: number) {
  return `Rs. ${moneyFormatter.format(value)}`;
}

export function formatMonthlyFee(value: number) {
  return `${formatRupees(value)}/mo`;
}

export function formatMonthlyFeeRange() {
  return `${formatRupees(MONTHLY_FEE_MIN)} - ${formatRupees(MONTHLY_FEE_MAX)}`;
}

export function formatMonthlyFeeRangeWithUnit() {
  return `${formatMonthlyFeeRange()}/month`;
}

export function getExpectedMonthlyCollection(activeMembers: number) {
  const safeCount = Math.max(0, Number(activeMembers) || 0);
  return {
    min: safeCount * MONTHLY_FEE_MIN,
    max: safeCount * MONTHLY_FEE_MAX
  };
}

export function formatExpectedMonthlyCollection(activeMembers: number) {
  const totals = getExpectedMonthlyCollection(activeMembers);
  return `${formatRupees(totals.min)} - ${formatRupees(totals.max)}`;
}
