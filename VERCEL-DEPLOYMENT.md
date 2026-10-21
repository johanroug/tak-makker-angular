# Vercel: Angular

Repo: `johanroug/tak-makker-angular`.

## Opsætning

1. Åbn det eksisterende projekt i Vercel → Settings → Git. Forbind Angular-repoet i stedet for det gamle React-repo.
2. Kontrollér Root Directory: repoets rod (ingen undermappe).
3. Vælg Node.js 24.x under Build and Deployment. Angular CLI kræver mindst Node 24.15 inden for denne hovedversion.
4. `vercel.json` angiver Angular, `npm ci`, `npm run build`, output `dist/tak-makker-angular/browser` og fallback til `index.html` for undersider.
5. Commit og push de ønskede ændringer, før en deployment sættes i gang. Kontrollér deploymentens Git-repo og commit.

## Supabase

Angular læser URL og den offentlige publishable key fra `src/environments/environment.ts`. Der er derfor ingen påkrævede Vercel-miljøvariabler til den nuværende frontend. React-variabler med eksempelvis `VITE_` læses ikke af Angular.

AI-nøgler og service-role-nøgler hører fortsat til i Supabase Edge Function secrets, ikke i frontend. Vercel deployer ikke Supabase-funktioner eller migrationer.

## Kontrol af deployment

- Login og logout.
- Åbn og genindlæs `/projects`, et projekt, `/company-profile` og et tilbud direkte.
- Kontrollér, at JS, CSS og logoer indlæses korrekt.
- Send en AI-besked, redigér en linje, genindlæs og kontrollér gemningen.
- Download PDF fra et eksisterende tilbud.
- Kontrollér domænet og eventuelle Supabase Auth redirect-URL'er, hvis der bruges mailbaserede login- eller nulstillingslinks.

Lokal buildkontrol bekræfter kun buildet. Vercels repo-forbindelse, domæne og routing skal også kontrolleres på den faktiske deployment.
