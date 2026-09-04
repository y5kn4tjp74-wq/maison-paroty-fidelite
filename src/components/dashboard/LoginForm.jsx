import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../lib/auth'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (login(username, password)) {
      navigate('/dashboard', { replace: true })
    } else {
      setError('Identifiants incorrects. Réessayez.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-paroty-200 bg-white p-8 shadow-sm">
      <h1 className="font-display text-2xl text-paroty-900 text-center">Espace Manager</h1>
      <p className="mt-1 text-center text-sm text-paroty-500">Accès réservé à l'équipe Maison Paroty</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-paroty-700 mb-1" htmlFor="username">
            Identifiant
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-paroty-200 px-3 py-2 text-paroty-900 focus:border-paroty-500 focus:outline-none focus:ring-1 focus:ring-paroty-500"
            placeholder="manager"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-paroty-700 mb-1" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-paroty-200 px-3 py-2 text-paroty-900 focus:border-paroty-500 focus:outline-none focus:ring-1 focus:ring-paroty-500"
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="mt-6 w-full rounded-full bg-paroty-800 py-2.5 text-sm font-semibold text-paroty-50 transition-colors hover:bg-paroty-900"
      >
        Se connecter
      </button>

      <p className="mt-4 text-center text-xs text-paroty-400">
        Prototype — identifiants de démo : <span className="font-mono">manager / demo123</span>
      </p>
    </form>
  )
}
