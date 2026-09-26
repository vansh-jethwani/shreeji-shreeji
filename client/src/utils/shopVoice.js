/**
 * Warm one-liners in the shopkeeper's voice, shown under product descriptions.
 * Keyed by product name (exact seed names). These never override the price —
 * the backend stays the source of truth — and admins can still edit the
 * descriptions themselves from the dashboard.
 */
export const SHOP_NOTES = {
  'Soan Papdi': 'Our most reordered sweet — soft enough to cut with a spoon.',
  Rasgulla: 'We soak these a full night. You can taste the patience.',
  'Gulab Jamun': 'Best served warm. Ten seconds in the microwave — trust us.',
  'Kaju Katli': 'The one people quietly fight over at weddings. We pack extra.',
  'Bikaneri Bhujia': 'The original Bikaner crunch. Accept no imitations.',
  'Aloo Bhujia': 'Dangerously easy to finish in one sitting.',
  'Moong Dal': 'Roasted, not fried. Your evening chai\u2019s best friend.',
  'Navratan Mixture': 'Nine things in one handful. A small party, really.',
  'Masala Chips': 'Cut thick, fried slow, dusted generously.',
  'Banana Chips': 'Coconut-kissed and shatteringly crisp.',
  'Masala Peanuts': 'The bowl always empties before the conversation does.',
  'Mini Chakli': 'Buttery little spirals — a 4pm weakness around here.',
  Rasmalai: 'Cloud-soft, in saffron milk. Keep it chilled.',
  'Motichoor Laddu': 'Fine boondi, pure desi ghee. That\u2019s the whole secret.',
  'Milk Cake': 'Stirred for hours until it turns to caramel. Worth it.',
  'Dry Fruit Barfi': 'Loaded with pistachios. We don\u2019t skimp.',
  'Honey Roasted Nuts': 'Wild-honey glaze — sticky fingers guaranteed.',
  'Peri Peri Makhana': 'Light as air, with a proper little kick.',
  'Chocolate Dry Fruits': 'Belgian chocolate over roasted nuts. Say no more.',
  'Rose Pistachio Bites': 'Fragrant, pretty, and gone in minutes.',
  'Signature Gift Box': 'Our keepsake box — people reuse it for years.',
  'Greeting Card Set': 'Letterpress cards, for the note you\u2019ll actually write.',
  'Trail Mix': 'The 6pm hunger fix, sorted.',
  'Roasted Almonds': 'Slow-roasted with sea salt. Simple, perfect.'
}

/** Slugs that earn the rotated "Bestseller" stamp. */
export const BESTSELLERS = new Set([
  'kaju-katli',
  'bikaneri-bhujia',
  'honey-roasted-nuts',
  'soan-papdi'
])

/** Honest one-liners under each hamper-builder section header. */
export const SECTION_NOTES = {
  1: 'Start with something sweet — that\u2019s how we do it here.',
  2: 'The crunch that made Bikaner famous.',
  3: 'Roasted slow, in small batches every Tuesday.',
  4: 'The finishing touches, if you like.'
}
