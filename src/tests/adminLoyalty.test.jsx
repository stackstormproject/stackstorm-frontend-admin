import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LoyaltyDistributionChart from '../components/loyalty/LoyaltyDistributionChart';
import PointsAdjustmentModal from '../components/loyalty/PointsAdjustmentModal';
import LoyaltyAccountsTable from '../components/loyalty/LoyaltyAccountsTable';
import LoyaltyConsolePage from '../pages/LoyaltyConsolePage';
import { FALLBACK_LOYALTY_ACCOUNTS } from '../api/adminLoyalty.api';

describe('STORM-FE-020: Loyalty Tier Review Console & 2-Quarter Grace Period Downgrade Management', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('/api/v1/loyalty/adjust') && opts?.method === 'POST') {
        const body = JSON.parse(opts.body || '{}');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                ...body,
                updatedAt: new Date().toISOString(),
              },
            }),
        });
      }
      if (url.includes('/api/v1/loyalty/audit') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                evaluatedAccounts: 8,
                downgradedCount: 1,
                warnedCount: 1,
              },
            }),
        });
      }
      if (url.includes('/api/v1/loyalty/accounts')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: { accounts: FALLBACK_LOYALTY_ACCOUNTS },
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  describe('AC1 & AC2: Tier Distribution SVG Donut Chart', () => {
    it('renders the SVG Donut chart with Silver, Gold, Platinum segments and percentages', () => {
      render(<LoyaltyDistributionChart accounts={FALLBACK_LOYALTY_ACCOUNTS} />);

      expect(screen.getByTestId('loyalty-distribution-chart')).toBeInTheDocument();
      expect(screen.getByTestId('donut-chart-svg')).toBeInTheDocument();
      expect(screen.getByTestId('chart-total-members')).toHaveTextContent('8');

      expect(screen.getByTestId('legend-platinum')).toHaveTextContent(/Platinum VIP/i);
      expect(screen.getByTestId('legend-gold')).toHaveTextContent(/Gold/i);
      expect(screen.getByTestId('legend-silver')).toHaveTextContent(/Silver/i);

      expect(screen.getByTestId('segment-platinum')).toBeInTheDocument();
      expect(screen.getByTestId('segment-gold')).toBeInTheDocument();
      expect(screen.getByTestId('segment-silver')).toBeInTheDocument();
    });
  });

  describe('AC3: Loyalty Console KPI Overview', () => {
    it('renders LoyaltyConsolePage with KPI cards for total members, tiers, and grace period', async () => {
      await act(async () => {
        render(<LoyaltyConsolePage />);
      });

      expect(screen.getByTestId('kpi-total-members')).toHaveTextContent('8');
      expect(screen.getByTestId('kpi-platinum')).toHaveTextContent('2');
      expect(screen.getByTestId('kpi-gold')).toHaveTextContent('3');
      expect(screen.getByTestId('kpi-silver')).toHaveTextContent('3');
      expect(screen.getByTestId('kpi-grace')).toHaveTextContent('2');
    });
  });

  describe('AC4: Loyalty Accounts Table & 2-Quarter Grace Status', () => {
    it('renders accounts table with customer spend, points, and accurate grace badges', () => {
      render(<LoyaltyAccountsTable accounts={FALLBACK_LOYALTY_ACCOUNTS} />);

      expect(screen.getByText('Kavindu Senanayake')).toBeInTheDocument();
      expect(screen.getByText('LKR 125,000.00')).toBeInTheDocument();
      expect(screen.getByText('1,250 pts')).toBeInTheDocument();

      // Kavindu -> maintained
      expect(screen.getAllByTestId('grace-badge-maintained').length).toBeGreaterThan(0);

      // Nimasha -> Q1 warning
      expect(screen.getByText('Nimasha Fernando')).toBeInTheDocument();
      expect(screen.getByTestId('grace-badge-q1-warning')).toBeInTheDocument();
      expect(screen.getByTestId('grace-badge-q1-warning')).toHaveTextContent('Q1 Grace Warning');

      // Thisara -> Q2 downgrade pending
      expect(screen.getByText('Thisara Perera')).toBeInTheDocument();
      expect(screen.getByTestId('grace-badge-downgrade-pending')).toBeInTheDocument();
      expect(screen.getByTestId('grace-badge-downgrade-pending')).toHaveTextContent(
        'Q2 Downgrade Pending'
      );
    });

    it('filters customer accounts by search query and tier pill buttons', () => {
      render(<LoyaltyAccountsTable accounts={FALLBACK_LOYALTY_ACCOUNTS} />);

      // Search filter
      const searchInput = screen.getByTestId('loyalty-search-input');
      fireEvent.change(searchInput, { target: { value: 'Nimasha' } });

      expect(screen.getByText('Nimasha Fernando')).toBeInTheDocument();
      expect(screen.queryByText('Kavindu Senanayake')).not.toBeInTheDocument();

      // Reset search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Kavindu Senanayake')).toBeInTheDocument();

      // Tab filter: Platinum
      const platTab = screen.getByTestId('tier-tab-platinum');
      fireEvent.click(platTab);
      expect(platTab).toHaveClass('active');
      expect(screen.getByText('Thisara Perera')).toBeInTheDocument();
      expect(screen.getByText('Sanduni Wickramasinghe')).toBeInTheDocument();
      expect(screen.queryByText('Kavindu Senanayake')).not.toBeInTheDocument();

      // Tab filter: Grace warnings
      const graceTab = screen.getByTestId('tier-tab-grace');
      fireEvent.click(graceTab);
      expect(graceTab).toHaveClass('active');
      expect(screen.getByText('Nimasha Fernando')).toBeInTheDocument();
      expect(screen.getByText('Thisara Perera')).toBeInTheDocument();
      expect(screen.queryByText('Sanduni Wickramasinghe')).not.toBeInTheDocument();
    });
  });

  describe('AC5: Points Adjustment Modal & Safety Bounds', () => {
    const mockAccount = FALLBACK_LOYALTY_ACCOUNTS[1]; // Nimasha Fernando: 620 pts

    it('validates points input and triggers onSubmit with credit details', async () => {
      const mockSubmit = vi.fn().mockResolvedValue({ success: true });
      const mockClose = vi.fn();

      render(
        <PointsAdjustmentModal
          isOpen={true}
          account={mockAccount}
          onClose={mockClose}
          onSubmit={mockSubmit}
        />
      );

      expect(screen.getByTestId('points-adjustment-modal')).toBeInTheDocument();
      expect(screen.getByText('Nimasha Fernando')).toBeInTheDocument();
      expect(screen.getAllByText(/620 pts/).length).toBeGreaterThan(0);

      // Click +250 chip
      const chip250 = screen.getByTestId('chip-250');
      fireEvent.click(chip250);

      // Verify preview
      expect(screen.getByTestId('preview-resulting-balance')).toHaveTextContent('870 pts');

      const submitBtn = screen.getByTestId('apply-points-btn');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-102',
          pointsDelta: 250,
        })
      );
      expect(mockClose).toHaveBeenCalled();
    });

    it('prevents debiting more points than the customer available balance', async () => {
      const mockSubmit = vi.fn();

      render(
        <PointsAdjustmentModal
          isOpen={true}
          account={mockAccount}
          onClose={vi.fn()}
          onSubmit={mockSubmit}
        />
      );

      // Switch to debit (-)
      const deductBtn = screen.getByTestId('btn-type-deduct');
      fireEvent.click(deductBtn);

      // Input 1000 pts (exceeds balance 620)
      const pointsInput = screen.getByTestId('points-input');
      fireEvent.change(pointsInput, { target: { value: '1000' } });

      const submitBtn = screen.getByTestId('apply-points-btn');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(screen.getByTestId('modal-error-alert')).toHaveTextContent(
        'Cannot deduct more points than customer balance (620 pts available).'
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('AC6: Quarterly Audit Sweep Execution', () => {
    it('triggers Quarterly Audit Sweep and applies tier downgrade for accounts with 2 quarters below spend', async () => {
      await act(async () => {
        render(<LoyaltyConsolePage />);
      });

      // Initially, Thisara Perera has Q2 Downgrade Pending
      expect(screen.getByTestId('grace-badge-downgrade-pending')).toBeInTheDocument();

      const auditBtn = screen.getByTestId('run-quarterly-audit-btn');
      await act(async () => {
        fireEvent.click(auditBtn);
      });

      // Verify toast notification
      expect(screen.getByTestId('loyalty-toast')).toHaveTextContent(
        /Quarterly Audit Sweep executed/i
      );

      // Thisara Perera (id: 3) should now be downgraded to gold, and Q2 Downgrade Pending should be resolved
      expect(screen.queryByTestId('grace-badge-downgrade-pending')).not.toBeInTheDocument();
      const thisaraRow = screen.getByTestId('loyalty-row-3');
      expect(thisaraRow).toHaveTextContent(/gold/i);
    });
  });
});
