import React from 'react';

export default function LowStockBadge({ availableStock = 0, threshold = 5 }) {
  const stock = Number(availableStock);

  if (stock <= 0) {
    return (
      <span className="badge-status badge-out-of-stock" data-testid="out-of-stock-badge">
        Out of Stock
      </span>
    );
  }

  if (stock < threshold) {
    return (
      <span className="badge-status badge-low-stock pulsing" data-testid="low-stock-badge">
        Low Stock ({stock} left)
      </span>
    );
  }

  return (
    <span className="badge-status badge-in-stock" data-testid="in-stock-badge">
      In Stock ({stock})
    </span>
  );
}
