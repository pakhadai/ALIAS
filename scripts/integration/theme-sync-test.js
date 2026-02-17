const { io } = require('socket.io-client');

const SERVER = process.env.SERVER_URL || 'http://localhost:3001';
const TIMEOUT_MS = 10000;

function waitForEvent(socket, event) {
  return new Promise((resolve) => {
    socket.once(event, (data) => resolve(data));
  });
}

(async () => {
  console.log('[Test] server=', SERVER);

  const host = io(SERVER, { reconnection: false });
  await new Promise((res) => host.once('connect', res));
  console.log('[Test] host connected', host.id);

  host.on('room:error', (e) => console.error('[Host] room:error', e));
  host.on('game:state-sync', (s) => console.log('[Host] state-sync', JSON.stringify(s.settings)));

  host.emit('room:create', { playerName: 'Host', avatar: '🧑' });
  const created = await waitForEvent(host, 'room:created');
  console.log('[Test] room created', created);
  const roomCode = created.roomCode;

  // connect second client
  const client = io(SERVER, { reconnection: false });
  await new Promise((res) => client.once('connect', res));
  console.log('[Test] client connected', client.id);

  client.on('room:error', (e) => console.error('[Client] room:error', e));

  let initialTheme = null;
  let gotUpdated = false;

  client.on('game:state-sync', (state) => {
    console.log('[Client] state-sync received settings.theme=', state.settings?.theme);
    if (!initialTheme) initialTheme = state.settings?.theme;
    if (state.settings?.theme === 'PREMIUM_LIGHT') {
      gotUpdated = true;
    }
  });

  client.emit('room:join', { roomCode, playerName: 'Player2', avatar: '🐱' });
  await waitForEvent(client, 'room:joined');
  console.log('[Test] client joined room');

  // give some time to receive initial state
  await new Promise((r) => setTimeout(r, 500));
  console.log('[Test] initial theme on client:', initialTheme);

  // host -> update settings (change theme)
  console.log('[Test] host sending UPDATE_SETTINGS -> PREMIUM_LIGHT');
  host.emit('game:action', { action: 'UPDATE_SETTINGS', data: { theme: 'PREMIUM_LIGHT' } });

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (gotUpdated) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  if (gotUpdated) {
    console.log('[Test] SUCCESS: client received updated theme');
    process.exit(0);
  } else {
    console.error('[Test] FAILURE: client did not receive updated theme in time');
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
