/**
 * Admin Loyalty & 2-Quarter Grace Period Operations API Client Service
 * StackStorm E-Commerce Platform — Dickwella Fashion Corner
 * Module Owner: Lakshani A.T.
 */

import apiClient from './client';

export const FALLBACK_LOYALTY_ACCOUNTS = [
  {
    id: 1,
    customer_id: 'cust-101',
    customer_name: 'Kavindu Senanayake',
    customer_email: 'kavindu@gmail.com',
    tier: 'gold',
    annual_spend: 125000,
    annual_spend_formatted: 'LKR 125,000.00',
    tier_threshold: 100000,
    points_balance: 1250,
    quarters_below_spend: 0,
    grace_period_status: 'maintained', // 'maintained' | 'warning' | 'downgrade_pending'
    joined_date: '2025-06-15',
    last_evaluated: '2026-09-30',
  },
  {
    id: 2,
    customer_id: 'cust-102',
    customer_name: 'Nimasha Fernando',
    customer_email: 'nimasha.f@outlook.com',
    tier: 'gold',
    annual_spend: 82000,
    annual_spend_formatted: 'LKR 82,000.00',
    tier_threshold: 100000,
    points_balance: 620,
    quarters_below_spend: 1,
    grace_period_status: 'warning', // 1 quarter below spend threshold
    joined_date: '2025-01-20',
    last_evaluated: '2026-09-30',
  },
  {
    id: 3,
    customer_id: 'cust-103',
    customer_name: 'Thisara Perera',
    customer_email: 'thisara@yahoo.com',
    tier: 'platinum',
    annual_spend: 210000,
    annual_spend_formatted: 'LKR 210,000.00',
    tier_threshold: 250000,
    points_balance: 3450,
    quarters_below_spend: 2,
    grace_period_status: 'downgrade_pending', // 2 consecutive quarters below -> Downgrade pending
    joined_date: '2024-11-10',
    last_evaluated: '2026-09-30',
  },
  {
    id: 4,
    customer_id: 'cust-104',
    customer_name: 'Sanduni Wickramasinghe',
    customer_email: 'sanduni.w@gmail.com',
    tier: 'platinum',
    annual_spend: 345000,
    annual_spend_formatted: 'LKR 345,000.00',
    tier_threshold: 250000,
    points_balance: 5120,
    quarters_below_spend: 0,
    grace_period_status: 'maintained',
    joined_date: '2024-08-05',
    last_evaluated: '2026-09-30',
  },
  {
    id: 5,
    customer_id: 'cust-105',
    customer_name: 'Ruwani Jayawardena',
    customer_email: 'ruwani.j@hotmail.com',
    tier: 'silver',
    annual_spend: 42000,
    annual_spend_formatted: 'LKR 42,000.00',
    tier_threshold: 0,
    points_balance: 420,
    quarters_below_spend: 0,
    grace_period_status: 'maintained',
    joined_date: '2026-02-14',
    last_evaluated: '2026-09-30',
  },
  {
    id: 6,
    customer_id: 'cust-106',
    customer_name: 'Dinuka Bandara',
    customer_email: 'dinuka.b@gmail.com',
    tier: 'silver',
    annual_spend: 18500,
    annual_spend_formatted: 'LKR 18,500.00',
    tier_threshold: 0,
    points_balance: 180,
    quarters_below_spend: 0,
    grace_period_status: 'maintained',
    joined_date: '2026-05-22',
    last_evaluated: '2026-09-30',
  },
  {
    id: 7,
    customer_id: 'cust-107',
    customer_name: 'Chamari Atapattu',
    customer_email: 'chamari.a@gmail.com',
    tier: 'gold',
    annual_spend: 145000,
    annual_spend_formatted: 'LKR 145,000.00',
    tier_threshold: 100000,
    points_balance: 1450,
    quarters_below_spend: 0,
    grace_period_status: 'maintained',
    joined_date: '2025-04-10',
    last_evaluated: '2026-09-30',
  },
  {
    id: 8,
    customer_id: 'cust-108',
    customer_name: 'Mahesh Theekshana',
    customer_email: 'mahesh.t@gmail.com',
    tier: 'silver',
    annual_spend: 65000,
    annual_spend_formatted: 'LKR 65,000.00',
    tier_threshold: 0,
    points_balance: 650,
    quarters_below_spend: 0,
    grace_period_status: 'maintained',
    joined_date: '2026-01-18',
    last_evaluated: '2026-09-30',
  },
];

export const adminLoyaltyApi = {
  /**
   * Fetches all customer loyalty accounts
   */
  async getAccounts(params = {}) {
    const { data } = await apiClient.get('/loyalty/accounts', { params });
    const accounts = data?.accounts || (Array.isArray(data) ? data : []);
    return accounts;
  },

  getLoyaltyAccounts(params = {}) {
    return this.getAccounts(params);
  },

  /**
   * Manually adjusts customer loyalty points balance with audit reason
   */
  async adjustPoints({ customerId, pointsDelta, reason, notes = '' }) {
    const { data } = await apiClient.post('/loyalty/adjust', {
      customerId,
      pointsDelta,
      reason,
      notes,
    });
    return data;
  },

  /**
   * Triggers quarterly audit sweep enforcing 2-quarter grace period
   */
  async triggerQuarterlyAudit(auditDate = new Date().toISOString()) {
    const { data } = await apiClient.post('/loyalty/audit', { audit_date: auditDate });
    return data;
  },
};
