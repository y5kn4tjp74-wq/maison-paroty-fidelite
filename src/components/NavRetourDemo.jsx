import { useEffect, useState } from 'react'

export default function NavRetourDemo() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accroche = document.querySelector('.accroche')
    const demo = document.getElementById('demo')
    const pied = document.querySelector('.pied-de-page')
    if (!accroche || !demo || !pied) return undefined

    const etats = { accroche: true, demo: false, pied: false }

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.target === accroche) etats.accroche = entree.isIntersecting
          if (entree.target === demo) etats.demo = entree.isIntersecting
          if (entree.target === pied) etats.pied = entree.isIntersecting
        }
        setVisible(!etats.accroche && !etats.demo && !etats.pied)
      },
      { threshold: 0 },
    )
    observateur.observe(accroche)
    observateur.observe(demo)
    observateur.observe(pied)
    return () => observateur.disconnect()
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      className="nav-retour-demo"
      onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
    >
      Revoir la démo
    </button>
  )
}
