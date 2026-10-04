/**
 * GUICHET — Maison Paroty Fidélité V1
 *
 * Script Google (Apps Script) lié au Google Sheets pilote.
 * Le site n'écrit jamais dans le Sheets : il envoie une demande ici, ce script
 * applique les règles, écrit, et répond en JSON. Il ne renvoie jamais de liste de clients.
 *
 * Actions autorisées (liste fermée) : inscrire, scanner, recuperer, utiliser_recompense.
 *
 * Mise en place : voir README.md (fonction installer(), puis déploiement en application web).
 */

// ───────────────────────── Constantes ─────────────────────────

var FUSEAU = 'Europe/Paris';
var ACTIONS = ['inscrire', 'scanner', 'recuperer', 'utiliser_recompense'];
var DELAI_VERROU_MS = 10000;

var ONGLET = {
  clients: 'Clients',
  passages: 'Passages',
  recompenses: 'Récompenses',
  reglages: 'Réglages',
  tickets: 'Tickets',
  speciaux: 'Jours spéciaux',
  bord: 'Tableau de bord'
};

// Colonnes de l'onglet Clients (index à partir de 0)
var C = {
  id: 0, tel: 1, prenom: 2, prenomNorm: 3, magasin: 4, inscription: 5,
  smsOui: 6, smsDate: 7, smsTexte: 8, passages: 9, attente: 10,
  total: 11, dernierJour: 12, echecs: 13, bloqueJusqua: 14
};
var ENTETE_CLIENTS = [
  'id', 'telephone', 'prenom', 'prenom_normalise', 'magasin', 'date_inscription',
  'consentement_sms', 'date_consentement_sms', 'texte_consentement_sms',
  'passages', 'recompense_en_attente', 'passages_total', 'dernier_passage_jour',
  'echecs_recuperation', 'bloque_jusqua'
];
var ENTETE_PASSAGES = ['date_heure', 'jour', 'id_client', 'magasin', 'statut', 'motif'];
var ENTETE_RECOMPENSES = ['id_client', 'magasin', 'date_deblocage', 'date_utilisation', 'recompense', 'cout_de_revient'];
var ENTETE_TICKETS = ['date (AAAA-MM-JJ)', 'magasin', 'nombre_de_tickets'];
var ENTETE_SPECIAUX = ['date (AAAA-MM-JJ)', 'magasin', 'motif'];

// Valeurs par défaut des Réglages (le patron les change dans le Sheets, sans toucher au code)
var REGLAGES_DEFAUT = [
  ['recompense', 'pizza offerte', 'Nom de la récompense affiché et enregistré'],
  ['cout_de_revient', 0, 'Coût de revient en euros (à saisir)'],
  ['seuil', 11, 'Nombre de passages pour débloquer la récompense'],
  ['plafond_inscriptions_heure', 40, 'Inscriptions maximum par heure (tous magasins)'],
  ['plafond_scans_heure', 200, 'Scans maximum par heure (tous magasins)'],
  ['echecs_recuperation_max', 5, 'Mauvais prénoms avant blocage'],
  ['blocage_minutes', 60, 'Durée du blocage en minutes'],
  ['magasins', 'kiosque,theatre', 'Magasins autorisés, séparés par des virgules'],
  ['alertes_destinataires', '', 'Adresses mail pour l\'alerte du soir (séparées par des virgules)'],
  ['dossier_sauvegarde', 'Sauvegardes fidélité', 'Nom du dossier Drive pour les copies nocturnes'],
  ['conservation_mois', 12, 'Mois sans passage avant purge']
];

// Horloge remplaçable pour les tests
var _horloge = null;
function maintenant_() { return _horloge ? new Date(_horloge) : new Date(); }

// ───────────────────────── Points d'entrée web ─────────────────────────

function doGet() {
  return json_({ statut: 'ok', service: 'guichet' });
}

