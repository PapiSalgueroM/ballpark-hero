import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const EPS = 2;
const tokens = value => new Set((value || '').split(/\s+/));
const fullShell = value => ['fixed', 'inset-0', 'flex', 'items-center', 'justify-center'].every(token => tokens(value).has(token));
const px = value => { assert(typeof value === 'string' && /^-?[0-9]+(?:\.[0-9]+)?px$/.test(value), 'MATRIX_CSS_LENGTH'); return Number(value.slice(0, -2)); };
const near = (actual, expected, marker) => assert(Math.abs(actual - expected) <= EPS, marker);

export function styleProof(detail) {
  assert(detail.cssSupportsHas === true, 'MATRIX_CSS_HAS_SUPPORT');
  assert.equal(detail.cardCSS?.boxSizing, 'border-box', 'MATRIX_CSS_CARD_BOX');
  const V = detail.actualViewport.innerHeight, card = detail.card;
  assert(card && card.height > 0 && card.top >= -EPS && card.bottom <= V + EPS, 'MATRIX_CSS_CARD_VIEWPORT');
  if (detail.embedded) {
    assert.equal(detail.pending, null, 'MATRIX_CSS_EMBEDDED_PENDING');
    return { mode: 'embedded', cssSupportsHas: true, cardBoxSizing: detail.cardCSS.boxSizing };
  }
  assert.equal(detail.pending, '1', 'MATRIX_CSS_PENDING');
  assert.equal(detail.bannerPosition, 'fixed', 'MATRIX_CSS_FIXED_BANNER');
  const H = px(detail.consentHeight), cap = V - H - 24;
  assert(cap > 0, 'MATRIX_CSS_POSITIVE_AREA');
  near(px(detail.cardCSS.maxHeight), cap, 'MATRIX_CSS_CARD_CAP');
  assert(card.height <= cap + EPS && card.top >= 12 - EPS && card.bottom <= V - H - 12 + EPS, 'MATRIX_CSS_CARD_RESERVED_AREA');
  const parent = detail.dialogAncestors.find(node => fullShell(node.class));
  const manual = detail.dialogCSS.position === 'static' || fullShell(parent?.class);
  if (manual) {
    assert(parent, 'MATRIX_CSS_MANUAL_PARENT');
    assert.equal(parent.css.boxSizing, 'border-box', 'MATRIX_CSS_SHELL_BOX');
    assert.equal(parent.css.position, 'fixed', 'MATRIX_CSS_SHELL_FIXED');
    near(parent.rect.top, 0, 'MATRIX_CSS_SHELL_TOP'); near(parent.rect.bottom, V, 'MATRIX_CSS_SHELL_BOTTOM');
    near(px(parent.css.paddingTop), 12, 'MATRIX_CSS_SHELL_PADDING_TOP');
    near(px(parent.css.paddingBottom), H + 12, 'MATRIX_CSS_SHELL_PADDING_BOTTOM');
    assert.equal(parent.css.maxHeight, 'none', 'MATRIX_CSS_SHELL_UNCAPPED');
    return { mode: 'manual-parent', cap, H, V, parent };
  }
  if (detail.dialogCSS.position === 'fixed' && detail.card.height !== detail.dialog.height) {
    const shell = detail.dialogCSS;
    assert.equal(shell.boxSizing, 'border-box', 'MATRIX_CSS_SHELL_BOX');
    near(detail.dialog.top, 0, 'MATRIX_CSS_SHELL_TOP'); near(detail.dialog.bottom, V, 'MATRIX_CSS_SHELL_BOTTOM');
    near(px(shell.paddingTop), 12, 'MATRIX_CSS_SHELL_PADDING_TOP');
    near(px(shell.paddingBottom), H + 12, 'MATRIX_CSS_SHELL_PADDING_BOTTOM');
    assert.equal(shell.maxHeight, 'none', 'MATRIX_CSS_SHELL_UNCAPPED');
    return { mode: 'manual-role-shell', cap, H, V };
  }
  assert.equal(detail.dialogCSS.position, 'fixed', 'MATRIX_CSS_FIXED_CARD');
  near(px(detail.dialogCSS.top), (V - H) / 2, 'MATRIX_CSS_FIXED_CARD_TOP');
  const matrix = /^matrix\(([^)]+)\)$/.exec(detail.dialogCSS.transform);
  assert(matrix, 'MATRIX_CSS_TRANSLATION');
  const parts = matrix[1].split(',').map(Number);
  assert.equal(parts.length, 6, 'MATRIX_CSS_TRANSLATION');
  near(parts[5], -card.height / 2, 'MATRIX_CSS_TRANSLATION');
  return { mode: 'fixed-card', cap, H, V };
}

