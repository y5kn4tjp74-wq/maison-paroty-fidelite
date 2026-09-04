import { Link } from 'react-router-dom'
import LoginForm from '../components/dashboard/LoginForm'

export default function DashboardLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paroty-50 px-4">
      <Link to="/" className="mb-6 text-sm text-paroty-500 hover:text-paroty-700">
        ← Retour à la landing page
      </Link>
      <LoginForm />
    </div>
  )
}
