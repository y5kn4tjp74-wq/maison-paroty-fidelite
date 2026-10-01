# Guichet — mise en place pas à pas

Le guichet est un script Google (Apps Script) collé dans le Google Sheets pilote.
À faire depuis le **compte Google de Maison Paroty** (ou un compte à toi pour un essai, voir plus bas).

## 1. Créer le Sheets et coller le script (10 min)

1. Sur Google Drive : Nouveau → Google Sheets. Nom : `Fidélité Paroty — Pilote`.
2. Dans le Sheets : Extensions → Apps Script.
3. Supprime le code qui s'y trouve, colle tout le contenu de `Code.gs`, clique sur l'icône disquette.
4. En haut, choisis la fonction `installer` dans la liste, clique sur Exécuter. Google demande une autorisation : accepte (c'est ton propre script).
5. Retourne dans le Sheets : les onglets Clients, Passages, Récompenses, Réglages, Tickets, Jours spéciaux, Tableau de bord sont créés.

## 2. Régler les Réglages

Dans l'onglet **Réglages** :

| Réglage | À mettre |
|---|---|
| `recompense` | pizza offerte |
| `cout_de_revient` | le coût de revient d'une pizza, en euros (point décimal ou virgule selon ton Sheets) |
| `seuil` | 11 (ou 5 si le patron accepte un seuil réduit pour le pilote) |
| `magasins` | kiosque,theatre |
| `alertes_destinataires` | les adresses qui reçoivent le mail du soir, séparées par une virgule |

Les autres valeurs (plafonds, blocage, conservation) sont déjà à leurs valeurs validées.

## 3. Publier le guichet

1. Dans Apps Script : Déployer → Nouveau déploiement → icône engrenage → Application Web.
2. Exécuter en tant que : **Moi**. Qui a accès : **Tout le monde**.
3. Déployer, autoriser, copier l'URL qui finit par `/exec`. C'est l'adresse du guichet : le site la reçoit dans son fichier de réglages.
4. Test rapide : ouvre l'URL dans le navigateur, tu dois voir `{"statut":"ok","service":"guichet"}`.

Quand tu modifies le code plus tard : Déployer → Gérer les déploiements → crayon → Version : Nouvelle version. L'URL ne change pas.

## 4. Tâches automatiques (une seule fois)

Dans Apps Script, lance la fonction `installerDeclencheurs`. Elle programme :
- le mail du soir à 22 h 30 (chiffres seulement),
- la copie de sauvegarde à 3 h (dossier « Sauvegardes fidélité » du Drive, 30 jours),
- la purge mensuelle (clients sans passage depuis 12 mois).

Le mail du soir ne part que si `alertes_destinataires` est rempli.

## 5. Chaque soir

Dans l'onglet **Tickets**, une ligne par soir : date au format `2026-10-07`, magasin (`kiosque`), nombre de tickets. Sans ça le taux de scan reste à 0.

## 6. Demande de suppression d'un client

Dans Apps Script, ouvre la console d'exécution et lance `supprimerClient('06 12 34 56 78')` avec son numéro. Ça efface sa carte, ses passages et ses récompenses.

## Ce que le site doit envoyer

POST vers l'URL `/exec`, en-tête `Content-Type: text/plain`, corps JSON :

```json
{ "action": "inscrire", "magasin": "kiosque", "prenom": "Maxime", "telephone": "06 12 34 56 78",
  "consentementSms": false, "texteConsentementSms": "" }
{ "action": "scanner", "magasin": "kiosque", "identifiant": "<id gardé dans le navigateur>" }
{ "action": "recuperer", "magasin": "kiosque", "telephone": "06 12 34 56 78", "prenom": "Maxime" }
{ "action": "utiliser_recompense", "magasin": "kiosque", "identifiant": "<id>" }
```

Réponse : `statut`, `message`, `passages`, `seuil`, `recompense_en_attente`, plus `prenom` et `identifiant` (inscription et récupération), `minutes_restantes` (blocage), `validation_jour` / `validation_heure` (récompense utilisée).

Statuts : `ok`, `deja_compte`, `recompense_debloquee`, `numero_connu`, `bloque_recuperation`, `erreur_validation`, `plafond`, `occupe`, `erreur`, et un ajout : `client_inconnu` (identifiant ou numéro sans carte : le site affiche l'inscription).

## Tester sans Google

`node guichet/tests/simulateur.js` lance 31 scénarios sur un faux Google (règle du jour, minuit à Paris, récompense, blocage, plafonds, panne).

## Ce qui n'est pas vérifié tant qu'on n'a pas un vrai Sheets

- Les formules du Tableau de bord (écrites mais jamais calculées par Google, à contrôler avec 3 ou 4 inscriptions de test).
- La réponse réelle d'Apps Script depuis un téléphone en 4G (CORS, redirection) : test à faire dès que l'URL existe.
- Les tâches automatiques (mail, copie, purge) : à lancer une fois à la main pour voir qu'elles passent.

## Choix à connaître

- La pizza offerte n'est pas un achat : le jour où la récompense est utilisée, le passage du jour est bloqué.
- Les scans refusés par plafond ne sont pas journalisés (pour ne pas remplir le Sheets en cas d'abus).
- Le « taux de retour » du Tableau de bord = clients avec au moins 2 passages ÷ inscrits (version simple, sans la fenêtre des 8 premiers jours).
