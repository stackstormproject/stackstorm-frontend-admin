import { formatMoney, humanize } from './format';

const ACTION_LABELS = {
  shipped: 'Mark as shipped',
  delivered: 'Mark as delivered',
  cancelled: 'Cancel order',
  processing: 'Start processing',
};

/** Button or menu label for moving `order` to `status`; a store pickup is "collected". */
export const actionLabel = (status, order) =>
  status === 'delivered' && order?.shipping_option === 'pickup'
    ? 'Mark as collected'
    : ACTION_LABELS[status] || humanize(status);

/** Tells the admin what a status change did, including the refund of a paid cancellation. */
export const announceStatusChange = (toast, invoiceNumber, result) => {
  toast.success(`${invoiceNumber} is now ${humanize(result.status).toLowerCase()}`);
  if (result.refund?.refunded) {
    toast.success(`Refunded ${formatMoney(result.refund.amount)} to the customer`);
  } else if (result.refund?.error) {
    toast.error(result.refund.error);
  }
};
