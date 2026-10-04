// Faux Google (Sheets, verrou, cache...) pour tester le guichet sans compte Google.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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


module.exports = { nouvelEnvironnement };
