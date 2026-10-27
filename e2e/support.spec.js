import { test, expect } from '@playwright/test';
import { io } from 'socket.io-client';
import { API_URL, hasCredentials, signIn } from './helpers';

test.skip(!hasCredentials, 'Set E2E_ADMIN_PASSWORD to run the admin E2E suite');

const SOCKET_URL = process.env.E2E_SOCKET_URL || new URL(API_URL).origin;

/** A guest shopper on the storefront chat, driven over the real socket. */
function guestShopper() {
  const socket = io(SOCKET_URL, { transports: ['websocket'] });
  const received = [];
  socket.on('chat:message', (message) => received.push(message));
  const emit = (event, data) =>
    new Promise((resolve) => {
      socket.emit(event, data, resolve);
    });
  return {
    received,
    connected: new Promise((resolve) => {
      socket.on('connect', resolve);
    }),
    async askForAgent(text) {
      const joined = await emit('chat:join', { subject: 'Help' });
      await emit('chat:message', { sessionId: joined.sessionId, message: text });
      return joined.sessionId;
    },
    close: () => socket.disconnect(),
  };
}

test('a support agent takes a waiting chat, replies and resolves it', async ({ page }) => {
  const shopper = guestShopper();
  await shopper.connected;

  await signIn(page, 'agent');
  const question = `I want to speak to an agent about order ${Date.now()}`;
  const sessionId = await shopper.askForAgent(question);

  await page.goto(`/support?session=${sessionId}`);
  const conversation = page.getByRole('region', { name: 'Storefront Guest' });
  await expect(conversation.getByText(question)).toBeVisible();

  await conversation.getByRole('button', { name: 'Take this chat' }).click();
  const reply = conversation.getByLabel(/Reply to/);
  await expect(reply).toBeEnabled();
  await reply.fill('Hello, I can help with that.');
  await reply.press('Enter');

  await expect(conversation.getByText('Hello, I can help with that.')).toBeVisible();
  await expect
    .poll(() => shopper.received.map((m) => m.message))
    .toContain('Hello, I can help with that.');

  await conversation.getByRole('button', { name: 'Mark resolved' }).click();
  await expect(conversation.getByText('This conversation is resolved.')).toBeVisible();
  shopper.close();
});
