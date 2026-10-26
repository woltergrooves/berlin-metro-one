// Unit-test voor src/state/SaveFormat.js (geen browser nodig). Usage: node tools/consolidation/saveformat-test.mjs
import assert from 'node:assert/strict';
import * as F from '../../src/state/SaveFormat.js';

const store = { 'berlin-economy-v4@main': JSON.stringify({ cash: 500, bank: 7800 }), 'berlin-discovery-v4@main': '{"discovered":{}}' };
const get = k => store[k] ?? null;
const v1 = { schema: 1, active: 'main', slots: {
  main: { id: 'main', label: 'Normale save', updatedAt: 5, data: { 'metro-economy-v2': JSON.stringify({ balanceCents: 8300, home: { day: 3 } }), berlinLifeCoreV1: JSON.stringify({ economy: { balanceCents: 8800 } }) } },
  test: { id: 'test', label: 'Bewaarde testsave', data: {} },
} };

const { registry, changed } = F.migrateRegistry(v1, get, 99);
assert.equal(changed, true);
assert.equal(registry.schema, 1, 'schema blijft 1: oudere code kan de saves nog openen');
assert.equal(registry.format, F.FORMAT);
const main = registry.slots.main;
assert.deepEqual(Object.keys(main.data).sort(), ['berlin-discovery-v4@main', 'berlin-economy-v4@main', 'berlin-state-v2', 'berlinLifeCoreV1', 'metro-economy-v2'].sort());
assert.equal(JSON.parse(main.data['berlin-state-v2']).wallet.cents, 8300, 'portemonnee = saldo dat de game tot nu toe toonde (metro-economy-v2)');
assert.deepEqual(F.describe(main), { day: 3, cents: 8300, done: 0 });
assert.deepEqual(registry.slots.test.data, {}, 'lege save blijft leeg');
assert.equal(F.migrateRegistry(registry, () => null, 100).changed, false, 'migratie is eenmalig');
assert.deepEqual(v1.slots.main.data['berlin-state-v2'], undefined, 'origineel register niet aangepast');
assert.equal(F.legacyBalance({ berlinLifeCoreV1: '{"economy":{"balanceCents":4200}}' }, 'x'), 4200);
assert.equal(F.legacyBalance({ 'berlin-economy-v4@x': '{"cash":100,"bank":50}' }, 'x'), 150);
assert.equal(F.legacyBalance({}, 'x'), null);
assert.deepEqual(F.capture('main', get), { 'berlin-economy-v4@main': store['berlin-economy-v4@main'], 'berlin-discovery-v4@main': store['berlin-discovery-v4@main'] });
console.log('SaveFormat: alle tests geslaagd');
