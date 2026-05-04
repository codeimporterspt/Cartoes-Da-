export const fmtMoney = (value: number): string =>
  value.toFixed(2).replace('.', ',');
