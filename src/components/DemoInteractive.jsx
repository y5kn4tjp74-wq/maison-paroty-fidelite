import { useEffect, useRef, useState } from 'react'
import QRCodeDecoratif from './QRCodeDecoratif.jsx'
import { PASSAGES_POUR_RECOMPENSE, RECOMPENSE } from '../data/demo.js'

const NOMS_ETAPES = ['Le QR code', 'L\'inscription', 'La carte', 'Les passages']

const ETAT_INITIAL = {
  etape: 1,
  prenom: '',
  email: '',
  passages: 0,
}

function CarteFidelite({ prenom, passages, enAnimation }) {
  const complet = passages >= PASSAGES_POUR_RECOMPENSE
  const pourcentage = Math.min(100, (passages / PASSAGES_POUR_RECOMPENSE) * 100)

  return (
    <div className={`carte-fidelite ${enAnimation ? 'carte-fidelite--pulse' : ''}`}>
      <div className="carte-fidelite__entete">
        <span className="carte-fidelite__enseigne">Maison Paroty</span>
        <span className="carte-fidelite__type">Carte fidélité</span>
      </div>

      <p className="carte-fidelite__titulaire">{prenom || 'Votre prénom'}</p>

      <div className="carte-fidelite__progression">
        <div className="carte-fidelite__barre">
          <div className="carte-fidelite__barre-remplie" style={{ width: `${pourcentage}%` }} />
        </div>
        <p className="carte-fidelite__compte">
          {complet ? (
            <strong>{RECOMPENSE === 'une baguette offerte' ? 'Baguette offerte !' : RECOMPENSE}</strong>
          ) : (
            <>
              <strong>{passages}</strong> passage{passages > 1 ? 's' : ''} sur {PASSAGES_POUR_RECOMPENSE}
            </>
          )}
        </p>
      </div>

      <p className="carte-fidelite__recompense">
        {complet
          ? 'La carte se réinitialise et un nouveau parcours commence.'
          : `Au ${PASSAGES_POUR_RECOMPENSE}ᵉ passage : ${RECOMPENSE}.`}
      </p>
    </div>
  )
}

export default function DemoInteractive() {
  const [{ etape, prenom, email, passages }, setEtat] = useState(ETAT_INITIAL)
  const [enAnimation, setEnAnimation] = useState(false)
  const delaiAnimation = useRef(null)

  useEffect(() => () => clearTimeout(delaiAnimation.current), [])

  function allerA(etapeSuivante) {
    setEtat((precedent) => ({ ...precedent, etape: etapeSuivante }))
  }

  function recommencer() {
    clearTimeout(delaiAnimation.current)
    setEnAnimation(false)
    setEtat(ETAT_INITIAL)
  }

  function validerInscription(evenement) {
    evenement.preventDefault()
    setEtat((precedent) => ({ ...precedent, etape: 3, passages: 1 }))
  }

  function simulerPassages() {
    setEtat((precedent) => ({
      ...precedent,
      passages: Math.min(PASSAGES_POUR_RECOMPENSE, precedent.passages + 3),
    }))
    setEnAnimation(true)
    clearTimeout(delaiAnimation.current)
    delaiAnimation.current = setTimeout(() => setEnAnimation(false), 500)
  }

  const carteComplete = passages >= PASSAGES_POUR_RECOMPENSE

  return (
    <section id="demo" className="demo section" aria-label="Démonstration interactive">
      <div className="conteneur">
        <span className="etiquette-demo">Démonstration interactive</span>
        <h2 className="demo__titre">Le parcours client, tel qu&apos;il existera vraiment</h2>
        <p className="demo__intro">
          Suivez les quatre étapes, dans l&apos;ordre où vos clients les vivront réellement.
        </p>

        <div className="demo__carte-cadre">
          <div className="demo__entete">
            <ol className="demo__etapes" aria-label="Étape en cours">
              {NOMS_ETAPES.map((nom, index) => {
                const numero = index + 1
                const statut = numero === etape ? 'actuelle' : numero < etape ? 'faite' : 'a-venir'
                return (
                  <li key={nom} className={`demo__etape demo__etape--${statut}`}>
                    <span className="demo__etape-numero" aria-hidden="true">
                      {numero}
                    </span>
                    <span className="demo__etape-nom">{nom}</span>
                  </li>
                )
              })}
            </ol>
            <button type="button" className="demo__recommencer" onClick={recommencer}>
              Recommencer la démo
            </button>
          </div>

          <div className="demo__contenu">
            {etape === 1 && (
              <div className="demo__etape-panneau demo__panneau-scan">
                <QRCodeDecoratif seed="maison-paroty-comptoir" taille={176} />
                <p className="demo__legende">en vrai : un chevalet posé sur le comptoir</p>
                <button type="button" className="bouton bouton--plein" onClick={() => allerA(2)}>
                  Simuler le scan
                </button>
              </div>
            )}

            {etape === 2 && (
              <div className="demo__etape-panneau demo__panneau-formulaire">
                <h3 className="demo__sous-titre">Deux champs. Trente secondes.</h3>
                <form className="formulaire-inscription" onSubmit={validerInscription}>
                  <label className="formulaire-inscription__champ">
                    <span>Prénom</span>
                    <input
                      type="text"
                      name="prenom"
                      required
                      autoComplete="given-name"
                      value={prenom}
                      onChange={(e) => setEtat((p) => ({ ...p, prenom: e.target.value }))}
                      placeholder="Camille"
                    />
                  </label>
                  <label className="formulaire-inscription__champ">
                    <span>E-mail</span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEtat((p) => ({ ...p, email: e.target.value }))}
                      placeholder="camille@exemple.fr"
                    />
                  </label>
                  <button type="submit" className="bouton bouton--plein">
                    Créer ma carte
                  </button>
                </form>
                <p className="demo__mention">
                  Démonstration : les informations saisies ci-dessus ne sont ni envoyées ni enregistrées.
                </p>
              </div>
            )}

            {etape === 3 && (
              <div className="demo__etape-panneau demo__panneau-confirmation">
                <h3 className="demo__sous-titre">Ce que le client voit, aussitôt inscrit</h3>
                <CarteFidelite prenom={prenom} passages={passages} enAnimation={false} />
                <button type="button" className="bouton bouton--plein" onClick={() => allerA(4)}>
                  Continuer
                </button>
              </div>
            )}

            {etape === 4 && (
              <div className="demo__etape-panneau demo__panneau-simulation">
                <h3 className="demo__sous-titre">Et à chaque passage en caisse</h3>
                <CarteFidelite prenom={prenom} passages={passages} enAnimation={enAnimation} />
                <button
                  type="button"
                  className="bouton bouton--plein"
                  onClick={simulerPassages}
                  disabled={carteComplete}
                >
                  {carteComplete ? 'Carte complète' : 'Simuler 3 passages'}
                </button>
                <p className="demo__mention">
                  La vendeuse scanne le même QR code depuis la caisse : aucune manipulation de plus qu&apos;un
                  tampon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
