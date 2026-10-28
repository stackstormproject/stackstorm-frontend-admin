const LKR = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const NUMBER = new Intl.NumberFormat('en-LK');
const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatMoney = (amount) => LKR.format(Number(amount) || 0);
const LKR_WHOLE = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
});
/** Whole rupees for headline figures, where cents are noise. */
export const formatMoneyWhole = (amount) => LKR_WHOLE.format(Math.round(Number(amount) || 0));
export const formatNumber = (value) => NUMBER.format(Number(value) || 0);
export const formatDate = (value) => (toDate(value) ? DATE.format(toDate(value)) : '—');
export const formatDateTime = (value) => (toDate(value) ? DATE_TIME.format(toDate(value)) : '—');

/** "processing" -> "Processing", "payment_pending" -> "Payment pending" */
export const humanize = (value) => {
  if (!value) return '';
  const text = String(value).replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Removes empty values so they are not sent as `?status=&search=`. */
export const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );

const DELIVERY_LABELS = { standard: 'Home delivery', pickup: 'Store pickup' };
export const deliveryLabel = (option) => DELIVERY_LABELS[option] || humanize(option);
