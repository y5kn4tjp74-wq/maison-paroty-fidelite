#!/usr/bin/env python3
"""Fabrique pilote/index.html (vrai site branché sur le guichet) à partir de la démo kiosque/index.html.

La démo reste intacte. Ici on garde le design tel quel (CSS, logo, écrans) et on remplace seulement
la mémoire locale et la logique par des appels au guichet. Lancer : python3 outils/construire_pilote.py
"""
import re, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
src = (RACINE / "kiosque" / "index.html").read_text(encoding="utf-8")

debut = src.index("(function () {")
tete, js = src[:debut], src[debut:]
# la tête se termine par <script>\nconst LOGO...\nconst MONO...\n\n ; on garde LOGO et MONO
assert "const LOGO" in tete and "const MONO" in tete


def sub(ancien, nouveau, n=1):
    global js
    assert js.count(ancien) == n, (ancien[:60], js.count(ancien))
    js = js.replace(ancien, nouveau)


def rx(motif, nouveau, flags=re.S):
    global js
    js, k = re.subn(motif, lambda m: nouveau, js, count=1, flags=flags)
    assert k == 1, motif[:60]


# A. Constantes
sub("const TILT = [-8, 5, -3, 7, -6, 4, -9, 6, -4, 8];\n  const OBJ = 10, IMPACT = 1350;\n  const CLE = \"mp_fidelite_kiosque_v0\";",
    "const TILT = [-8, 5, -3, 7, -6, 4, -9, 6, -4, 8, -5, 7, -7, 5, -3, 6];\n  let OBJ = CONFIG.SEUIL;\n  const IMPACT = 1350;\n  const CLE = CONFIG.CLE_STOCKAGE;")

# B. Mémoire : seulement l'identifiant secret
rx(r"  /\* ——— Stockage \(ce téléphone uniquement, pour la démo\) ——— \*/.*?function sauver\(\)[^\n]*\n",
"""  /* ——— Mémoire du téléphone : seulement l'identifiant secret ——— */
  let idMemoire = null;
  const S = { id: null, prenom: "", passages: 0, attente: false, persiste: true, validation: "" };
  function lireId() { try { return localStorage.getItem(CLE) || idMemoire; } catch (e) { return idMemoire; } }
  function ecrireId(id) { idMemoire = id; try { localStorage.setItem(CLE, id); return localStorage.getItem(CLE) === id; } catch (e) { return false; } }
  function oublierId() { idMemoire = null; S.id = null; try { localStorage.removeItem(CLE); } catch (e) {} }
""")
rx(r"  /\* ——— Jour calendaire en heure de Paris ——— \*/.*?(?=  const tailleNom)", "")

# C. Inscription : la mini-carte suit le seuil
sub('<ol class="e2__mini-cells" id="cells">${cells}</ol>',
    '<ol class="e2__mini-cells" id="cells" style="grid-template-columns:repeat(${OBJ},minmax(0,1fr))">${cells}</ol>')

# D. Envoi de l'inscription au guichet
rx(r'    statut\("envoi"\);\n    E\.alert\.hidden = true;.*?\}, 900\);\n  \}',
'''    statut("envoi");
    E.alert.hidden = true;
    E.btn.innerHTML = '<span class="e2__spinner" aria-hidden="true"></span>Création de votre carte…';
    const sms = E.optin.checked;
    const lab = E.optin.closest("label");
    const texteSms = lab ? lab.textContent.replace(/\\s+/g, " ").trim() : "";
    appeler({ action: "inscrire", prenom: s.prenom, telephone: s.d, consentementSms: sms, texteConsentementSms: sms ? texteSms : "" })
      .then(r => {
        if (r.statut === "ok" || r.statut === "recompense_debloquee") {
          memoriserClient(r);
          statut("reussite");
          E.btn.textContent = "Bienvenue " + S.prenom + " !";
          E.mc.textContent = "1";
          E.cells.firstElementChild.innerHTML = `<span class="e2__mini-stamp"><img src="${MONO}" alt=""></span>` + BURST.replace(/e3__burst/, "e2__burst");
          setTimeout(() => carte({ pastille: "Premier passage enregistré", petit: "Bienvenue", nouveau: true }), reduce() ? 0 : 1300);
          return;
        }
        if (r.statut === "numero_connu") return recuperation(s.d, s.prenom);
        erreurFormulaire(r.message || ERREUR_RESEAU);
      })
      .catch(() => erreurFormulaire(ERREUR_RESEAU));
  }
  function erreurFormulaire(msg) {
    if (!E.root || !E.alert) return;
    statut("erreur"); E.alert.textContent = msg; E.alert.hidden = false; E.btn.textContent = "Créer ma carte";
  }''')

