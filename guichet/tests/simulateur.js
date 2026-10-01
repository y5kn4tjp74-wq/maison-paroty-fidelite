// Faux Google (Sheets, verrou, cache...) pour tester le guichet sans compte Google.
// Lancer : node guichet/tests/simulateur.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ── Faux Google ──────────────────────────────────────────────
function fauxFormat(date, tz, motif) {
  const p = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).forEach(x => { p[x.type] = x.value; });
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const decal = Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const signe = decal >= 0 ? '+' : '-';
  const d = Math.abs(decal);
  const xxx = signe + String(Math.floor(d / 60)).padStart(2, '0') + ':' + String(d % 60).padStart(2, '0');
  return motif.replace(/'([^']*)'|yyyy|MM|dd|HH|mm|ss|XXX/g, (m, lit) => {
    if (lit !== undefined) return lit;
    return ({ yyyy: p.year, MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second, XXX: xxx })[m];
  });
}

class Plage {
  constructor(f, r, c, nr, nc) { this.f = f; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const l = [];
      for (let j = 0; j < this.nc; j++) {
        const v = (this.f.g[this.r - 1 + i] || [])[this.c - 1 + j];
        l.push(v === undefined ? '' : v);
      }
      out.push(l);
    }
    return out;
  }
  setValues(vals) {
    vals.forEach((l, i) => l.forEach((v, j) => {
      const R = this.r - 1 + i;
      this.f.g[R] = this.f.g[R] || [];
      this.f.g[R][this.c - 1 + j] = v === undefined ? '' : v;
    }));
    return this;
  }
  setFormulas(vals) { return this.setValues(vals); }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
  setFontSize() { return this; }
}
class Feuille {
  constructor(nom) { this.nom = nom; this.g = []; }
  getLastRow() {
    let n = 0;
    this.g.forEach((l, i) => { if (l && l.some(v => v !== '' && v !== undefined)) n = i + 1; });
    return n;
  }
  getMaxRows() { return 1000; }
  getRange(r, c, nr, nc) {
    if (typeof r === 'string') return new Plage(this, 1, 1, 1, 1);
    return new Plage(this, r, c, nr || 1, nc || 1);
  }
  deleteRow(n) { this.g.splice(n - 1, 1); }
  clear() { this.g = []; }
  setColumnWidth() {}
  setFrozenRows() {}
}
function nouvelEnvironnement() {
  const feuilles = {};
  const ss = {
    getSheetByName: n => feuilles[n] || null,
    insertSheet: n => (feuilles[n] = new Feuille(n)),
    getSheets: () => Object.values(feuilles),
    deleteSheet: () => {},
    setSpreadsheetTimeZone: () => {},
    getId: () => 'id', getName: () => 'Fidélité'
  };
  const cache = new Map();
  let verrouLibre = true;
  let uuid = 0;
  const sandbox = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    LockService: { getScriptLock: () => ({ tryLock: () => verrouLibre, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({
      get: k => (cache.has(k) ? cache.get(k) : null),
      put: (k, v) => cache.set(k, v)
    }) },
    Utilities: { getUuid: () => 'uuid-test-' + String(++uuid).padStart(6, '0'), formatDate: fauxFormat },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: s => ({ contenu: s, setMimeType() { return this; } })
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), sandbox);
  vm.runInContext('installer()', sandbox);
  return {
    sandbox, feuilles, cache,
    bloquerVerrou: () => { verrouLibre = false; },
    horloge: iso => { sandbox._horloge = iso ? new Date(iso) : null; },
    appeler(obj) {
      const brut = typeof obj === 'string' ? obj : JSON.stringify(obj);
      const r = sandbox.doPost({ postData: { contents: brut } });
      return JSON.parse(r.contenu);
    },
    lignes: nom => feuilles[nom].g.slice(1).filter(l => l && l.length)
  };
}

