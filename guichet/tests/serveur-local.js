// Petit serveur de test : le vrai site (pilote/) parle à un faux guichet qui tourne sur le faux Google.
// Lancer : node guichet/tests/serveur-local.js   puis ouvrir http://localhost:8787/pilote/
const http = require('http');
const fs = require('fs');
const path = require('path');
const { nouvelEnvironnement } = require('./faux-google');

const env = nouvelEnvironnement();
const racine = path.join(__dirname, '..', '..');
const seuil = Number(process.env.SEUIL || 11);
env.feuilles['Réglages'].g.forEach(l => { if (l[0] === 'seuil') l[1] = seuil; });
let decalageJours = 0;
const maj = () => env.horloge(new Date(Date.now() + decalageJours * 86400000).toISOString());
maj();

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
http.createServer((req, rep) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
  if (req.method === 'OPTIONS') { rep.writeHead(204, cors); return rep.end(); }
  if (req.url.startsWith('/guichet') && req.method === 'POST') {
    let corps = '';
    req.on('data', d => (corps += d));
    req.on('end', () => {
      if (global.PANNE) { rep.writeHead(500, cors); return rep.end('panne'); }
      const r = env.sandbox.doPost({ postData: { contents: corps } });
      rep.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      rep.end(r.contenu);
    });
    return;
  }
  if (req.url.startsWith('/outils/jour-suivant')) { decalageJours++; maj(); rep.writeHead(200, cors); return rep.end('jour+' + decalageJours); }
  if (req.url.startsWith('/outils/panne')) { global.PANNE = !global.PANNE; rep.writeHead(200, cors); return rep.end(String(global.PANNE)); }
  if (req.url.startsWith('/outils/etat')) { rep.writeHead(200, cors); return rep.end(JSON.stringify({ clients: env.lignes('Clients').length })); }
  let p = req.url.split('?')[0];
  if (p === '/pilote/config.js') {
    rep.writeHead(200, { 'Content-Type': types['.js'] });
    return rep.end('window.CONFIG={GUICHET_URL:"http://localhost:8787/guichet",MAGASIN:"kiosque",SEUIL:' + seuil + ',CLE_STOCKAGE:"mp_test",DELAI_MS:5000};');
  }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(racine, p);
  if (!f.startsWith(racine) || !fs.existsSync(f)) { rep.writeHead(404); return rep.end('404'); }
  rep.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  rep.end(fs.readFileSync(f));
}).listen(8787, () => console.log('http://localhost:8787/pilote/  (seuil ' + seuil + ')'));
