import Accroche from './components/Accroche.jsx'
import DemoInteractive from './components/DemoInteractive.jsx'
import TableauDeBord from './components/TableauDeBord.jsx'
import ComparatifEconomique from './components/ComparatifEconomique.jsx'
import Deploiement from './components/Deploiement.jsx'
import APropos from './components/APropos.jsx'
import NavRetourDemo from './components/NavRetourDemo.jsx'

import './styles/accroche.css'
import './styles/demo.css'
import './styles/tableau-bord.css'
import './styles/comparatif.css'
import './styles/deploiement.css'
import './styles/a-propos.css'

export default function App() {
  return (
    <>
      <main>
        <Accroche />
        <DemoInteractive />
        <TableauDeBord />
        <ComparatifEconomique />
        <Deploiement />
        <APropos />
      </main>
      <footer className="pied-de-page">
        <div className="conteneur">
          <p>Site de démonstration — Maison Paroty. Aucune donnée saisie ici n&apos;est enregistrée.</p>
        </div>
      </footer>
      <NavRetourDemo />
    </>
  )
}