// ── Tests ────────────────────────────────────────────────────
let ok = 0;
function test(nom, fn) {
  try { fn(); ok++; console.log('  ok  ' + nom); }
  catch (e) { console.log('  RATÉ  ' + nom + '\n        ' + e.message); process.exitCode = 1; }
}
const K = 'kiosque';
const jour = n => `2026-10-${String(7 + n).padStart(2, '0')}T19:30:00+02:00`;
const insc = (env, extra) => env.appeler(Object.assign(
  { action: 'inscrire', magasin: K, prenom: 'Maxime', telephone: '06 12 34 56 78' }, extra));

console.log('\nInscription');
test('nouveau numéro : carte créée, 1er passage', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  const r = insc(e);
  assert.strictEqual(r.statut, 'ok');
  assert.strictEqual(r.passages, 1);
  assert.strictEqual(r.seuil, 11);
  assert.ok(r.identifiant && r.nouveau);
  assert.strictEqual(e.lignes('Clients')[0][1], '+33612345678');
});
test('numéro déjà connu : numero_connu, pas de doublon', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  insc(e);
  assert.strictEqual(insc(e, { prenom: 'Autre' }).statut, 'numero_connu');
  assert.strictEqual(e.lignes('Clients').length, 1);
});
test('formats de numéro acceptés (+33, 0033, points)', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  assert.strictEqual(insc(e, { telephone: '+33 6 12 34 56 78' }).statut, 'ok');
  assert.strictEqual(insc(e, { telephone: '0033712345678', prenom: 'Léa' }).statut, 'ok');
  assert.strictEqual(insc(e, { telephone: '07.12.34.56.79', prenom: 'Zoé' }).statut, 'ok');
});
test('numéro invalide, prénom vide, prénom bizarre', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  assert.strictEqual(insc(e, { telephone: '0512345678' }).statut, 'erreur_validation');
  assert.strictEqual(insc(e, { telephone: '06 12 34' }).statut, 'erreur_validation');
  assert.strictEqual(insc(e, { prenom: '  ' }).message, 'Indiquez votre prénom.');
  assert.strictEqual(insc(e, { prenom: '=1+1' }).statut, 'erreur_validation');
  assert.strictEqual(insc(e, { prenom: '@cmd' }).statut, 'erreur_validation');
  assert.strictEqual(insc(e, { prenom: 'A'.repeat(31) }).statut, 'erreur_validation');
  assert.strictEqual(e.lignes('Clients').length, 0);
});
test('prénoms avec accent, tiret, apostrophe', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  assert.strictEqual(insc(e, { prenom: "Jean-Éloïse d'Arc", telephone: '0611111111' }).statut, 'ok');
});
test('consentement SMS : coché → oui + date + texte ; décoché → non, vide', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  insc(e, { consentementSms: true, texteConsentementSms: 'Recevoir les offres' });
  insc(e, { telephone: '0699999999', prenom: 'Zoé' });
  const [a, b] = e.lignes('Clients');
  assert.strictEqual(a[6], 'oui'); assert.ok(a[7]); assert.strictEqual(a[8], 'Recevoir les offres');
  assert.strictEqual(b[6], 'non'); assert.strictEqual(b[7], ''); assert.strictEqual(b[8], '');
});
test('texte de consentement commençant par = est neutralisé', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  insc(e, { consentementSms: true, texteConsentementSms: '=HYPERLINK("x")' });
  assert.ok(!/^[=+\-@]/.test(e.lignes('Clients')[0][8]));
});

