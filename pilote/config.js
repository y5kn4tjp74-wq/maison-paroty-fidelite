// Réglages du site pilote. Seule chose à remplir : GUICHET_URL (l'adresse qui finit par /exec).
window.CONFIG = {
  GUICHET_URL: "",            // ex : "https://script.google.com/macros/s/XXXXXXXX/exec"
  MAGASIN: "kiosque",         // doit exister dans Réglages > magasins du Sheets
  SEUIL: 11,                  // même valeur que Réglages > seuil (sert à l'écran d'inscription, avant la 1re réponse)
  CLE_STOCKAGE: "mp_fidelite_kiosque",
  DELAI_MS: 20000
};
