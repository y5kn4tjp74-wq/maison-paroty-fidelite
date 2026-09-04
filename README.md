# Maison Paroty — Fidélité

Prototype landing page + dashboard fidélité Maison Paroty.

**Stack :** React + Vite + Tailwind CSS + Recharts + React Router.

## Fonctionnalités

### Landing page (`/`)
- Header Maison Paroty
- QR codes des 3 magasins (Sud, Théâtre, Centre) générés côté client
- Statistiques en direct (scans, inscriptions) lues depuis un Google Sheet public,
  avec repli automatique sur des données de démonstration si le Sheet n'est pas
  configuré ou injoignable
- Design responsive

### Dashboard privé (`/dashboard`)
- Connexion simple (`manager` / `demo123`) — session stockée en `sessionStorage`,
  volontairement basique pour ce prototype
- Vue d'ensemble des 3 magasins (scans / inscriptions sur 7 jours + tendance)
- Graphiques de progression sur 7 ou 30 jours, par scans ou inscriptions
- Alerte automatique en cas de baisse de fréquentation (> 10 % sur 7 jours vs.
  semaine précédente)
- Export du tableau de bord en PDF (bonus)

## Démarrage

```bash
npm install
npm run dev
```

## Connecter un Google Sheet (optionnel)

Sans configuration, l'app utilise des données de démonstration générées
localement. Pour brancher un vrai Google Sheet :

1. Créez un Sheet avec un onglet contenant les colonnes : `date | store | scans | signups`
   - `date` : `AAAA-MM-JJ`
   - `store` : `sud`, `theatre` ou `centre`
   - `scans`, `signups` : nombres
2. Partagez-le en « Toute personne disposant du lien peut consulter »
3. Copiez `.env.example` vers `.env.local` et renseignez `VITE_GOOGLE_SHEET_ID`
   (et `VITE_GOOGLE_SHEET_GID` si l'onglet n'est pas le premier)

## Build & déploiement (Vercel)

```bash
npm run build
```

Le projet est prêt pour Vercel (détection automatique Vite + `vercel.json`
pour le routage côté client). Pensez à renseigner les variables d'environnement
`VITE_GOOGLE_SHEET_ID` / `VITE_GOOGLE_SHEET_GID` dans les paramètres du projet
Vercel si vous utilisez un Google Sheet réel.

---

Ceci est un prototype : l'authentification et le stockage de session sont
volontairement simplifiés et ne doivent pas être utilisés tels quels en
production.