console.log('\nScan et règle 1 passage par jour');
test('2e scan le même jour : deja_compte, refus journalisé', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  const id = insc(e).identifiant;
  const r = e.appeler({ action: 'scanner', magasin: K, identifiant: id });
  assert.strictEqual(r.statut, 'deja_compte'); assert.strictEqual(r.passages, 1);
  const p = e.lignes('Passages');
  assert.strictEqual(p.length, 2); assert.strictEqual(p[1][4], 'refuse_meme_jour');
});
test('lendemain : passage compté', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  const id = insc(e).identifiant;
  e.horloge(jour(1));
  const r = e.appeler({ action: 'scanner', magasin: K, identifiant: id });
  assert.strictEqual(r.statut, 'ok'); assert.strictEqual(r.passages, 2);
});
test('minuit heure de Paris : 23h59 et 00h01 = deux jours', () => {
  const e = nouvelEnvironnement(); e.horloge('2026-10-07T23:59:00+02:00');
  const id = insc(e).identifiant;
  e.horloge('2026-10-08T00:01:00+02:00');
  assert.strictEqual(e.appeler({ action: 'scanner', magasin: K, identifiant: id }).statut, 'ok');
});
test('21h59 UTC en été/automne = 23h59 Paris, pas le même jour que 22h01 UTC', () => {
  const e = nouvelEnvironnement(); e.horloge('2026-10-07T21:59:00Z'); // 23:59 Paris le 7
  const id = insc(e).identifiant;
  e.horloge('2026-10-07T22:01:00Z'); // 00:01 Paris le 8
  assert.strictEqual(e.appeler({ action: 'scanner', magasin: K, identifiant: id }).statut, 'ok');
});
test('identifiant inconnu : client_inconnu, journalisé', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  const r = e.appeler({ action: 'scanner', magasin: K, identifiant: 'abcdefgh-1234' });
  assert.strictEqual(r.statut, 'client_inconnu');
  assert.strictEqual(e.lignes('Passages')[0][4], 'refuse_inconnu');
});

console.log('\nRécompense (seuil lu dans Réglages)');
function jusquaSeuil(e, seuil) {
  e.horloge(jour(0));
  const id = insc(e).identifiant;
  let r;
  for (let i = 1; i < seuil; i++) { e.horloge(jour(i)); r = e.appeler({ action: 'scanner', magasin: K, identifiant: id }); }
  return { id, r };
}
test('11e passage : récompense débloquée, compteur bloqué à 11/11', () => {
  const e = nouvelEnvironnement();
  const { id, r } = jusquaSeuil(e, 11);
  assert.strictEqual(r.statut, 'recompense_debloquee');
  assert.strictEqual(r.passages, 11); assert.strictEqual(r.recompense_en_attente, true);
  e.horloge(jour(12));
  const r2 = e.appeler({ action: 'scanner', magasin: K, identifiant: id });
  assert.strictEqual(r2.statut, 'recompense_debloquee'); assert.strictEqual(r2.passages, 11);
  assert.strictEqual(e.lignes('Récompenses').length, 1);
});
test('10e passage : encore ok (pas de récompense)', () => {
  const e = nouvelEnvironnement();
  const { r } = jusquaSeuil(e, 10);
  assert.strictEqual(r.statut, 'ok'); assert.strictEqual(r.passages, 10);
});
test('utiliser la récompense : heure serveur, valeur active, compteur à 0', () => {
  const e = nouvelEnvironnement();
  const { id } = jusquaSeuil(e, 11);
  e.feuilles['Réglages'].g.forEach(l => { if (l[0] === 'cout_de_revient') l[1] = 3.5; });
  e.horloge('2026-10-19T20:42:10+02:00');
  const r = e.appeler({ action: 'utiliser_recompense', magasin: K, identifiant: id });
  assert.strictEqual(r.statut, 'ok'); assert.strictEqual(r.passages, 0);
  assert.strictEqual(r.validation_jour, '19/10'); assert.strictEqual(r.validation_heure, '20h42');
  const rec = e.lignes('Récompenses')[0];
  assert.strictEqual(rec[4], 'pizza offerte'); assert.strictEqual(rec[5], 3.5); assert.ok(rec[3]);
});
test('la pizza offerte ne compte pas comme passage ce jour-là', () => {
  const e = nouvelEnvironnement();
  const { id } = jusquaSeuil(e, 11);
  e.horloge(jour(12));
  e.appeler({ action: 'utiliser_recompense', magasin: K, identifiant: id });
  const r = e.appeler({ action: 'scanner', magasin: K, identifiant: id });
  assert.strictEqual(r.statut, 'deja_compte'); assert.strictEqual(r.passages, 0);
  e.horloge(jour(13));
  assert.strictEqual(e.appeler({ action: 'scanner', magasin: K, identifiant: id }).passages, 1);
});
test('utiliser deux fois : refusé', () => {
  const e = nouvelEnvironnement();
  const { id } = jusquaSeuil(e, 11);
  e.horloge(jour(12));
  e.appeler({ action: 'utiliser_recompense', magasin: K, identifiant: id });
  assert.strictEqual(e.appeler({ action: 'utiliser_recompense', magasin: K, identifiant: id }).statut, 'erreur_validation');
});
test('changer le seuil à 5 dans Réglages sans toucher au code', () => {
  const e = nouvelEnvironnement();
  e.feuilles['Réglages'].g.forEach(l => { if (l[0] === 'seuil') l[1] = 5; });
  const { r } = jusquaSeuil(e, 5);
  assert.strictEqual(r.statut, 'recompense_debloquee'); assert.strictEqual(r.seuil, 5);
});
test('changer le coût dans Réglages : l\'ancienne récompense garde sa valeur', () => {
  const e = nouvelEnvironnement();
  e.feuilles['Réglages'].g.forEach(l => { if (l[0] === 'seuil') l[1] = 2; if (l[0] === 'cout_de_revient') l[1] = 3; });
  const a = jusquaSeuil(e, 2);
  e.horloge(jour(5)); e.appeler({ action: 'utiliser_recompense', magasin: K, identifiant: a.id });
  e.feuilles['Réglages'].g.forEach(l => { if (l[0] === 'cout_de_revient') l[1] = 4; });
  const rec = e.lignes('Récompenses');
  assert.strictEqual(rec[0][5], 3);
});

