/** H-42: `skip`/`take` con máximo 100, igual que el resto de los listados. */
export function paginacion(skipParam: string | undefined, takeParam: string | undefined, porDefecto = 20) {
  return {
    skip: Math.max(0, Number(skipParam) || 0),
    take: Math.min(100, Math.max(1, Number(takeParam) || porDefecto)),
  };
}
