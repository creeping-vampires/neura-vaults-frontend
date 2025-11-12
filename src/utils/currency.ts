export const formatCurrency = (
  amount: number,
  currency: string = "$"
): string => {
  if (!amount || isNaN(amount)) return `0.00 ${currency}`;

  let formatted: string;
  if (amount >= 1_000_000) {
    formatted = (amount / 1_000_000) + "M";
  } else if (amount >= 1_000) {
    formatted = (amount / 1_000) + "K";
  } else {
    formatted = amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return `${formatted} ${currency}`;
};