# E. Carte
sub("S.client.prenom", "S.prenom", 6)
sub('<ol class="e3__stamps">${cells}</ol>',
    '<ol class="e3__stamps" style="grid-template-columns:repeat(${colonnes(OBJ)},minmax(0,1fr))">${cells}</ol>')
sub("        </section>\n      </main>\n      <footer class=\"e3__actions\">\n        <button type=\"button\" class=\"e3__btn e3__btn--primary\" id=\"principal\">",
    "        </section>\n        ${S.persiste ? \"\" : '<p class=\"v0__texte\" style=\"margin-top:10px;font-size:14px\">Pour être reconnu automatiquement, ouvrez ce lien en navigation normale.</p>'}\n      </main>\n      <footer class=\"e3__actions\">\n        <button type=\"button\" class=\"e3__btn e3__btn--primary\" id=\"principal\">")
js = re.sub(r'\n\s*<button type="button" class="e3__btn e3__btn--secondary" id="demo">Options de démo</button>', "", js)
js = re.sub(r'\n\s*document\.getElementById\("demo"\)\.addEventListener\("click", optionsDemo\);', "", js)

# F. Récompense
sub('<p class="v0__dix">10<span>/10</span></p>', '<p class="v0__dix">${OBJ}<span>/${OBJ}</span></p>')

# G. Utiliser la récompense
sub("Une récompense utilisée ne peut plus servir.</p>",
    'Une récompense utilisée ne peut plus servir.</p>\n      <p id="msgrec" role="alert" hidden style="font-weight:700"></p>')
rx(r'    v\.querySelector\("#oui"\)\.addEventListener\("click", ev => \{.*?\n    \}\);\n  \}',
'''    v.querySelector("#oui").addEventListener("click", ev => {
      const b = ev.currentTarget, msg = v.querySelector("#msgrec");
      b.disabled = true; b.textContent = "Validation…"; msg.hidden = true;
      const echec = () => {
        b.disabled = false; b.textContent = "Oui, j’utilise ma récompense";
        msg.textContent = "La récompense n’a pas pu être validée. Réessayez ou signalez-le en caisse."; msg.hidden = false;
      };
      appeler({ action: "utiliser_recompense", identifiant: S.id }).then(r => {
        if (r.statut === "ok") {
          v.remove();
          S.passages = 0; S.attente = false; S.validation = "le " + r.validation_jour + " à " + r.validation_heure;
          return recompenseUtilisee();
        }
        if (r.statut === "erreur_validation" || r.statut === "client_inconnu") { v.remove(); return scanner(); }
        echec();
      }).catch(echec);
    });
  }''')

# H. Récompense utilisée : heure donnée par le serveur
sub("${heureParis(new Date(S.derniereUtilisation))}", "${echap(S.validation)}")

# I. Panne
sub("  function panne() {", "  function panne(msg) {")
sub("<p>Le service est momentanément indisponible. Réessayez plus tard dans la journée, votre passage comptera.</p>",
    "<p>${msg || \"Le service est momentanément indisponible. Réessayez plus tard dans la journée, votre passage comptera.\"}</p>")