console.log('\nRécupération de carte');
test('bon prénom (accent, casse, tiret différents) : carte retrouvée avec le même identifiant', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  const id = insc(e, { prenom: 'Jean-Éloi', telephone: '0611223344' }).identifiant;
  e.horloge(jour(1));
  const r = e.appeler({ action: 'recuperer', magasin: K, telephone: '06 11 22 33 44', prenom: 'jean eloi' });
  assert.strictEqual(r.statut, 'ok'); assert.strictEqual(r.recupere, true);
  assert.strictEqual(r.identifiant, id); assert.strictEqual(r.passages, 2);
});
test('mauvais prénom ×5 : blocage 1 h, puis débloqué', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  insc(e);
  const rec = p => e.appeler({ action: 'recuperer', magasin: K, telephone: '0612345678', prenom: p });
  for (let i = 0; i < 4; i++) {
    const r = rec('Mauvais');
    assert.strictEqual(r.statut, 'erreur_validation'); assert.strictEqual(r.echecs_restants, 4 - i);
  }
  const r5 = rec('Mauvais');
  assert.strictEqual(r5.statut, 'bloque_recuperation');
  assert.strictEqual(rec('Maxime').statut, 'bloque_recuperation'); // même le bon prénom est bloqué
  e.horloge('2026-10-07T20:31:00+02:00'); // +61 min
  assert.strictEqual(rec('Maxime').statut, 'deja_compte');
});
test('numéro sans carte : client_inconnu', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  assert.strictEqual(e.appeler({ action: 'recuperer', magasin: K, telephone: '0612345678', prenom: 'X' }).statut, 'client_inconnu');
});

