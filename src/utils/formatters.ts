export function formatPoints(points: number): string {
  return `${points.toLocaleString('pt-BR')} pts`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('pt-BR');
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
