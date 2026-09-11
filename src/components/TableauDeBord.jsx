import { useEffect, useRef, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import {
  totalInscrits,
  inscritsParMagasin,
  evolutionInscriptions,
  tauxDeRetour,
  frequentationParJour,
  clientsInactifs,
} from '../data/demo.js'

function useEnVue() {
  const ref = useRef(null)
  const [enVue, setEnVue] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined

    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setEnVue(true)
          observateur.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observateur.observe(element)
    return () => observateur.disconnect()
  }, [])

  return [ref, enVue]
}

function InfoBulle({ active, payload, label, suffixe = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tableau-bord__infobulle">
      <p>{label}</p>
      <strong>
        {payload[0].value}
        {suffixe}
      </strong>
    </div>
  )
}

export default function TableauDeBord() {
  const [refStats, statsEnVue] = useEnVue()
  const maxFrequentation = Math.max(...frequentationParJour.map((j) => j.passages))

  return (
    <section id="tableau-de-bord" className="tableau-bord section" aria-label="Tableau de bord direction">
      <div className="conteneur">
        <span className="etiquette-demo">Données de démonstration</span>
        <h2 className="tableau-bord__titre">Ce que la direction consulte, en continu</h2>
        <p className="tableau-bord__intro">
          Chaque magasin affiche son propre QR code : chaque inscription est donc automatiquement
          rattachée à son point de vente.
        </p>

        <div ref={refStats} className={`tableau-bord__stats ${statsEnVue ? 'tableau-bord__stats--visible' : ''}`}>
          <div className="statistique statistique--large">
            <p className="statistique__valeur">{totalInscrits}</p>
            <p className="statistique__libelle">inscrits au total, sur 3 magasins</p>
            <ul className="statistique__repartition">
              {inscritsParMagasin.map((m) => (
                <li key={m.magasin}>
                  <span>{m.magasin}</span>
                  <span className="statistique__repartition-barre">
                    <span
                      style={{ width: `${(m.inscrits / totalInscrits) * 100}%` }}
                      className="statistique__repartition-remplissage"
                    />
                  </span>
                  <span className="statistique__repartition-valeur">{m.inscrits}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="statistique">
            <p className="statistique__valeur">{tauxDeRetour}%</p>
            <p className="statistique__libelle">des inscrits reviennent au moins une fois</p>
          </div>
        </div>

        <div className="tableau-bord__graphiques">
          <div className="tableau-bord__graphique-bloc">
            <h3>Inscriptions cumulées, sur 8 semaines</h3>
            <div className="tableau-bord__conteneur-graphique">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={evolutionInscriptions} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--creme-fonce)" vertical={false} />
                  <XAxis dataKey="semaine" stroke="var(--gris)" tick={{ fontSize: 13, fill: 'var(--gris)' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--gris)" tick={{ fontSize: 13, fill: 'var(--gris)' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<InfoBulle suffixe=" inscrits" />} cursor={{ stroke: 'var(--dore)' }} />
                  <Line
                    type="monotone"
                    dataKey="inscrits"
                    stroke="var(--brun)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'var(--brun)' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="tableau-bord__graphique-bloc">
            <h3>Fréquentation moyenne par jour</h3>
            <div className="tableau-bord__conteneur-graphique">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={frequentationParJour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--creme-fonce)" vertical={false} />
                  <XAxis dataKey="jour" stroke="var(--gris)" tick={{ fontSize: 13, fill: 'var(--gris)' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--gris)" tick={{ fontSize: 13, fill: 'var(--gris)' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<InfoBulle suffixe=" passages" />} cursor={{ fill: 'var(--creme-fonce)' }} />
                  <Bar dataKey="passages" radius={[4, 4, 0, 0]}>
                    {frequentationParJour.map((j) => (
                      <Cell key={j.jour} fill={j.passages === maxFrequentation ? 'var(--brun)' : 'var(--dore)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="tableau-bord__note">Le samedi matin concentre l&apos;essentiel du passage en boutique.</p>
          </div>
        </div>

        <div className="tableau-bord__encart-alerte">
          <p className="tableau-bord__encart-chiffre">{clientsInactifs.nombre}</p>
          <div>
            <p className="tableau-bord__encart-titre">
              clients n&apos;ont pas repassé depuis {clientsInactifs.depuisSemaines} semaines
            </p>
            <p className="tableau-bord__encart-texte">
              C&apos;est exactement ce qu&apos;un carnet en papier ne permettra jamais de voir.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
