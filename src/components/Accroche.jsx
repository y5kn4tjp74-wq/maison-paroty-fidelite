function scrollVersDemo() {
  const cible = document.getElementById('demo')
  if (cible) {
    cible.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export default function Accroche() {
  return (
    <section className="accroche" aria-label="Introduction">
      <div className="conteneur accroche__conteneur">
        <p className="accroche__sur-titre">Maison Paroty — Dijon &amp; Haute-Saône</p>
        <h1 className="accroche__titre">
          Vos cartes à tamponner ont un coût qui ne s&apos;arrête jamais.
        </h1>
        <p className="accroche__sous-titre">
          Un QR code sur le comptoir remplace le carnet papier : même geste pour vos
          clients, une inscription en ligne, un suivi que le papier ne permet pas.
        </p>
        <button type="button" className="bouton bouton--plein accroche__bouton" onClick={scrollVersDemo}>
          Essayer la démonstration
        </button>
      </div>
    </section>
  )
}
