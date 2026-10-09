import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ipDeLaRed } from './dev-red.mjs';

test('elige la IPv4 del wifi y descarta loopback e IPv6', () => {
  const ip = ipDeLaRed({
    lo0: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    utun3: [{ family: 'IPv4', address: '100.64.0.2', internal: false }],
    en0: [
      { family: 'IPv6', address: 'fe80::1', internal: false },
      { family: 'IPv4', address: '192.168.0.15', internal: false },
    ],
  });
  assert.equal(ip, '192.168.0.15');
});

test('sin red devuelve null', () => {
  assert.equal(ipDeLaRed({ lo0: [{ family: 'IPv4', address: '127.0.0.1', internal: true }] }), null);
});
