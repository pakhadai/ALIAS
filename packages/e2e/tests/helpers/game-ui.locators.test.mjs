/**
 * Regression guard: Playwright ignores `exact: true` for RegExp names.
 * Confirm patterns must not match lobby "add player" labels (t.addPlayer).
 * Keep regexes in sync with packages/e2e/tests/helpers/game-ui.ts exports.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

const addPlayerRe = /Додати гравця|Add Player|Spieler hinzufügen/i;
const addConfirmRe = /^(Додати|Add|Hinzufügen)$/i;
const addPlayerModalTitleRe = /^(Новий гравець|New Player|Neuer Spieler)$/i;
const startGameRe = /^(Почати гру|Start|Starten)$/i;
const joinTeamRe = /^(В команду|Join team|Zum Team)$/i;
const assignPlayerButtonRe = /^Assign .+$/i;
const lobbySettingsRulesTabRe = /^(Правила|Rules|Regeln)$/;

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

test('lobbySettingsRulesTabRe matches rules tab only (UA/DE/EN)', () => {
  for (const label of ['Правила', 'Rules', 'Regeln']) {
    assert.match(label, lobbySettingsRulesTabRe);
  }
  assert.doesNotMatch('Rules help', lobbySettingsRulesTabRe);
  assert.doesNotMatch('Правила гри', lobbySettingsRulesTabRe);
});

test('joinTeamRe matches team join, not menu join game', () => {
  for (const label of ['В команду', 'Join team', 'Zum Team']) {
    assert.match(label, joinTeamRe);
  }
  for (const label of ['Приєднатися', 'Join Game', 'Beitreten', 'Приєднатися до гри']) {
    assert.doesNotMatch(label, joinTeamRe, `team join must not match menu label: ${label}`);
  }
});

test('assignPlayerButtonRe matches Assign {name} only', () => {
  assert.match('Assign Offline Guest', assignPlayerButtonRe);
  assert.match('Assign E2E Host', assignPlayerButtonRe);
  assert.doesNotMatch('Додати гравця', assignPlayerButtonRe);
  assert.doesNotMatch('Join team', assignPlayerButtonRe);
});

test('startGameRe matches lobby start, not countdown or other controls', () => {
  for (const label of ['Почати гру', 'Start', 'Starten']) {
    assert.match(label, startGameRe);
  }
  for (const label of ['Starting…', 'Додати гравця', 'Add Player', 'Перемішати', 'Shuffle']) {
    assert.doesNotMatch(label, startGameRe, `start must not match: ${label}`);
  }
});
