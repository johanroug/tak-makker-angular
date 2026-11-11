# Reference redesign

Implemented from the supplied homepage and workspace references:

- Dark green hero with white/orange typography, orange primary actions, phone illustration and three numbered cards.
- Shared cream surfaces, rounded cards, brand typography and button treatments across public pages, authentication and workspace.
- Desktop workspace with conversation, task/material tabs and a persistent quotation summary on the right.
- Approval controls retain existing validation and saving guards. Switching tabs retains fields and includes accepted lines from both tabs in the total.
- Mobile keeps the existing four-section navigation and shows the quotation summary in the quotation section.

The current trade screenshots (`tilbud-*-v3.jpg`) and `workspace-v3.jpg` were captured locally from the actual quotation component with illustrative test data. They show the decorative green/orange rail without the former left navigation menu. Versioned filenames prevent stale browser caches. The temporary capture route and fixture were removed after verification. No live project data was modified.

Validation: production build and SEO checks; two component tests covering tab changes, retained edits, totals and approval guards; browser checks of desktop/mobile layouts, tab keyboard navigation and totals updating on approval.

## Hero image

Generated with the built-in imagegen tool, then exported as WebP for the website.

Website asset: `public/marketing/hero-tradesman.webp`.

Final prompt:

> Create a photorealistic website hero BACKGROUND PHOTO ONLY, wide landscape 2:1. Scandinavian construction tradesman, attractive rugged 38-year-old man with brown wavy hair and short beard, dark work jacket with small orange workwear accents, standing at construction site, smiling confidently looking slightly upward right. Composition: man chest-up at 66% horizontal position, fills image height, rightmost 20% blurred construction site, entire LEFT 48% is deep dark forest green #002e24 blurred empty space for white website headline. Cinematic natural daylight, warm skin, deep green shadows, photographic details. NO text, NO typography, NO logos, NO UI, NO phone, no additional people. Match the dark green/orange Danish construction SaaS reference aesthetic.
