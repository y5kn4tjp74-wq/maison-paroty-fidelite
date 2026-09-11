import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts'
import { coutsCumules36Mois, coutNumerique, coutPapierMensuelEstime, moisDeCroisement } from '../data/demo.js'

function formaterEuros(valeur) {
  return `${valeur.toLocaleString('fr-FR')} €`
}

function InfoBulleCout({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="comparatif__infobulle">
      <p>Mois {label}</p>
      {payload.map((entree) => (
        <p key={entree.dataKey}>
          <span style={{ color: entree.color }}>●</span> {entree.name} : <strong>{formaterEuros(entree.value)}</strong>
        </p>
      ))}
    </div>
  )
}

export default function ComparatifEconomique() {
  return (
    <section id="comparatif" className="comparatif section" aria-label="Comparatif économique">
      <div className="conteneur">
        <h2 className="comparatif__titre">Ce que ça coûte, sur la durée</h2>
        <p className="comparatif__intro">
          Le papier coûte un peu chaque mois, indéfiniment. Le numérique coûte une fois, puis presque rien.
        </p>

        <div className="comparatif__conteneur-graphique">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={coutsCumules36Mois} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--creme-fonce)" vertical={false} />
              <XAxis
                dataKey="mois"
                stroke="var(--gris)"
                tick={{ fontSize: 12, fill: 'var(--gris)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(m) => `${m}m`}
                interval={5}
              />
              <YAxis
                stroke="var(--gris)"
                tick={{ fontSize: 12, fill: 'var(--gris)' }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => `${Math.round(v / 1000)}k€`}
              />
              <Tooltip content={<InfoBulleCout />} />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
              {moisDeCroisement && (
                <ReferenceLine
                  x={moisDeCroisement}
                  stroke="var(--dore)"
                  strokeDasharray="4 4"
                  label={{ value: `croisement ≈ mois ${moisDeCroisement}`, position: 'insideTopLeft', fill: 'var(--gris)', fontSize: 12 }}
                />
              )}
              <Line type="monotone" dataKey="papier" name="Papier (estimation)" stroke="var(--gris)" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="numerique" name="Numérique" stroke="var(--brun)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="comparatif__grille">
          <table className="comparatif__tableau">
            <caption className="visually-hidden">Coûts du dispositif numérique</caption>
            <tbody>
              <tr>
                <th scope="row">Investissement unique</th>
                <td>{formaterEuros(coutNumerique.investissementInitial)}</td>
              </tr>
              <tr>
                <th scope="row">Exploitation</th>
                <td>≈ {formaterEuros(coutNumerique.exploitationMensuelle)} / mois</td>
              </tr>
              <tr>
                <th scope="row">Papier, pour comparaison</th>
                <td>≈ {formaterEuros(coutPapierMensuelEstime)} / mois, pour 3 magasins</td>
              </tr>
            </tbody>
          </table>

          <p className="comparatif__avertissement">
            Le coût du dispositif papier est une <strong>estimation</strong> construite sur des ordres de
            grandeur de commerces comparables — pas sur la comptabilité réelle de Maison Paroty. Ces chiffres
            sont des estimations à confronter à vos chiffres réels.
          </p>
        </div>
      </div>
    </section>
  )
}
