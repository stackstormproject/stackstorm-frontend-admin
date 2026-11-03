import { getStockLogs } from '../../api/inventory';
import { useResource } from '../../hooks/useResource';
import { Dialog } from '../ui/Dialog';
import { EmptyState, ErrorState, LoadingState } from '../ui/States';
import { formatDateTime } from '../../lib/format';

/** Every stock change for one size, newest first, with who made it. */
export function StockHistoryDialog({ item, onClose }) {
  const logs = useResource(() => getStockLogs(item.variant_id), [item.variant_id]);
  return (
    <Dialog open wide title={`Stock history: ${item.sku}`} onClose={onClose}>
      {logs.loading && <LoadingState label="Loading history" />}
      {logs.error && <ErrorState error={logs.error} onRetry={logs.reload} />}
      {logs.data && logs.data.logs.length === 0 && <EmptyState title="No changes recorded yet" />}
      {logs.data && logs.data.logs.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col" className="num">
                  Change
                </th>
                <th scope="col">Reason</th>
                <th scope="col">By</th>
              </tr>
            </thead>
            <tbody>
              {logs.data.logs.map((log) => (
                <tr key={log.id}>
                  <td className="nowrap">{formatDateTime(log.created_at)}</td>
                  <td className={`num ${log.change_quantity > 0 ? 'delta--up' : 'delta--down'}`}>
                    {log.change_quantity > 0 ? `+${log.change_quantity}` : log.change_quantity}
                  </td>
                  <td>{log.reason}</td>
                  <td>{log.admin_name || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
}
