import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import { getInvoice, getOrder } from '../api/orders';
import { saveBlob } from '../lib/download';
import { useResource } from '../hooks/useResource';
import { useToast } from '../state/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorState, LoadingState } from '../components/ui/States';
import { StatusChangeDialog } from '../components/orders/StatusChangeDialog';
import { actionLabel, announceStatusChange } from '../lib/orderActions';
import { deliveryLabel, formatDate, formatDateTime, formatMoney } from '../lib/format';

const formatAddress = (address) =>
  address
    ? [
        address.line1,
        address.line2,
        address.city,
        address.district,
        address.postal_code,
        address.country,
      ]
        .filter(Boolean)
        .join(', ')
    : '—';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const order = useResource(() => getOrder(orderId), [orderId]);
  const [target, setTarget] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  if (order.loading && !order.data) return <LoadingState label="Loading the order" />;
  if (order.error) {
    return (
      <ErrorState
        level={1}
        title={order.error.status === 404 ? 'Order not found' : 'The order could not be loaded'}
        error={order.error}
        onRetry={order.error.status === 404 ? undefined : order.reload}
      />
    );
  }

  const { data } = order;
  const itemsTotal = data.items.reduce((sum, item) => sum + Number(item.subtotal), 0);

  const handleChanged = (result) => {
    setTarget(null);
    order.reload();
    announceStatusChange(toast, data.invoice_number, result);
  };

  // #179: the same PDF invoice the customer downloads.
  const downloadInvoice = async () => {
    setDownloading(true);
    try {
      saveBlob(await getInvoice(data.id), `${data.invoice_number}.pdf`);
    } catch (err) {
      toast.error(
        err.status === 409 ? 'The invoice is ready once the order is paid.' : err.message
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHeader
        back={{ to: '/orders', label: 'All orders' }}
        eyebrow={`Placed ${formatDateTime(data.order_date)}`}
        title={data.invoice_number}
        actions={[
          data.status !== 'payment_pending' && (
            <button
              key="invoice"
              type="button"
              className="btn btn--secondary"
              disabled={downloading}
              onClick={downloadInvoice}
            >
              <FileDown size={16} aria-hidden="true" />
              {downloading ? 'Preparing…' : 'Invoice (PDF)'}
            </button>
          ),
          ...data.allowed_statuses.map((status) => (
            <button
              key={status}
              type="button"
              className={`btn ${status === 'cancelled' ? 'btn--secondary' : 'btn--primary'}`}
              onClick={() => setTarget(status)}
            >
              {actionLabel(status, data)}
            </button>
          )),
        ].filter(Boolean)}
      />
      <p className="order-status">
        Status <StatusBadge status={data.status} />
        {data.allowed_statuses.length === 0 && (
          <span className="muted"> · No further changes are possible.</span>
        )}
      </p>

      <div className="detail-grid">
        <section className="card card--flush" aria-labelledby="items-title">
          <div className="card__header">
            <h2 id="items-title">Items</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Variant</th>
                  <th scope="col" className="num">
                    Qty
                  </th>
                  <th scope="col" className="num">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="line-item">
                        {item.primary_image && (
                          <img src={item.primary_image} alt="" className="line-item__image" />
                        )}
                        <span>
                          <Link to={`/products/${item.product_id}`}>{item.product_title}</Link>
                          {item.is_final_sale && <span className="cell-sub">Final sale</span>}
                        </span>
                      </div>
                    </td>
                    <td className="nowrap">
                      {item.size} · {item.color}
                      <span className="cell-sub mono">{item.sku}</span>
                    </td>
                    <td className="num">{item.quantity}</td>
                    <td className="num">
                      {formatMoney(item.subtotal)}
                      {item.quantity > 1 && (
                        <span className="cell-sub">{formatMoney(item.unit_price)} each</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="totals">
            <dt>Items</dt>
            <dd>{formatMoney(itemsTotal)}</dd>
            <dt>Delivery</dt>
            <dd>{Number(data.shipping_cost) ? formatMoney(data.shipping_cost) : 'Free'}</dd>
            {Number(data.discount_amount) > 0 && (
              <>
                <dt>Discount</dt>
                <dd>−{formatMoney(data.discount_amount)}</dd>
              </>
            )}
            {Number(data.tax_amount) > 0 && (
              <>
                <dt>Tax</dt>
                <dd>{formatMoney(data.tax_amount)}</dd>
              </>
            )}
            <dt className="totals__grand">Total</dt>
            <dd className="totals__grand">{formatMoney(data.total_amount)}</dd>
          </dl>
        </section>

        <div className="detail-side">
          <section className="card" aria-labelledby="customer-title">
            <h2 id="customer-title" className="card__title">
              Customer
            </h2>
            {data.is_guest ? (
              <dl className="details">
                <dt>Checkout</dt>
                <dd>Guest</dd>
                <dt>Email</dt>
                <dd>{data.guest_email}</dd>
              </dl>
            ) : (
              <dl className="details">
                <dt>Name</dt>
                <dd>
                  <Link to={`/customers/${data.customer.id}`}>{data.customer.name}</Link>
                </dd>
                <dt>Email</dt>
                <dd>{data.customer.email}</dd>
                <dt>Phone</dt>
                <dd>{data.customer.phone || '—'}</dd>
              </dl>
            )}
          </section>

          <section className="card" aria-labelledby="delivery-title">
            <h2 id="delivery-title" className="card__title">
              Delivery
            </h2>
            <dl className="details">
              <dt>Method</dt>
              <dd>{deliveryLabel(data.shipping_option)}</dd>
              {data.shipping_option !== 'pickup' && (
                <>
                  <dt>Ship to</dt>
                  <dd>{formatAddress(data.shipping_address)}</dd>
                </>
              )}
              <dt>Tracking</dt>
              <dd className="mono">{data.tracking_number || '—'}</dd>
              <dt>Delivered</dt>
              <dd>{formatDate(data.delivery_date)}</dd>
              <dt>Bill to</dt>
              <dd>{formatAddress(data.billing_address)}</dd>
            </dl>
            {data.notes && <p className="callout">{data.notes}</p>}
          </section>
        </div>
      </div>

      {target && (
        <StatusChangeDialog
          order={data}
          target={target}
          onClose={() => setTarget(null)}
          onChanged={handleChanged}
        />
      )}
    </>
  );
}
