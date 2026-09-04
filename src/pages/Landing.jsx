import Header from '../components/Header'
import Footer from '../components/Footer'
import QRCodeCard from '../components/QRCodeCard'
import StatsLive from '../components/StatsLive'
import { STORES } from '../lib/stores'

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paroty-500">
            Fidélité Maison Paroty
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl text-paroty-900">
            Scannez, cumulez, profitez
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-paroty-600">
            Retrouvez-nous dans nos trois établissements et scannez le QR code de votre
            magasin pour rejoindre le programme de fidélité Maison Paroty.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-14">
          <h2 className="text-center font-display text-2xl text-paroty-900 mb-6">
            Nos QR codes fidélité
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STORES.map((store) => (
              <QRCodeCard key={store.id} store={store} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
          <StatsLive />
        </section>
      </main>

      <Footer />
    </div>
  )
}
