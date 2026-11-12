# Prisneutrale produktillustrationer — 12. november 2026

Den offentlige hjemmeside sælger funktionalitet og håndværkerens kontrol. Telefonmockuppen og det lille tilbudskort viser derfor egne valg og status frem for konkrete beløb og tidsestimater. Budskabet “Dine timepriser. Dine materialer. Dine tilbud.” vises én gang ved forsidens hero.

## Udskiftede aktive billedreferencer

Alle stier er under `public/marketing/`:

| Tidligere asset med indbyggede eksempeldata | Ny prisneutral illustration |
| --- | --- |
| `tilbud-vvs-v3.jpg` | `tilbud-vvs-flexible.jpg` |
| `tilbud-toemrer-v3.jpg` | `tilbud-toemrer-flexible.jpg` |
| `tilbud-murer-v3.jpg` | `tilbud-murer-flexible.jpg` |
| `tilbud-maler-v3.jpg` | `tilbud-maler-flexible.jpg` |
| `workspace-v3.jpg` | `workspace-flexible.jpg` |
| `trin-1-beskriv-opgaven.png` | `trin-1-beskriv-opgaven-flexible.jpg` |
| `trin-3-hent-pdf.png` | `trin-3-hent-pdf-flexible.jpg` |

Introens gamle skærmbillede indeholdt også en bagvedliggende appvisning med eksempeldata. Hele illustrationen er erstattet. Der er ikke lagt CSS-felter over eksisterende priser og ikke tilføjet sløring. De nye billeder er optagelser af en særskilt marketingmockup, hvor talværdierne slet ikke indgår.

Den oprindelige produktillustrations struktur, mørkegrønne ramme, orange handlinger, lyse kort og typografi er videreført. Arbejdsopgaver, materialer, faggrupper og godkendelsesstatus er fortsat synlige.

Historiske `tilbud-*.png`, `*-v2.jpg`, `*-v3.jpg` og `trin-2-tilpas-tilbuddet.png` er ikke længere refereret fra de offentlige sider. Genbrug dem ikke uden en tilsvarende udskiftning af pris- og tidsdata. Originalerne er bevaret i projektet; aktive links peger på de nye filer med særskilte navne, så cache ikke fastholder de gamle billeder.

## Kilde og afgrænsning

Illustrationerne genereres fra `src/app/shared/marketing/marketing-product-preview.component.*`. Denne komponent er særskilt fra appens rigtige `OfferPreview`, projektside, PDF-generator og beregninger. Den bruges kun som kilde til marketingbilleder og er ikke forbundet til databasen.

Ved optagelse bruges en midlertidig lokal route med `mode=intro`, `mode=work` eller `mode=offer` og valgfrit en fag-side som eksempeldata. Capturerouten fjernes igen inden produktionsbuild. Layoutets billedrammer, demo-dialog, mobil-/desktop-breakpoints og link til illustrationer i fuld størrelse bevares.

Kontrol: gennemgå de offentlige sider og alle demo-trin på mobil og desktop, kør `npm run build`, og kør derefter `node scripts/check-marketing-examples.mjs`.
