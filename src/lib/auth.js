const SESSION_KEY = 'paroty_dashboard_session'

// Prototype-only credentials — replace with real auth before production use.
const VALID_USER = 'manager'
const VALID_PASS = 'demo123'

export function login(username, password) {
  if (username === VALID_USER && password === VALID_PASS) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: username, at: Date.now() }))
    return true
  }
  return false
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated() {
  try {
    return Boolean(sessionStorage.getItem(SESSION_KEY))
  } catch {
    return false
  }
}