# J. Logique : ouvrir le lien, appels au guichet, E7, E8
rx(r"  /\* ═══════════ Ouvrir le lien = tenter 1 passage ═══════════ \*/.*\Z", r'''  /* ═══════════ Appels au guichet ═══════════ */
  const ERREUR_RESEAU = "La connexion a coupé. Vos infos sont toujours là : réessayez.";
  function appeler(corps) {
    if (!CONFIG.GUICHET_URL) return Promise.reject(new Error("guichet non configuré"));
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), CONFIG.DELAI_MS);
    return fetch(CONFIG.GUICHET_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ magasin: CONFIG.MAGASIN }, corps)),
      signal: ctrl.signal
    }).then(rep => {
      if (!rep.ok) throw new Error("http " + rep.status);
      return rep.json();
    }).finally(() => clearTimeout(minuteur))
      .then(r => {
        // Guichet occupé (plusieurs clients en même temps) : rien n'a été écrit, on réessaie une fois.
        if (r && r.statut === "occupe" && !corps._retry) {
          return new Promise(ok => setTimeout(ok, 1500)).then(() => appeler(Object.assign({ _retry: true }, corps)));
        }
        return r;
      });
  }
  const colonnes = n => (n <= 5 ? n : n === 10 ? 5 : Math.ceil(n / 2));
  function majCarte(r) {
    if (r.prenom) S.prenom = r.prenom;
    if (typeof r.passages === "number") S.passages = r.passages;
    if (r.seuil) OBJ = r.seuil;
    S.attente = r.recompense_en_attente === true;
  }
  function memoriserClient(r) {
    if (r.identifiant) { S.id = r.identifiant; S.persiste = ecrireId(r.identifiant); }
    majCarte(r);
  }

  /* ——— Réponse du guichet → bon écran ——— */
  function traiter(r, recupere) {
    const petit = recupere ? "Heureux de vous revoir" : undefined;
    if (r.statut === "ok" || r.statut === "deja_compte" || r.statut === "recompense_debloquee") {
      majCarte(r);
      if (r.statut === "ok") return carte({ pastille: "Passage enregistré", petit, nouveau: true });
      if (r.statut === "deja_compte") return carte({ pastille: "Déjà compté aujourd’hui", petit, calme: true, ticket: "Un passage par jour maximum. <strong>À bientôt</strong> !" });
      return recompense(r.nouvelle_recompense === true);
    }
    if (r.statut === "client_inconnu") { oublierId(); return inscription(); }
    if (r.statut === "bloque_recuperation") return blocage(r);
    if (r.statut === "plafond" || r.statut === "occupe") return panne(r.message);
    return panne();
  }

  function chargement() {
    app.innerHTML = `
    <div class="e2">
      ${ENTETE("e2")}
      <main class="e2__main" style="display:grid;place-items:center;min-height:50vh">
        <span class="p__spin" role="status" aria-label="Chargement"></span>
      </main>
    </div>`;
    window.scrollTo(0, 0);
  }

  /* ═══════════ Ouvrir le lien = tenter 1 passage ═══════════ */
  function scanner() {
    const id = lireId();
    if (!id) return inscription();
    S.id = id; S.persiste = true;
    chargement();
    appeler({ action: "scanner", identifiant: id }).then(r => traiter(r, false)).catch(() => panne());
  }

  /* ═══════════ E7 · Numéro déjà connu : retrouver sa carte avec le prénom ═══════════ */
  function recuperation(tel, prenomSaisi) {
    app.innerHTML = `
    <div class="e2 is-saisie" id="e2">
      ${ENTETE("e2")}
      <form class="e2__form" id="f" novalidate>
        <main class="e2__main">
          <h1 class="e2__title" style="text-align:center"><span class="e2__title-big" style="font-size:30px">Ce numéro a déjà une carte</span></h1>
          <p class="v0__texte" style="text-align:center;margin:12px auto 0">Tapez votre prénom pour la retrouver. Vos passages sont conservés.</p>
          <div class="e2__fields" id="fields">
            <div class="e2__field" id="fp" style="--d:300ms">
              <label class="e2__label" for="prenom">Votre prénom</label>
              <div class="e2__input-wrap"><input id="prenom" class="e2__input" autocomplete="given-name" autocapitalize="words" enterkeyhint="go" maxlength="40"></div>
            </div>
          </div>
        </main>
        <footer class="e2__actions">
          <p class="e2__alert" id="alert" role="alert" hidden></p>
          <button type="submit" class="e2__btn" id="btn">Retrouver ma carte</button>
        </footer>
      </form>
    </div>`;
    window.scrollTo(0, 0);
    const p = document.getElementById("prenom"), alerte = document.getElementById("alert"), btn = document.getElementById("btn");
    const racine = document.getElementById("e2");
    const envoyer = ev => {
      if (ev) ev.preventDefault();
      if (btn.disabled) return;
      const prenom = nettoyerPrenom(p.value);
      if (prenom.length < 2) { alerte.textContent = "Indiquez votre prénom (2 lettres minimum)."; alerte.hidden = false; p.focus(); return; }
      alerte.hidden = true; btn.disabled = true; racine.className = "e2 is-envoi";
      btn.innerHTML = '<span class="e2__spinner" aria-hidden="true"></span>Recherche de votre carte…';
      const fin = msg => { btn.disabled = false; racine.className = "e2 is-erreur"; btn.textContent = "Retrouver ma carte"; alerte.textContent = msg; alerte.hidden = false; };
      appeler({ action: "recuperer", telephone: tel, prenom }).then(r => {
        if (r.statut === "ok" || r.statut === "deja_compte" || r.statut === "recompense_debloquee") {
          memoriserClient(r);
          return traiter(r, true);
        }
        if (r.statut === "bloque_recuperation") return blocage(r);
        if (r.statut === "client_inconnu") return inscription();
        fin(r.message || ERREUR_RESEAU);
      }).catch(() => fin(ERREUR_RESEAU));
    };
    document.getElementById("f").addEventListener("submit", envoyer);
    // Le prénom vient d'être saisi à l'inscription : on l'essaie tout de suite, sans le redemander.
    if (prenomSaisi) { p.value = prenomSaisi; envoyer(); }
  }

  /* ═══════════ E8 · Trop d'essais : blocage 1 heure ═══════════ */
  function blocage(r) {
    app.innerHTML = `
    <div class="e3">
      ${ENTETE("e3")}
      <main class="e3__main">
        <p class="e3__success e3__success--calme" role="status"><span class="e3__success-icon">!</span>Trop d’essais</p>
        <h1 class="e3__hello"><span class="e3__hello-small">On fait une pause</span><span class="e3__hello-name">Réessayez plus tard${SQUIGGLE}</span></h1>
        <div class="v0__bloc">
          <strong>Votre carte n’est pas perdue.</strong>
          <p>Réessayez dans environ ${r.minutes_restantes || 60} minutes, ou demandez de l’aide à l’équipe.</p>
        </div>
      </main>
    </div>`;
    window.scrollTo(0, 0);
  }

  scanner();
})();
</script>

</body>
</html>
''')

# K. Rattache config.js, ajoute le petit indicateur de chargement
tete = tete.replace("</head>",
    "<style>.p__spin{width:38px;height:38px;border-radius:50%;border:4px solid rgba(46,52,57,.18);border-top-color:#D7141A;animation:p-spin .9s linear infinite}"
    "@keyframes p-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.p__spin{animation:none}}</style>\n</head>")
tete = tete.rstrip("\n")
assert tete.endswith("\n") or True
sortie = tete + "\n</script>\n<script src=\"config.js\"></script>\n<script>\n" + js
# la tête contenait déjà "<script>" ouvert avant LOGO/MONO : on le referme avant config.js
(RACINE / "pilote").mkdir(exist_ok=True)
(RACINE / "pilote" / "index.html").write_text(sortie, encoding="utf-8")
print("pilote/index.html écrit :", len(sortie), "octets")
