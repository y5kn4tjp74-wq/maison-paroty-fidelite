import { phasesDeploiement } from '../data/demo.js'

function formaterCout(cout) {
  return cout === 0 ? '0 €' : `${cout.toLocaleString('fr-FR')} €`
}

export default function Deploiement() {
  return (
    <section id="deploiement" className="deploiement section" aria-label="Déploiement en trois phases">
      <div className="conteneur">
        <h2 className="deploiement__titre">Vous ne payez qu&apos;après avoir vu les résultats</h2>
        <p className="deploiement__intro">
          Le pilote se fait sur un seul magasin, sans frais. La généralisation n&apos;arrive qu&apos;ensuite —
          et peut s&apos;arrêter net si le test ne convainc pas.
        </p>

        <ol className="deploiement__liste">
          {phasesDeploiement.map((phase) => (
            <li key={phase.numero} className="deploiement__phase">
              <div className="deploiement__phase-numero">Phase {phase.numero}</div>
              <div className="deploiement__phase-corps">
                <div className="deploiement__phase-entete">
                  <h3>{phase.titre}</h3>
                  <span className={`deploiement__cout ${phase.cout === 0 ? 'deploiement__cout--nul' : ''}`}>
                    {formaterCout(phase.cout)}
                  </span>
                </div>
                <p className="deploiement__phase-description">{phase.description}</p>
                <span className={`deploiement__statut deploiement__statut--${phase.statut === 'déjà réalisé' ? 'fait' : 'attente'}`}>
                  {phase.statut}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
