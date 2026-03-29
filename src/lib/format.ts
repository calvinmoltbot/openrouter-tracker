export const fmt = (n: number, d = 2) => '$' + n.toFixed(d)

export const fmtK = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : n.toLocaleString()
