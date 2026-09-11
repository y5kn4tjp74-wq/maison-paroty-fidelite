// Rendu SVG décoratif imitant un QR code, généré localement (aucune requête
// réseau). Le motif est déterministe à partir de `seed`, pas un vrai code
// scannable : le site n'a pas de backend à pointer.

const TAILLE_GRILLE = 17
const TAILLE_MODULE = 8
const MARGE = TAILLE_MODULE

function hashSeed(texte) {
  let h = 0
  for (let i = 0; i < texte.length; i++) {
    h = (h << 5) - h + texte.charCodeAt(i)
    h |= 0
  }
  return h
}

function creerGenerateur(graine) {
  let etat = graine % 2147483647
  if (etat <= 0) etat += 2147483646
  return () => {
    etat = (etat * 16807) % 2147483647
    return (etat - 1) / 2147483646
  }
}

function estZoneRepere(x, y) {
  const dansCoin = (cx, cy) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7
  return dansCoin(0, 0) || dansCoin(TAILLE_GRILLE - 7, 0) || dansCoin(0, TAILLE_GRILLE - 7)
}

function RepereCoin({ x, y }) {
  const px = MARGE + x * TAILLE_MODULE
  const py = MARGE + y * TAILLE_MODULE
  return (
    <g>
      <rect x={px} y={py} width={TAILLE_MODULE * 7} height={TAILLE_MODULE * 7} fill="var(--sombre)" />
      <rect
        x={px + TAILLE_MODULE}
        y={py + TAILLE_MODULE}
        width={TAILLE_MODULE * 5}
        height={TAILLE_MODULE * 5}
        fill="var(--blanc)"
      />
      <rect
        x={px + TAILLE_MODULE * 2}
        y={py + TAILLE_MODULE * 2}
        width={TAILLE_MODULE * 3}
        height={TAILLE_MODULE * 3}
        fill="var(--sombre)"
      />
    </g>
  )
}

export default function QRCodeDecoratif({ seed = 'maison-paroty-demo', taille = 168, className = '' }) {
  const suivant = creerGenerateur(hashSeed(seed) || 42)
  const modules = []

  for (let y = 0; y < TAILLE_GRILLE; y++) {
    for (let x = 0; x < TAILLE_GRILLE; x++) {
      if (estZoneRepere(x, y)) continue
      if (suivant() > 0.56) {
        modules.push(
          <rect
            key={`${x}-${y}`}
            x={MARGE + x * TAILLE_MODULE}
            y={MARGE + y * TAILLE_MODULE}
            width={TAILLE_MODULE}
            height={TAILLE_MODULE}
            fill="var(--sombre)"
          />,
        )
      }
    }
  }

  const cote = MARGE * 2 + TAILLE_GRILLE * TAILLE_MODULE

  return (
    <svg
      className={`qr-decoratif ${className}`}
      viewBox={`0 0 ${cote} ${cote}`}
      width={taille}
      height={taille}
      role="img"
      aria-label="QR code de fidélité Maison Paroty (illustration)"
    >
      <rect x="0" y="0" width={cote} height={cote} fill="var(--blanc)" />
      {modules}
      <RepereCoin x={0} y={0} />
      <RepereCoin x={TAILLE_GRILLE - 7} y={0} />
      <RepereCoin x={0} y={TAILLE_GRILLE - 7} />
    </svg>
  )
}