export function styleControls(detail, caseId) {
  const normal = styleProof(detail), clone = () => structuredClone(detail), mutants = [];
  const add = (name, marker, change) => { const changed = clone(); change(changed); mutants.push([name, marker, changed]); };
  add('has-unsupported', 'MATRIX_CSS_HAS_SUPPORT', d => { d.cssSupportsHas = false; });
  add('content-box-card', 'MATRIX_CSS_CARD_BOX', d => { d.cardCSS.boxSizing = 'content-box'; });
  add('card-outside-viewport', 'MATRIX_CSS_CARD_VIEWPORT', d => { d.card.bottom = d.actualViewport.innerHeight + EPS + 1; });
  if (normal.mode !== 'embedded') {
    add('wrong-card-cap', 'MATRIX_CSS_CARD_CAP', d => { d.cardCSS.maxHeight = String(normal.cap + EPS + 1) + 'px'; });
    add('card-too-tall', 'MATRIX_CSS_CARD_RESERVED_AREA', d => { d.card.height = normal.cap + EPS + 1; });
    if (normal.mode === 'fixed-card') {
      add('wrong-fixed-top', 'MATRIX_CSS_FIXED_CARD_TOP', d => { d.dialogCSS.top = String((normal.V - normal.H) / 2 + EPS + 1) + 'px'; });
      add('wrong-translation', 'MATRIX_CSS_TRANSLATION', d => { d.dialogCSS.transform = 'matrix(1,0,0,1,0,0)'; });
    } else {
      const shell = d => normal.mode === 'manual-parent' ? d.dialogAncestors.find(node => fullShell(node.class)) : { css: d.dialogCSS, rect: d.dialog };
      add('content-box-shell', 'MATRIX_CSS_SHELL_BOX', d => { shell(d).css.boxSizing = 'content-box'; });
      add('wrong-shell-top', 'MATRIX_CSS_SHELL_TOP', d => { shell(d).rect.top = EPS + 1; });
      add('missing-top-padding', 'MATRIX_CSS_SHELL_PADDING_TOP', d => { shell(d).css.paddingTop = '0px'; });
      add('missing-banner-padding', 'MATRIX_CSS_SHELL_PADDING_BOTTOM', d => { shell(d).css.paddingBottom = '0px'; });
      add('recapped-shell', 'MATRIX_CSS_SHELL_UNCAPPED', d => { shell(d).css.maxHeight = '1px'; });
    }
  }
  return mutants.map(([name, marker, changed]) => {
    assert.notEqual(sha(detail), sha(changed), 'MATRIX_CSS_CONTROL_CHANGED');
    let error; try { styleProof(changed); } catch (caught) { error = caught; }
    assert.equal(error?.name, 'AssertionError', 'MATRIX_CSS_CONTROL_ERROR');
    assert(error.message.startsWith(marker), 'MATRIX_CSS_CONTROL_ERROR');
    return { caseId, name, expectedMarker: marker, beforeSha256: sha(detail), afterSha256: sha(changed), error: { name: error.name, message: error.message }, refused: true, networkAttempted: false };
  });
}