console.log('\nSécurité, plafonds, pannes');
test('action inconnue ou magasin inconnu : ignoré', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  assert.strictEqual(e.appeler({ action: 'lister', magasin: K }).statut, 'erreur_validation');
  assert.strictEqual(e.appeler({ action: 'inscrire', magasin: 'paris', prenom: 'A', telephone: '0612345678' }).statut, 'erreur_validation');
  assert.strictEqual(e.appeler('pas du json').statut, 'erreur_validation');
  assert.strictEqual(e.appeler('[1,2]').statut, 'erreur_validation');
  assert.strictEqual(e.appeler({ action: 'inscrire', magasin: K, prenom: 'A', telephone: '0612345678', x: 'y'.repeat(5000) }).statut, 'erreur_validation');
});
test('aucune réponse ne contient de liste de clients', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  insc(e); insc(e, { telephone: '0699999999', prenom: 'Zoé' });
  const r = e.appeler({ action: 'inscrire', magasin: K, prenom: 'A', telephone: '0612345678' });
  assert.ok(JSON.stringify(r).indexOf('+33') === -1);
});
test('plafond d\'inscriptions : 40 puis plafond', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  let dernier;
  for (let i = 0; i < 41; i++) {
    dernier = insc(e, { telephone: '06' + String(10000000 + i), prenom: 'Test' });
  }
  assert.strictEqual(dernier.statut, 'plafond');
  assert.strictEqual(e.lignes('Clients').length, 40);
  e.horloge('2026-10-07T20:30:00+02:00'); // heure suivante
  assert.strictEqual(insc(e, { telephone: '0699999999' }).statut, 'ok');
});
test('plafond de scans : 200 acceptés, le 201e est refusé', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  const id = insc(e).identifiant;
  let r;
  for (let i = 0; i < 200; i++) r = e.appeler({ action: 'scanner', magasin: K, identifiant: id });
  assert.strictEqual(r.statut, 'deja_compte');
  r = e.appeler({ action: 'scanner', magasin: K, identifiant: id });
  assert.strictEqual(r.statut, 'plafond');
});
test('verrou non obtenu : occupe, rien d\'écrit', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  e.bloquerVerrou();
  assert.strictEqual(insc(e).statut, 'occupe');
  assert.strictEqual(e.lignes('Clients').length, 0);
});
test('panne interne : statut erreur, jamais de passage compté', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  delete e.feuilles['Passages'];
  const r = insc(e);
  assert.strictEqual(r.statut, 'erreur'); assert.strictEqual(r.passages, undefined);
  assert.strictEqual(e.lignes('Clients').length, 0); // la carte à moitié créée est retirée
});
test('lecture seule GET : pas de données', () => {
  const e = nouvelEnvironnement();
  const r = JSON.parse(e.sandbox.doGet().contenu);
  assert.deepStrictEqual(r, { statut: 'ok', service: 'guichet' });
});

console.log('\nPurge et suppression');
test('purge : client sans passage depuis 13 mois supprimé, récent gardé', () => {
  const e = nouvelEnvironnement(); e.horloge('2025-08-01T19:00:00+02:00');
  insc(e, { telephone: '0611111111', prenom: 'Ancien' });
  e.horloge('2026-09-20T19:00:00+02:00');
  insc(e, { telephone: '0622222222', prenom: 'Recent' });
  e.horloge('2026-10-01T04:00:00+02:00');
  e.sandbox.purgeMensuelle();
  const c = e.lignes('Clients');
  assert.strictEqual(c.length, 1); assert.strictEqual(c[0][2], 'Recent');
  assert.strictEqual(e.lignes('Passages').length, 1);
});
test('suppression RGPD d\'un client avec son numéro', () => {
  const e = nouvelEnvironnement(); e.horloge(jour(0));
  insc(e); insc(e, { telephone: '0699999999', prenom: 'Zoé' });
  assert.strictEqual(e.sandbox.supprimerClient('06 12 34 56 78'), 'Client supprimé');
  assert.strictEqual(e.lignes('Clients').length, 1);
  assert.strictEqual(e.lignes('Passages').length, 1);
});

console.log(`\n${ok} tests réussis${process.exitCode ? ', des échecs au-dessus' : ''}.\n`);
