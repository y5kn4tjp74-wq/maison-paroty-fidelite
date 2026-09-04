import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="border-b border-paroty-200/70 bg-paroty-50/90 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-paroty-800 text-paroty-50 flex items-center justify-center font-display text-lg">
            MP
          </div>
          <div>
            <p className="font-display text-lg leading-tight text-paroty-900">Maison Paroty</p>
            <p className="text-xs uppercase tracking-widest text-paroty-500">Programme Fidélité</p>
          </div>
        </div>
        <Link
          to="/dashboard/login"
          className="text-sm font-medium text-paroty-700 hover:text-paroty-900 border border-paroty-300 hover:border-paroty-500 rounded-full px-4 py-2 transition-colors"
        >
          Espace Manager
        </Link>
      </div>
    </header>
  )
}
