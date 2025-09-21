export const formatCurrency = (
  amount: number,
  currency: string = "$"
): string => {
  if (!amount || isNaN(amount)) return `0.00 ${currency}`;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
};
