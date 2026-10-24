import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import App from '../App'
import AdminLayout from '../components/layout/AdminLayout'
import fs from 'fs'
import path from 'path'

describe('STORM-FE-003: Admin Portal React 18 + Vite Scaffolding & Dark Control Room Design System', () => {
  beforeEach(() => {
    // Mock global fetch for health check
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/v1/health') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            data: { uptime: 300, status: 'operational' },
            message: 'StackStorm Backend Connected',
          }),
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  it('AC1: should mount App component without throwing exceptions', async () => {
    let container
    await act(async () => {
      const res = render(<App />)
      container = res.container
    })
    expect(container).toBeTruthy()
    expect(screen.getByText(/Executive Operations Dashboard/i)).toBeInTheDocument()
  })

  it('AC2: should define required dark control room CSS Custom Properties in admin-tokens.css', () => {
    const tokensPath = path.resolve(__dirname, '../styles/admin-tokens.css')
    const tokensContent = fs.readFileSync(tokensPath, 'utf8')

    // Dark surfaces
    expect(tokensContent).toContain('--admin-bg: #0B0F19;')
    expect(tokensContent).toContain('--admin-card: #151D2F;')
    expect(tokensContent).toContain('--admin-primary: #38BDF8;')
    expect(tokensContent).toContain('--admin-accent: #D4AF37;')

    // Status colors
    expect(tokensContent).toContain('--admin-success: #10B981;')
    expect(tokensContent).toContain('--admin-danger: #EF4444;')

    // Dimensions
    expect(tokensContent).toContain('--sidebar-width: 260px;')
    expect(tokensContent).toContain('--sidebar-collapsed: 76px;')
  })

  it('AC3: should render all 6 core administrative operations links in the sidebar', async () => {
    await act(async () => {
      render(<App />)
    })

    const sidebar = screen.getByRole('complementary', { name: /admin navigation sidebar/i })
    expect(sidebar).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /dashboard & kpis/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /inventory & skus/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /order fulfillment/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /30-day returns/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /loyalty tiers/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /live support chat/i })).toBeInTheDocument()
  })

  it('AC3: should switch active operational view when a navigation item is clicked', async () => {
    await act(async () => {
      render(<App />)
    })

    // Click on Inventory & SKUs
    const inventoryBtn = screen.getByRole('button', { name: /inventory & skus/i })
    await act(async () => {
      fireEvent.click(inventoryBtn)
    })

    expect(screen.getByText(/Inventory & SKU Restock Matrix/i)).toBeInTheDocument()

    // Click on Orders
    const ordersBtn = screen.getByRole('button', { name: /order fulfillment/i })
    await act(async () => {
      fireEvent.click(ordersBtn)
    })

    expect(screen.getByText(/Order Fulfillment Console/i)).toBeInTheDocument()
  })

  it('AC4: should toggle sidebar collapse state when collapse button is triggered', async () => {
    let container
    await act(async () => {
      const res = render(<AdminLayout currentTab="dashboard"><div>Content</div></AdminLayout>)
      container = res.container
    })

    const sidebar = container.querySelector('.admin-sidebar')
    expect(sidebar).not.toHaveClass('collapsed')

    const toggleBtn = screen.getByRole('button', { name: /collapse sidebar/i })
    await act(async () => {
      fireEvent.click(toggleBtn)
    })

    expect(sidebar).toHaveClass('collapsed')
  })

  it('AC5: should display 4 KPI metric cards and backend gateway connectivity', async () => {
    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText(/Total Monthly Revenue/i)).toBeInTheDocument()
    expect(screen.getByText('LKR 845,200.00')).toBeInTheDocument()
    expect(screen.getByText(/Active Orders Fulfilled/i)).toBeInTheDocument()
    expect(screen.getByText(/Low-Stock SKU Alerts/i)).toBeInTheDocument()
    expect(screen.getByText(/Live Support Queue/i)).toBeInTheDocument()
  })

  it('AC6: should display student engineering team credits in the admin portal footer', async () => {
    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText(/Amarawickrama R.H./i)).toBeInTheDocument()
    expect(screen.getAllByText(/S. Thanoogithan/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/B.K. Pabasara/i)).toBeInTheDocument()
    expect(screen.getByText(/Lakshani A.T./i)).toBeInTheDocument()
  })
})
