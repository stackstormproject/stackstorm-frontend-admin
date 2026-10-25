import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LowStockBanner from './components/inventory/LowStockBanner';
import AgentChatStream from './components/support/AgentChatStream';

describe('smoke', () => {
  it('should run the test environment', () => {
    expect(1 + 1).toBe(2);
  });

  it('should render LowStockBanner across stock availability thresholds', () => {
    const { rerender } = render(React.createElement(LowStockBanner, { availableStock: 0 }));
    expect(screen.getByTestId('out-of-stock-badge')).toBeInTheDocument();

    rerender(React.createElement(LowStockBanner, { availableStock: 3, threshold: 5 }));
    expect(screen.getByTestId('low-stock-badge')).toBeInTheDocument();

    rerender(React.createElement(LowStockBanner, { availableStock: 20, threshold: 5 }));
    expect(screen.getByTestId('in-stock-badge')).toBeInTheDocument();
  });

  it('should render AgentChatStream component wrapper', () => {
    render(
      React.createElement(AgentChatStream, {
        session: {
          id: 'CS-001',
          customer_name: 'Saman Silva',
          status: 'active',
          messages: [],
        },
      })
    );
    expect(screen.getByText('Saman Silva')).toBeInTheDocument();
  });
});
