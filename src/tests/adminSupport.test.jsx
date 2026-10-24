import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SessionQueue from '../components/support/SessionQueue';
import AgentChatWindow from '../components/support/AgentChatWindow';
import SupportConsolePage, { FALLBACK_SUPPORT_SESSIONS } from '../pages/SupportConsolePage';
import adminSocketService from '../services/adminSocket.service';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    id: 'mock-socket-id',
  })),
}));

vi.mock('../services/adminSocket.service', () => {
  const listeners = new Map();
  const mockService = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    joinSession: vi.fn(),
    sendMessage: vi.fn(),
    sendTyping: vi.fn(),
    leaveSession: vi.fn(),
    on: vi.fn((event, handler) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => listeners.get(event)?.delete(handler);
    }),
    off: vi.fn((event, handler) => {
      listeners.get(event)?.delete(handler);
    }),
  };

  return {
    adminSocketService: mockService,
    default: mockService,
  };
});

describe('STORM-FE-022: Admin Real-Time Support Console & Active Session Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Dual-Panel Support Console & KPI Metrics', () => {
    it('renders dual-panel layout with customer session queue and active chat stream', async () => {
      await act(async () => {
        render(<SupportConsolePage />);
      });

      expect(screen.getByTestId('support-console-page')).toBeInTheDocument();
      expect(screen.getByTestId('session-queue-panel')).toBeInTheDocument();
      expect(screen.getByTestId('agent-chat-window')).toBeInTheDocument();

      // Assert 4 KPI Cards
      expect(screen.getByTestId('kpi-waiting-queue')).toHaveTextContent('1');
      expect(screen.getByTestId('kpi-active-chats')).toHaveTextContent('1');
      expect(screen.getByTestId('kpi-resolved-inquiries')).toHaveTextContent('1');
      expect(screen.getByTestId('kpi-response-speed')).toHaveTextContent('38s');
    });
  });

  describe('AC2: Session Queue Filtering & Search', () => {
    it('filters queue items by status tabs and keyword search query', () => {
      const mockSelect = vi.fn();
      const mockAccept = vi.fn();

      render(
        <SessionQueue
          sessions={FALLBACK_SUPPORT_SESSIONS}
          selectedSessionId="session-102"
          onSelectSession={mockSelect}
          onAcceptSession={mockAccept}
          isChimeEnabled={true}
          onToggleChime={vi.fn()}
        />
      );

      // Verify all 3 sessions visible in 'all' tab
      expect(screen.getByText('Nimasha Fernando')).toBeInTheDocument();
      expect(screen.getByText('Thisara Perera')).toBeInTheDocument();
      expect(screen.getByText('Sanduni Wickramasinghe')).toBeInTheDocument();

      // Click 'Waiting' tab -> only pending session (Nimasha) shown
      const pendingTab = screen.getByTestId('queue-tab-pending');
      fireEvent.click(pendingTab);

      expect(screen.getByText('Nimasha Fernando')).toBeInTheDocument();
      expect(screen.queryByText('Thisara Perera')).not.toBeInTheDocument();
      expect(screen.queryByText('Sanduni Wickramasinghe')).not.toBeInTheDocument();

      // Return to 'All' and test keyword search
      const allTab = screen.getByTestId('queue-tab-all');
      fireEvent.click(allTab);

      const searchInput = screen.getByTestId('session-search-input');
      fireEvent.change(searchInput, { target: { value: 'Thisara' } });

      expect(screen.getByText('Thisara Perera')).toBeInTheDocument();
      expect(screen.queryByText('Nimasha Fernando')).not.toBeInTheDocument();
    });
  });

  describe('AC3: Accept Chat Workflow & Room Binding', () => {
    it('transitions pending session to active when agent clicks Accept Chat', async () => {
      await act(async () => {
        render(<SupportConsolePage />);
      });

      // Find 'Accept Chat' button on Nimasha's pending session
      const acceptBtn = screen.getByTestId('accept-chat-btn-session-101');
      expect(acceptBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(acceptBtn);
      });

      // Session 101 should now be joined via socket service
      expect(adminSocketService.joinSession).toHaveBeenCalledWith('session-101');

      // The active chat window should switch to Nimasha Fernando
      expect(screen.getByTestId('chat-header-customer')).toHaveTextContent('Nimasha Fernando');
    });
  });

  describe('AC4: Canned Responses & Typing Indicators', () => {
    const mockActiveSession = FALLBACK_SUPPORT_SESSIONS[1]; // Thisara Perera (active)

    it('allows inserting canned responses and sending messages with typing broadcasts', () => {
      const mockSendMessage = vi.fn();
      const mockTyping = vi.fn();

      render(
        <AgentChatWindow
          session={mockActiveSession}
          onSendMessage={mockSendMessage}
          isCustomerTyping={false}
          onResolveSession={vi.fn()}
          onTyping={mockTyping}
        />
      );

      expect(screen.getByTestId('agent-chat-window')).toBeInTheDocument();
      expect(screen.getAllByText('Thisara Perera').length).toBeGreaterThan(0);

      // Select canned response: Standard Greeting
      const cannedSelect = screen.getByTestId('canned-response-select');
      fireEvent.change(cannedSelect, { target: { value: 'greeting' } });

      const input = screen.getByTestId('chat-message-input');
      expect(input.value).toContain('Hello! Thank you for reaching out to Dickwella Fashion Corner');

      // Submit message
      const sendBtn = screen.getByTestId('send-message-btn');
      fireEvent.click(sendBtn);

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Hello! Thank you for reaching out')
      );
      expect(input.value).toBe('');
    });

    it('renders customer typing indicator when customer is typing', () => {
      render(
        <AgentChatWindow
          session={mockActiveSession}
          onSendMessage={vi.fn()}
          isCustomerTyping={true}
          onResolveSession={vi.fn()}
          onTyping={vi.fn()}
        />
      );

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent(/Customer is typing/i);
    });
  });
});