function doPost(e) {
  var verrou = LockService.getScriptLock();
  var verrouObtenu = false;
  try {
    var demande = lireDemande_(e);
    if (demande.erreur) { return json_(demande.erreur); }

    var reglages = lireReglages_();
    var invalide = valider_(demande.d, reglages);
    if (invalide) { return json_(invalide); }

    verrouObtenu = verrou.tryLock(DELAI_VERROU_MS);
    if (!verrouObtenu) {
      return json_({ statut: 'occupe', message: 'Réessayez dans un instant.' });
    }

    var d = demande.d;
    if (d.action === 'inscrire') { return json_(inscrire_(d, reglages)); }
    if (d.action === 'scanner') { return json_(scanner_(d, reglages)); }
    if (d.action === 'recuperer') { return json_(recuperer_(d, reglages)); }
    return json_(utiliserRecompense_(d, reglages));
  } catch (err) {
    console.error(err && err.stack ? err.stack : String(err));
    return json_({
      statut: 'erreur',
      message: 'Un souci technique a empêché d\'enregistrer votre passage. Réessayez dans un instant ou signalez-le en caisse.'
    });
  } finally {
    if (verrouObtenu) { verrou.releaseLock(); }
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ───────────────────────── Lecture et validation de la demande ─────────────────────────

function lireDemande_(e) {
  var brut = e && e.postData && e.postData.contents;
  if (!brut || brut.length > 4000) {
    return { erreur: { statut: 'erreur_validation', message: 'Demande incomplète.' } };
  }
  var d;
  try { d = JSON.parse(brut); } catch (x) {
    return { erreur: { statut: 'erreur_validation', message: 'Demande incomplète.' } };
  }
  if (!d || typeof d !== 'object' || Array.isArray(d)) {
    return { erreur: { statut: 'erreur_validation', message: 'Demande incomplète.' } };
  }
  return { d: d };
}

function valider_(d, reglages) {
  if (ACTIONS.indexOf(d.action) === -1) {
    return { statut: 'erreur_validation', message: 'Demande non reconnue.' };
  }
  var magasins = listeMagasins_(reglages);
  if (typeof d.magasin !== 'string' || magasins.indexOf(d.magasin) === -1) {
    return { statut: 'erreur_validation', message: 'Demande non reconnue.' };
  }

  if (d.action === 'inscrire' || d.action === 'recuperer') {
    var prenom = nettoyerPrenom_(d.prenom);
    if (!prenom) {
      return { statut: 'erreur_validation', message: 'Indiquez votre prénom.' };
    }
    if (!PRENOM_OK.test(prenom)) {
      return { statut: 'erreur_validation', message: 'Ce prénom semble incorrect. Utilisez seulement des lettres.' };
    }
    if (!normaliserTelephone_(d.telephone)) {
      return {
        statut: 'erreur_validation',
        message: 'Ce numéro semble incomplet. Vérifiez-le (10 chiffres, ex : 06 12 34 56 78).'
      };
    }
  } else {
    if (typeof d.identifiant !== 'string' || !/^[A-Za-z0-9\-]{8,64}$/.test(d.identifiant)) {
      return { statut: 'client_inconnu', message: 'Carte introuvable. Créez-la en quelques secondes.' };
    }
  }
  return null;
}

var PRENOM_OK = /^[A-Za-zÀ-ÖØ-öø-ÿŒœ][A-Za-zÀ-ÖØ-öø-ÿŒœ'’ \-]{0,29}$/;

function nettoyerPrenom_(p) {
  if (typeof p !== 'string') { return ''; }
  return p.replace(/\s+/g, ' ').trim();
}

function normaliserPrenom_(p) {
  return String(p).replace(/œ/gi, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normaliserTelephone_(t) {
  if (typeof t !== 'string' && typeof t !== 'number') { return null; }
  var n = String(t).replace(/[\s.\-()]/g, '');
  if (n.indexOf('+33') === 0) { n = '0' + n.slice(3); }
  else if (n.indexOf('0033') === 0) { n = '0' + n.slice(4); }
  if (!/^0[67]\d{8}$/.test(n)) { return null; }
  return '+33' + n.slice(1);
}

// Toute valeur écrite dans le Sheets qui commence par = + - @ est neutralisée.
function neutre_(v) {
  if (typeof v !== 'string') { return v; }
  return v.replace(/^[=+\-@\s]+/, '');
}

function listeMagasins_(reglages) {
  return String(reglages.magasins).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

// ───────────────────────── Actions ─────────────────────────

function inscrire_(d, reglages) {
  if (!compteurHoraire_('inscriptions', Number(reglages.plafond_inscriptions_heure))) {
    return plafond_();
  }
  var tel = normaliserTelephone_(d.telephone);
  var prenom = nettoyerPrenom_(d.prenom);
  var clients = lireClients_();
  if (clients.parTel[tel] !== undefined) {
    return { statut: 'numero_connu', message: 'Ce numéro a déjà une carte. Retrouvez-la avec votre prénom.' };
  }

  var maintenant = maintenant_();
  var sms = d.consentementSms === true;
  var ligne = [];
  ligne[C.id] = Utilities.getUuid();
  ligne[C.tel] = tel;
  ligne[C.prenom] = neutre_(prenom);
  ligne[C.prenomNorm] = normaliserPrenom_(prenom);
  ligne[C.magasin] = d.magasin;
  ligne[C.inscription] = horodatage_(maintenant);
  ligne[C.smsOui] = sms ? 'oui' : 'non';
  ligne[C.smsDate] = sms ? horodatage_(maintenant) : '';
  ligne[C.smsTexte] = sms ? neutre_(String(d.texteConsentementSms || '').slice(0, 300)) : '';
  ligne[C.passages] = 0;
  ligne[C.attente] = false;
  ligne[C.total] = 0;
  ligne[C.dernierJour] = '';
  ligne[C.echecs] = 0;
  ligne[C.bloqueJusqua] = '';

  var feuille = onglet_(ONGLET.clients);
  var numero = Math.max(feuille.getLastRow(), 1) + 1;
  feuille.getRange(numero, 1, 1, ligne.length).setValues([ligne]);

  var client = { numero: numero, ligne: ligne };
  var r;
  try {
    r = compterPassage_(client, d.magasin, reglages, maintenant);
  } catch (err) {
    // Inscription à moitié faite : on retire la carte pour ne pas laisser un client sans passage.
    try { feuille.deleteRow(numero); } catch (x) { /* rien de plus à faire */ }
    throw err;
  }
  r.identifiant = ligne[C.id];
  r.prenom = ligne[C.prenom];
  r.nouveau = true;
  return r;
}

function scanner_(d, reglages) {
  if (!compteurHoraire_('scans', Number(reglages.plafond_scans_heure))) {
    return plafond_();
  }
  var clients = lireClients_();
  var idx = clients.parId[d.identifiant];
  if (idx === undefined) {
    journaliserPassage_(maintenant_(), '', d.magasin, 'refuse_inconnu', 'identifiant inconnu');
    return { statut: 'client_inconnu', message: 'Carte introuvable. Créez-la en quelques secondes.' };
  }
  var client = clients.liste[idx];
  var r = compterPassage_(client, d.magasin, reglages, maintenant_());
  r.prenom = client.ligne[C.prenom];
  return r;
}

function recuperer_(d, reglages) {
  if (!compteurHoraire_('scans', Number(reglages.plafond_scans_heure))) {
    return plafond_();
  }
  var tel = normaliserTelephone_(d.telephone);
  var clients = lireClients_();
  var idx = clients.parTel[tel];
  if (idx === undefined) {
    return { statut: 'client_inconnu', message: 'Aucune carte avec ce numéro. Créez-la en quelques secondes.' };
  }
  var client = clients.liste[idx];
  var maintenant = maintenant_();
  var max = Number(reglages.echecs_recuperation_max);
  var blocage = Number(reglages.blocage_minutes);

  var jusqua = Number(client.ligne[C.bloqueJusqua]) || 0;
  if (jusqua > maintenant.getTime()) {
    return blocageReponse_(jusqua, maintenant);
  }

  if (normaliserPrenom_(nettoyerPrenom_(d.prenom)) !== client.ligne[C.prenomNorm]) {
    var echecs = (Number(client.ligne[C.echecs]) || 0) + 1;
    if (echecs >= max) {
      var fin = maintenant.getTime() + blocage * 60000;
      client.ligne[C.echecs] = 0;
      client.ligne[C.bloqueJusqua] = fin;
      ecrireClient_(client);
      return blocageReponse_(fin, maintenant);
    }
    client.ligne[C.echecs] = echecs;
    ecrireClient_(client);
    return {
      statut: 'erreur_validation',
      message: 'Ce numéro est déjà utilisé avec un autre prénom. Demandez de l\'aide en caisse.',
      echecs_restants: max - echecs
    };
  }

  client.ligne[C.echecs] = 0;
  client.ligne[C.bloqueJusqua] = '';
  var r = compterPassage_(client, d.magasin, reglages, maintenant);
  r.identifiant = client.ligne[C.id];
  r.prenom = client.ligne[C.prenom];
  r.recupere = true;
  return r;
}

function utiliserRecompense_(d, reglages) {
  var clients = lireClients_();
  var idx = clients.parId[d.identifiant];
  if (idx === undefined) {
    return { statut: 'client_inconnu', message: 'Carte introuvable. Créez-la en quelques secondes.' };
  }
  var client = clients.liste[idx];
  if (client.ligne[C.attente] !== true) {
    return {
      statut: 'erreur_validation',
      message: 'Aucune récompense à utiliser pour le moment.',
      passages: Number(client.ligne[C.passages]) || 0,
      seuil: Number(reglages.seuil),
      recompense_en_attente: false
    };
  }

  var maintenant = maintenant_();
  var feuille = onglet_(ONGLET.recompenses);
  var n = feuille.getLastRow();
  var ligneRec = 0;
  if (n >= 2) {
    var vals = feuille.getRange(2, 1, n - 1, 6).getValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      if (vals[i][0] === client.ligne[C.id] && vals[i][3] === '') { ligneRec = i + 2; break; }
    }
  }
  var nom = reglages.recompense;
  var cout = Number(reglages.cout_de_revient) || 0;
  if (ligneRec) {
    feuille.getRange(ligneRec, 4, 1, 3).setValues([[horodatage_(maintenant), nom, cout]]);
  } else {
    feuille.getRange(Math.max(n, 1) + 1, 1, 1, 6).setValues([[
      client.ligne[C.id], d.magasin, '', horodatage_(maintenant), nom, cout
    ]]);
  }

  client.ligne[C.passages] = 0;
  client.ligne[C.attente] = false;
  // La pizza offerte n'est pas un achat : elle ne compte pas comme passage ce jour-là.
  client.ligne[C.dernierJour] = jourParis_(maintenant);
  ecrireClient_(client);

  return {
    statut: 'ok',
    message: 'Récompense utilisée.',
    passages: 0,
    seuil: Number(reglages.seuil),
    recompense_en_attente: false,
    prenom: client.ligne[C.prenom],
    validation_jour: Utilities.formatDate(maintenant, FUSEAU, 'dd/MM'),
    validation_heure: Utilities.formatDate(maintenant, FUSEAU, "HH'h'mm"),
    validation_iso: Utilities.formatDate(maintenant, FUSEAU, "yyyy-MM-dd'T'HH:mm:ssXXX")
  };
}

// Règle commune : 1 passage par jour, récompense en attente, déblocage au seuil.
function compterPassage_(client, magasin, reglages, maintenant) {
  var seuil = Number(reglages.seuil);
  var jour = jourParis_(maintenant);
  var l = client.ligne;
  var id = l[C.id];

  if (l[C.attente] === true) {
    ecrireClient_(client);
    journaliserPassage_(maintenant, id, magasin, 'refuse_recompense_en_attente', 'récompense à utiliser');
    return reponseCarte_('recompense_debloquee', 'Votre récompense vous attend.', l, seuil);
  }

  if (jourStr_(l[C.dernierJour]) === jour) {
    ecrireClient_(client);
    journaliserPassage_(maintenant, id, magasin, 'refuse_meme_jour', 'déjà compté aujourd\'hui');
    return reponseCarte_('deja_compte', 'Votre passage du jour est bien enregistré.', l, seuil);
  }

  l[C.passages] = (Number(l[C.passages]) || 0) + 1;
  l[C.total] = (Number(l[C.total]) || 0) + 1;
  l[C.dernierJour] = jour;
  var debloque = l[C.passages] >= seuil;
  if (debloque) { l[C.attente] = true; }
  ecrireClient_(client);
  journaliserPassage_(maintenant, id, magasin, 'compte', '');

  if (debloque) {
    var rec = onglet_(ONGLET.recompenses);
    rec.getRange(Math.max(rec.getLastRow(), 1) + 1, 1, 1, 6).setValues([[
      id, magasin, horodatage_(maintenant), '', '', ''
    ]]);
    var r = reponseCarte_('recompense_debloquee', 'Récompense débloquée !', l, seuil);
    r.nouvelle_recompense = true; // le site la fête (vibration) seulement à ce moment-là
    return r;
  }
  return reponseCarte_('ok', 'Passage enregistré.', l, seuil);
}

function reponseCarte_(statut, message, l, seuil) {
  return {
    statut: statut,
    message: message,
    passages: Number(l[C.passages]) || 0,
    seuil: seuil,
    recompense_en_attente: l[C.attente] === true
  };
}

function plafond_() {
  return { statut: 'plafond', message: 'Service très sollicité, réessayez dans quelques minutes.' };
}

function blocageReponse_(jusqua, maintenant) {
  var minutes = Math.max(1, Math.ceil((jusqua - maintenant.getTime()) / 60000));
  return {
    statut: 'bloque_recuperation',
    message: 'Trop d\'essais. Réessayez dans une heure ou demandez de l\'aide en caisse.',
    minutes_restantes: minutes
  };
}

// ───────────────────────── Plafonds par heure ─────────────────────────

// Compteur par heure (heure de Paris). Appelé sous verrou ou presque : l'erreur éventuelle est tolérée.
function compteurHoraire_(nom, plafond) {
  var cache = CacheService.getScriptCache();
  var cle = 'cpt_' + nom + '_' + Utilities.formatDate(maintenant_(), FUSEAU, 'yyyyMMddHH');
  var n = Number(cache.get(cle)) || 0;
  if (plafond > 0 && n >= plafond) { return false; }
  cache.put(cle, String(n + 1), 7200);
  return true;
}

// ───────────────────────── Accès au Sheets ─────────────────────────

function onglet_(nom) {
  var f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nom);
  if (!f) { throw new Error('Onglet manquant : ' + nom); }
  return f;
}

function lireReglages_() {
  var r = {};
  REGLAGES_DEFAUT.forEach(function (x) { r[x[0]] = x[1]; });
  var feuille = onglet_(ONGLET.reglages);
  var n = feuille.getLastRow();
  if (n >= 2) {
    feuille.getRange(2, 1, n - 1, 2).getValues().forEach(function (v) {
      if (v[0] !== '' && v[1] !== '') { r[String(v[0]).trim()] = v[1]; }
    });
  }
  return r;
}

function lireClients_() {
  var feuille = onglet_(ONGLET.clients);
  var n = feuille.getLastRow();
  var res = { liste: [], parId: {}, parTel: {} };
  if (n < 2) { return res; }
  var vals = feuille.getRange(2, 1, n - 1, ENTETE_CLIENTS.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    var ligne = vals[i];
    ligne[C.tel] = String(ligne[C.tel]);
    ligne[C.attente] = ligne[C.attente] === true || String(ligne[C.attente]).toUpperCase() === 'TRUE';
    res.liste.push({ numero: i + 2, ligne: ligne });
    res.parId[ligne[C.id]] = i;
    res.parTel[ligne[C.tel]] = i;
  }
  return res;
}

function ecrireClient_(client) {
  onglet_(ONGLET.clients).getRange(client.numero, 1, 1, ENTETE_CLIENTS.length).setValues([client.ligne]);
}

function journaliserPassage_(date, idClient, magasin, statut, motif) {
  var f = onglet_(ONGLET.passages);
  f.getRange(Math.max(f.getLastRow(), 1) + 1, 1, 1, 6).setValues([[
    horodatage_(date), jourParis_(date), idClient, magasin, statut, motif
  ]]);
}

function horodatage_(date) { return Utilities.formatDate(date, FUSEAU, 'yyyy-MM-dd HH:mm:ss'); }
function jourParis_(date) { return Utilities.formatDate(date, FUSEAU, 'yyyy-MM-dd'); }
function jourStr_(v) {
  if (v instanceof Date) { return jourParis_(v); }
  return String(v || '');
}

// ───────────────────────── Installation du Sheets ─────────────────────────

/** À lancer une seule fois depuis l'éditeur : crée les onglets, les réglages et le tableau de bord. */
function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(FUSEAU);

  creerOnglet_(ss, ONGLET.clients, ENTETE_CLIENTS, [C.tel, C.prenomNorm, C.inscription, C.smsDate, C.dernierJour]);
  creerOnglet_(ss, ONGLET.passages, ENTETE_PASSAGES, [0, 1]);
  creerOnglet_(ss, ONGLET.recompenses, ENTETE_RECOMPENSES, [2, 3]);
  creerOnglet_(ss, ONGLET.tickets, ENTETE_TICKETS, [0]);
  creerOnglet_(ss, ONGLET.speciaux, ENTETE_SPECIAUX, [0]);

  var reg = ss.getSheetByName(ONGLET.reglages) || ss.insertSheet(ONGLET.reglages);
  if (reg.getLastRow() < 1) {
    reg.getRange(1, 1, 1, 3).setValues([['reglage', 'valeur', 'explication']]).setFontWeight('bold');
    reg.getRange(2, 1, REGLAGES_DEFAUT.length, 3).setValues(REGLAGES_DEFAUT);
    reg.setColumnWidth(1, 230); reg.setColumnWidth(2, 220); reg.setColumnWidth(3, 420);
    reg.setFrozenRows(1);
  }

  var bord = ss.getSheetByName(ONGLET.bord) || ss.insertSheet(ONGLET.bord);
  construireTableauDeBord_(bord);

  var vide = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (vide && ss.getSheets().length > 1 && vide.getLastRow() === 0) { ss.deleteSheet(vide); }
}

function creerOnglet_(ss, nom, entete, colonnesTexte) {
  var f = ss.getSheetByName(nom) || ss.insertSheet(nom);
  colonnesTexte.forEach(function (c) { f.getRange(1, c + 1, f.getMaxRows(), 1).setNumberFormat('@'); });
  if (f.getLastRow() < 1) {
    f.getRange(1, 1, 1, entete.length).setValues([entete]).setFontWeight('bold');
    f.setFrozenRows(1);
  }
  return f;
}

function construireTableauDeBord_(f) {
  f.clear();
  var lignes = [
    ['Tableau de bord', ''],
    ['', ''],
    ['Magasin (kiosque ou theatre)', 'kiosque'],
    ['', ''],
    ['Inscrits', '=COUNTIF(Clients!E2:E,B3)'],
    ['Passages comptés', '=COUNTIFS(Passages!D2:D,B3,Passages!E2:E,"compte")'],
    ['Tickets saisis (onglet Tickets)', '=SUMIF(Tickets!B2:B,B3,Tickets!C2:C)'],
    ['Passages sur les jours où les tickets sont saisis',
      '=SUMPRODUCT((Tickets!A2:A500<>"")*(Tickets!B2:B500=B3)*COUNTIFS(Passages!B2:B5000,Tickets!A2:A500,Passages!D2:D5000,B3,Passages!E2:E5000,"compte"))'],
    ['Taux de scan', '=IFERROR(B8/B7,0)'],
    ['Clients revenus (au moins 2 passages)', '=COUNTIFS(Clients!E2:E,B3,Clients!L2:L,">=2")'],
    ['Taux de retour', '=IFERROR(B10/B5,0)'],
    ['Récompenses utilisées', '=COUNTIFS(\'Récompenses\'!B2:B,B3,\'Récompenses\'!D2:D,"<>")'],
    ['Coût de revient des récompenses (€)', '=SUMIFS(\'Récompenses\'!F2:F,\'Récompenses\'!B2:B,B3,\'Récompenses\'!D2:D,"<>")'],
    ['Scans refusés', '=COUNTIFS(Passages!D2:D,B3,Passages!E2:E,"refuse*")'],
    ['Consentements SMS', '=COUNTIFS(Clients!E2:E,B3,Clients!G2:G,"oui")']
  ];
  // Les titres en texte (setValue), les formules avec setFormula : cette méthode lit toujours la syntaxe
  // anglaise (virgules), même dans un Sheets en français. setValues, lui, suit la langue du Sheets et échoue.
  lignes.forEach(function (l, i) {
    f.getRange(i + 1, 1).setValue(l[0]);
    if (String(l[1]).charAt(0) === '=') { f.getRange(i + 1, 2).setFormula(l[1]); }
    else { f.getRange(i + 1, 2).setValue(l[1]); }
  });
  f.getRange('A1').setFontWeight('bold').setFontSize(14);
  f.getRange('B9').setNumberFormat('0.0%');
  f.getRange('B11').setNumberFormat('0.0%');
  f.getRange('B13').setNumberFormat('0.00');
  f.setColumnWidth(1, 380); f.setColumnWidth(2, 140);
}

// ───────────────────────── Tâches planifiées ─────────────────────────

/** À lancer une fois depuis le compte du patron : crée les 3 déclencheurs. */
function installerDeclencheurs() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('alerteDuSoir').timeBased().atHour(22).nearMinute(30).everyDays(1).inTimezone(FUSEAU).create();
  ScriptApp.newTrigger('sauvegardeNocturne').timeBased().atHour(3).everyDays(1).inTimezone(FUSEAU).create();
  ScriptApp.newTrigger('purgeMensuelle').timeBased().onMonthDay(1).atHour(4).inTimezone(FUSEAU).create();
}

/** Mail du soir : chiffres seulement, aucune donnée personnelle. */
function alerteDuSoir() {
  var reglages = lireReglages_();
  var dest = String(reglages.alertes_destinataires || '').trim();
  if (!dest) { return; }
  var aujourdhui = jourParis_(maintenant_());
  var passages = onglet_(ONGLET.passages);
  var n = passages.getLastRow();
  var comptes = 0, refus = 0;
  if (n >= 2) {
    passages.getRange(2, 1, n - 1, 6).getValues().forEach(function (v) {
      if (jourStr_(v[1]) !== aujourdhui) { return; }
      if (v[4] === 'compte') { comptes++; } else { refus++; }
    });
  }
  var clients = lireClients_().liste;
  var inscritsJour = clients.filter(function (c) {
    return String(c.ligne[C.inscription]).indexOf(aujourdhui) === 0;
  }).length;
  var corps = 'Fidélité — ' + aujourdhui + '\n' +
    'Nouvelles inscriptions : ' + inscritsJour + '\n' +
    'Passages comptés : ' + comptes + '\n' +
    'Scans refusés : ' + refus + '\n' +
    'Inscrits au total : ' + clients.length + '\n\n' +
    'Pensez à saisir le nombre de tickets du jour dans l\'onglet Tickets.';
  MailApp.sendEmail(dest, 'Fidélité — chiffres du ' + aujourdhui, corps);
}

/** Copie du Sheets dans le Drive, 30 jours de conservation. */
function sauvegardeNocturne() {
  var reglages = lireReglages_();
  var nomDossier = String(reglages.dossier_sauvegarde);
  var dossiers = DriveApp.getFoldersByName(nomDossier);
  var dossier = dossiers.hasNext() ? dossiers.next() : DriveApp.createFolder(nomDossier);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var copie = DriveApp.getFileById(ss.getId()).makeCopy(ss.getName() + ' — copie ' + jourParis_(maintenant_()), dossier);
  copie.setDescription('Sauvegarde automatique');
  var limite = maintenant_().getTime() - 30 * 86400000;
  var fichiers = dossier.getFiles();
  while (fichiers.hasNext()) {
    var f = fichiers.next();
    if (f.getDateCreated().getTime() < limite) { f.setTrashed(true); }
  }
}

/** Supprime les clients sans passage depuis N mois (12 par défaut) et leurs lignes liées. */
function purgeMensuelle() {
  var reglages = lireReglages_();
  var mois = Number(reglages.conservation_mois) || 12;
  var limite = new Date(maintenant_().getTime());
  limite.setMonth(limite.getMonth() - mois);
  var limiteJour = jourParis_(limite);
  var clients = lireClients_().liste;
  var aSupprimer = {};
  clients.forEach(function (c) {
    var dernier = jourStr_(c.ligne[C.dernierJour]) || String(c.ligne[C.inscription]).slice(0, 10);
    if (dernier && dernier < limiteJour) { aSupprimer[c.ligne[C.id]] = c.numero; }
  });
  supprimerLignes_(ONGLET.passages, 3, aSupprimer);
  supprimerLignes_(ONGLET.recompenses, 1, aSupprimer);
  var numeros = Object.keys(aSupprimer).map(function (k) { return aSupprimer[k]; }).sort(function (a, b) { return b - a; });
  var f = onglet_(ONGLET.clients);
  numeros.forEach(function (n) { f.deleteRow(n); });
}

/** Demande de suppression d'un client (RGPD) : à lancer à la main avec son numéro. */
function supprimerClient(telephone) {
  var tel = normaliserTelephone_(telephone);
  if (!tel) { throw new Error('Numéro invalide'); }
  var clients = lireClients_();
  var idx = clients.parTel[tel];
  if (idx === undefined) { return 'Aucun client avec ce numéro'; }
  var c = clients.liste[idx];
  var cible = {}; cible[c.ligne[C.id]] = c.numero;
  supprimerLignes_(ONGLET.passages, 3, cible);
  supprimerLignes_(ONGLET.recompenses, 1, cible);
  onglet_(ONGLET.clients).deleteRow(c.numero);
  return 'Client supprimé';
}

function supprimerLignes_(nomOnglet, colonneId, ids) {
  var f = onglet_(nomOnglet);
  var n = f.getLastRow();
  if (n < 2) { return; }
  var vals = f.getRange(2, colonneId, n - 1, 1).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    if (ids[vals[i][0]] !== undefined) { f.deleteRow(i + 2); }
  }
}
