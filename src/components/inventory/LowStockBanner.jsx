import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import './LowStockBadge.css';

export default function LowStockBadge({ availableStock, threshold = 5 }) {
  const stock = Number(availableStock);

  if (isNaN(stock) || stock <= 0) {
    return (
      <span className="stock-badge badge-out-of-stock" data-testid="out-of-stock-badge">
        <XCircle size={12} />
        <span>Out of Stock</span>
      </span>
    );
  }

  if (stock < threshold) {
    return (
      <span className="stock-badge badge-low-stock pulsing" data-testid="low-stock-badge">
        <span className="pulse-dot"></span>
        <AlertTriangle size={12} />
        <span>Low Stock ({stock} left)</span>
      </span>
    );
  }

  return (
    <span className="stock-badge badge-in-stock" data-testid="in-stock-badge">
      <CheckCircle2 size={12} />
      <span>In Stock ({stock})</span>
    </span>
  );
}
