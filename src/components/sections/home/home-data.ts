import { MEMBERSHIP_FEE_PLANS, formatMonthlyFee } from '@/lib/fee-config';

export const HOME_STATS = [
  { label: 'Active branches', value: 2 },
  { label: 'Training plans', value: 3, suffix: '+' },
  { label: 'Days of support', value: 7, suffix: 'd' }
];

export const HOME_TRAINERS = [
  { name: 'Arjun Mehta', role: 'Strength Coach', tags: ['Strength', 'Technique', 'Progression'], years: '8+ years' },
  { name: 'Neha Sharma', role: 'Fat Loss Specialist', tags: ['Fat loss', 'Conditioning', 'Nutrition basics'], years: '6+ years' },
  { name: 'Rohan Verma', role: 'Mobility and Rehab', tags: ['Mobility', 'Injury prevention', 'Recovery'], years: '7+ years' }
];

export const HOME_PLANS = MEMBERSHIP_FEE_PLANS.map((plan) => ({
  ...plan,
  price: formatMonthlyFee(plan.price),
  highlight: 'highlight' in plan ? Boolean(plan.highlight) : false
}));

export const GALLERY_PLACEHOLDERS = [
  { title: 'Reception and entry', hint: 'Front-desk welcome, entry area, and the first impression members feel when they walk in.' },
  { title: 'Strength floor', hint: 'Machines, barbells, dumbbells, and the serious training energy of the main workout floor.' },
  { title: 'Cardio or conditioning zone', hint: 'Treadmills, cycles, sleds, or any fast-paced conditioning area that shows branch energy.' },
  { title: 'Results and atmosphere', hint: 'Transformation wall, signature corners, or the parts of the branch members love remembering.' }
];

export const OWNER_CONTACT_PLACEHOLDERS = [
  { label: 'Main contact phone', value: 'Reception contact shared at the branch', hint: 'Use this for membership help, timings, and general enquiries.' },
  { label: 'WhatsApp support', value: 'Quick support available during branch hours', hint: 'Helpful for follow-ups, joining guidance, and simple questions.' },
  { label: 'Reception hours', value: 'Open during regular branch timings', hint: 'Ideal for walk-ins, membership support, and renewal help.' }
];

export const TRAINER_PLACEHOLDERS = [
  { role: 'Strength specialist', hint: 'Strength-focused coaching, form correction, and progressive training support.' },
  { role: 'Fat loss coach', hint: 'Transformation coaching, steady follow-through, and day-to-day accountability.' },
  { role: 'Mobility coach', hint: 'Recovery-first guidance, better movement quality, and long-term sustainable progress.' }
];
