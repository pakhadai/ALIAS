/**
 * Regression guard: Playwright ignores `exact: true` for RegExp names.
 * Confirm patterns must not match lobby "add player" labels (t.addPlayer).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

const addPlayerRe = /Додати гравця|Add Player|Spieler hinzufügen/i;
const addConfirmRe = /^(Додати|Add|Hinzufügen)$/i;
const addPlayerModalTitleRe = /^(Новий гравець|New Player|Neuer Spieler)$/i;

const lobbyAddPlayerLabels = [
  'Додати гравця',
  'Додати гравця (2/8)',
  'Add Player',
  'Spieler hinzufügen',
];

const modalConfirmLabels = ['Додати', 'Add', 'Hinzufügen'];

test('addConfirmRe matches modal confirm only (whole accessible name)', () => {
  for (const label of modalConfirmLabels) {
    assert.match(label, addConfirmRe, `expected confirm match: ${label}`);
  }
  for (const label of lobbyAddPlayerLabels) {
    assert.doesNotMatch(label, addConfirmRe, `confirm regex must not match lobby label: ${label}`);
  }
});

test('addPlayerRe matches lobby control labels', () => {
  for (const label of lobbyAddPlayerLabels) {
    assert.match(label, addPlayerRe, `expected lobby match: ${label}`);
  }
  for (const label of modalConfirmLabels) {
    assert.doesNotMatch(label, addPlayerRe, `lobby regex must not match modal confirm: ${label}`);
  }
});

test('addPlayerModalTitleRe matches sheet heading copy', () => {
  for (const title of ['Новий гравець', 'New Player', 'Neuer Spieler']) {
    assert.match(title, addPlayerModalTitleRe);
  }
});

const roundTimeMinusButtonRe = /^(Час|Zeit|Time) −10$/;

test('roundTimeMinusButtonRe matches stepper aria-label only', () => {
  for (const label of ['Час −10', 'Zeit −10', 'Time −10']) {
    assert.match(label, roundTimeMinusButtonRe);
  }
  assert.doesNotMatch('Час −10 extra', roundTimeMinusButtonRe);
  assert.doesNotMatch('Додати гравця', roundTimeMinusButtonRe);
});

test('lobbySettingsRulesTabRe does not match rules help titles', () => {
  const rulesTabRe = /^Правила$/;
  assert.match('Правила', rulesTabRe);
  assert.doesNotMatch('Rules', rulesTabRe);
  assert.doesNotMatch('Regeln', rulesTabRe);
});
