// ============================================================================
// DONNÉES DE DÉMONSTRATION — Maison Paroty
// ----------------------------------------------------------------------------
// Toutes les données fictives du site sont centralisées ici. Rien n'est
// connecté à une base réelle : c'est un support de présentation.
//
// AVANT LA MISE EN PRODUCTION : remplacer chaque bloc marqué
// "À REMPLACER" par les vraies données de l'entreprise.
// ============================================================================

// À REMPLACER : noms et adresses réels des 3 points de vente.
export const magasins = [
  { id: 'dijon-centre', nom: 'Dijon Centre', ville: 'Dijon' },
  { id: 'dijon-fontaine', nom: 'Dijon Fontaine-d\'Ouche', ville: 'Dijon' },
  { id: 'vesoul', nom: 'Vesoul', ville: 'Haute-Saône' },
]

// À REMPLACER : répartition réelle des inscrits par magasin, une fois le
// dispositif en place (issue du tableau de bord réel, pas de cette maquette).
export const inscritsParMagasin = [
  { magasin: 'Dijon Centre', inscrits: 95 },
  { magasin: 'Dijon Fontaine-d\'Ouche', inscrits: 50 },
  { magasin: 'Vesoul', inscrits: 35 },
]

export const totalInscrits = inscritsParMagasin.reduce((somme, m) => somme + m.inscrits, 0)

// À REMPLACER : courbe réelle des inscriptions cumulées, semaine par semaine.
export const evolutionInscriptions = [
  { semaine: 'S1', inscrits: 12 },
  { semaine: 'S2', inscrits: 34 },
  { semaine: 'S3', inscrits: 61 },
  { semaine: 'S4', inscrits: 92 },
  { semaine: 'S5', inscrits: 124 },
  { semaine: 'S6', inscrits: 149 },
  { semaine: 'S7', inscrits: 167 },
  { semaine: 'S8', inscrits: 180 },
]

// À REMPLACER : taux de retour réel (part des inscrits revenus au moins une
// fois après leur inscription).
export const tauxDeRetour = 42

// À REMPLACER : fréquentation réelle par jour de semaine (nombre moyen de
// passages enregistrés via QR code).
export const frequentationParJour = [
  { jour: 'Lun', passages: 38 },
  { jour: 'Mar', passages: 41 },
  { jour: 'Mer', passages: 52 },
  { jour: 'Jeu', passages: 47 },
  { jour: 'Ven', passages: 68 },
  { jour: 'Sam', passages: 121 },
  { jour: 'Dim', passages: 29 },
]

// À REMPLACER : nombre réel de clients inactifs depuis 3 semaines — c'est
// l'indicateur qui n'existe pas avec les cartes papier.
export const clientsInactifs = {
  nombre: 23,
  depuisSemaines: 3,
}

// ----------------------------------------------------------------------------
// Comparatif économique
// ----------------------------------------------------------------------------
// IMPORTANT : le coût du dispositif papier est une ESTIMATION construite sur
// des ordres de grandeur de commerces comparables (temps de gestion, impression
// et réassort des cartes, pertes/erreurs de tamponnage), PAS sur la
// comptabilité réelle de Maison Paroty. À confronter aux chiffres réels avant
// toute décision. Ne pas ajouter de projection de chiffre d'affaires : la
// démonstration repose uniquement sur l'économie de coût, qui est certaine.

// À REMPLACER : investissement et coût d'exploitation réels une fois négociés.
export const coutNumerique = {
  investissementInitial: 3500,
  exploitationMensuelle: 25,
}

// À REMPLACER : estimation à confronter aux chiffres réels de Maison Paroty.
export const coutPapierMensuelEstime = 736

const MOIS_TOTAL = 36

function genererCoutsCumules() {
  const points = []
  for (let mois = 0; mois <= MOIS_TOTAL; mois++) {
    const papier = coutPapierMensuelEstime * mois
    const numerique =
      mois === 0
        ? coutNumerique.investissementInitial
        : coutNumerique.investissementInitial + coutNumerique.exploitationMensuelle * mois
    points.push({ mois, papier, numerique })
  }
  return points
}

// Coût cumulé sur 36 mois, calculé à partir des hypothèses ci-dessus.
export const coutsCumules36Mois = genererCoutsCumules()

// Mois approximatif où la courbe numérique repasse sous la courbe papier.
export const moisDeCroisement = coutsCumules36Mois.find(
  (point) => point.mois > 0 && point.numerique < point.papier,
)?.mois ?? null

// ----------------------------------------------------------------------------
// Déploiement en trois phases
// ----------------------------------------------------------------------------
export const phasesDeploiement = [
  {
    numero: 1,
    titre: 'Mise en place technique',
    description:
      "QR codes imprimés pour chaque magasin, tableau de bord configuré, formation des équipes en caisse (5 minutes par personne).",
    statut: 'déjà réalisé',
    cout: 0,
  },
  {
    numero: 2,
    titre: 'Pilote sur un seul magasin',
    description: 'Test en conditions réelles pendant 3 à 4 semaines, sur un seul point de vente. Aucun engagement au-delà.',
    statut: 'à venir',
    cout: 0,
  },
  {
    numero: 3,
    titre: 'Généralisation aux 3 magasins',
    description: "Déploiement sur l'ensemble du réseau, uniquement après avoir vu les résultats du pilote.",
    statut: 'à venir',
    cout: 3500,
  },
]

// ----------------------------------------------------------------------------
// Démo interactive — carte de fidélité
// ----------------------------------------------------------------------------
export const PASSAGES_POUR_RECOMPENSE = 10
export const RECOMPENSE = 'une baguette offerte'
