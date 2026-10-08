import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PhonePanel from '@/components/soccer-career/PhonePanel';
import { AssetScreen, BankScreen, CardsScreen, ShopCategoryScreen } from '@/components/soccer-career/MoneyScreens';
import * as E from '@/lib/soccerCareerEngine';
import * as M from '@/lib/soccerMoney';
import { arcadeQuestions } from '@/lib/soccerArcade';
import { CURRENCIES, localizeMoney, RATES_AS_OF_LABEL } from '@/lib/soccerCurrency';
import type { CareerState } from '@/lib/soccerCareerEngine';
import type { MoneyAction } from '@/lib/soccerMoney';

const BASELINE = 'unchanged money engine retains complete euro outcomes';
const SAVE = 'soccerCareerSave', PREFERENCE = 'dukb-soccer-currency';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const events: { kind: string; value?: unknown }[] = [];
const writes: { scope: string; method: string; args: string[] }[] = [];
let seed = 19327, draws = 0;
let observedCareer: CareerState | null = null;
const callbacks = {
  onAnswer: (id: string, choice: number) => events.push({ kind: 'answer', value: [id, choice] }),
  onMoney: (action: MoneyAction) => events.push({ kind: 'money', value: clone(action) }),
  onBuyItem: (id: string) => events.push({ kind: 'buy', value: id }),
  onClose: () => events.push({ kind: 'close' }),
};
const bytes = (store: Storage) => Object.fromEntries(Object.keys(store).sort().map(key => [key, store.getItem(key)]));
function snapshot(career: CareerState) {
  return { career: clone(career), local: bytes(localStorage), session: bytes(sessionStorage), writes: clone(writes), callbacks: clone(events), seed, draws, now: Date.now() };
}
function check(id: string, actual: unknown, expected: unknown, evidence: unknown = {}) {
  console.log('SOCCER_PHONE_CURRENCY_RECORD|' + JSON.stringify({ id, actual, expected, evidence,
    environment: observedCareer ? snapshot(observedCareer) : null }));
  expect(actual, id).toEqual(expected);
}
function click(name: string | RegExp) {
  const button = screen.queryByRole('button', { name });
  check('existing navigation ' + String(name), !!button, true);
  fireEvent.click(button!);
}
function app(id: string) {
  const button = document.querySelector(`[data-phone-app="${id}"]`);
  check('existing phone app ' + id, !!button, true);
  fireEvent.click(button!);
}
const text = (node: Element | null | undefined) => node?.textContent ?? null;
const labelValue = (label: string) => text(screen.queryByText(label)?.parentElement?.firstElementChild);
const note = () => screen.queryAllByText(/^Converted from euros at /).map(node => node.textContent);
const fieldRow = (label: string) => text(screen.queryByText(label)?.nextElementSibling);

function fixture(netWorth = 36.27, rich = true) {
  const source = E.initCareer('Phone Currency Fixture', 'England', 'ST', '2020-24',
    { pace: 68, shooting: 68, passing: 68, dribbling: 68, defending: 45, physical: 68, reflexes: 30 },
    65, 2022, E.FALLBACK_CLUBS, null, 82);
  const career: CareerState & { money?: M.MoneyState } = clone(source);
  // Financial coverage is explicitly staged on an actual engine-created career.
  career.netWorth = netWorth; career.weeklyWage = 12345; career.popularity = 100;
  career.corruptionHeat = 1; career.dirtyMoney = 10;
  career.money = M.ensureMoney(career);
  if (rich) {
    career.money.vault = 1.34; career.money.won = 0.27; career.money.lost = 0.19;
    career.money.price.ladder = 137.29; career.money.hist.ladder = [100, 119.48, 137.29];
    career.money.hold.ladder = 1.23; career.money.cost.ladder = 1.4;
    career.money.cNet = -0.12; career.money.cPlays = 3;
    career.money.log = [{ y: 2022, t: 'Staged deposit', a: 1.34 }, { y: 2022, t: 'Staged loss', a: -0.19 }];
  }
  observedCareer = career;
  return { source, career, annotation: 'Actual initCareer; only financial balances, price history, wage and shop eligibility are staged, not earned results.' };
}
function seedStorage(career: CareerState, code: string) {
  localStorage.setItem(PREFERENCE, code); localStorage.setItem(SAVE, JSON.stringify(career));
  localStorage.setItem('phone-protected-fixture', '{"v":1,"value":"keep"}');
  sessionStorage.setItem('phone-session-fixture', 'keep');
}
function header() { return text(screen.queryByText(/ to your name$/)); }
function expectedNote(code: string) { return code === 'EUR' ? [] : [`Converted from euros at ${RATES_AS_OF_LABEL} rates`]; }
function bankRead(career: CareerState) {
  const bank = M.bankSummary(career);
  return {
    total: text(screen.queryByText('Everything you have')?.nextElementSibling),
    cash: labelValue('in the account'), vault: labelValue('savings'), invested: labelValue('invested'),
    wage: text(screen.queryByText(/^wage /)),
    entries: bank.entries.map(entry => text(screen.queryByText(entry.t)?.nextElementSibling)),
    outcome: text(screen.queryByText('Made on investments')?.nextElementSibling),
    interest: text(screen.queryByText('pays 2.5% a season, never loses')),
  };
}
function bankExpected(career: CareerState, code: string) {
  const bank = M.bankSummary(career), currency = CURRENCIES.find(row => row.code === code)!;
  return { total: E.formatNetWorth(bank.total), cash: E.formatNetWorth(bank.cash), vault: E.formatNetWorth(bank.vault), invested: E.formatNetWorth(bank.invested),
    wage: `wage ${currency.symbol}${Math.round(career.weeklyWage * currency.perEur).toLocaleString('en-US')} a week`,
    entries: bank.entries.map(entry => `${entry.y}${entry.a >= 0 ? '+' : ''}${E.formatNetWorth(entry.a)}`),
    outcome: `${E.formatNetWorth(bank.won)} / ${E.formatNetWorth(bank.lost)} lost`, interest: 'pays 2.5% a season, never loses' };
}
function shopItem(name: string) {
  const label = screen.queryByText(name, { exact: true });
  return label?.parentElement?.parentElement?.parentElement?.parentElement ?? null;
}
function shopRead(category: 'vehicle' | 'lifestyle' | 'shady') {
  return E.SPENDING_ITEMS.filter(item => item.category === category).map(item => {
    const card = shopItem(item.name), button = card?.querySelector('button');
    return { id: item.id, button: text(button), disabled: (button as HTMLButtonElement | null)?.disabled ?? null,
      paragraphs: [...(card?.querySelectorAll('p') ?? [])].map(node => node.textContent) };
  });
}
function shopExpected(career: CareerState, category: 'vehicle' | 'lifestyle' | 'shady') {
  return E.SPENDING_ITEMS.filter(item => item.category === category).map(item => {
    const canAfford = item.cost === 0 || career.netWorth >= item.cost * .5;
    const meetsMin = !item.minNetWorth || career.netWorth >= item.minNetWorth;
    const meetsFame = !item.minPopularity || career.popularity >= item.minPopularity;
    const meetsDirty = !item.requiresDirty || (career.dirtyMoney ?? 0) > 0;
    const lock = !meetsFame ? `needs ${item.minPopularity} popularity` : !meetsDirty ? 'needs money nobody can trace'
      : !meetsMin ? `needs ${E.formatNetWorth(item.minNetWorth || 0)} to your name` : !canAfford ? 'you cannot afford this yet' : null;
    return { id: item.id, button: item.cost > 0 ? E.formatNetWorth(item.cost) : 'Hire', disabled: !(canAfford && meetsMin && meetsFame && meetsDirty),
      paragraphs: [localizeMoney(item.description), ...(item.effect ? [`⚡ ${localizeMoney(item.effect)}`] : []), ...(lock ? [`🔒 ${lock}`] : []), ...(item.monthlyCost ? [`then ${E.formatNetWorth(item.monthlyCost)} a year, every year`] : [])] };
  });
}

beforeEach(async () => {
  await act(async () => {}); // Initialize React's async scheduler before protected RNG measurements.
  localStorage.clear(); sessionStorage.clear(); events.length = 0; writes.length = 0; seed = 19327; draws = 0; observedCareer = null;
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
  vi.spyOn(Math, 'random').mockImplementation(() => { draws++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
  for (const method of ['setItem', 'removeItem', 'clear'] as const) {
    const original = Storage.prototype[method];
    vi.spyOn(Storage.prototype, method).mockImplementation(function (this: Storage, ...args: string[]) {
      writes.push({ scope: this === localStorage ? 'local' : 'session', method, args: [...args] });
      return (original as (...values: string[]) => void).apply(this, args);
    });
  }
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

for (const currency of CURRENCIES) {
  it(`${currency.code} phone navigation converts only displayed money`, async () => {
    const f = fixture(), career = f.career;
    seedStorage(career, currency.code); const before = snapshot(career);
    const view = render(<PhonePanel career={career} {...callbacks} />);
    const expectedHome = `${E.formatNetWorth(career.netWorth + M.moneyWealth(career))} to your name`;
    check(`${currency.code} home display`, { header: header(), note: note() }, { header: expectedHome, note: expectedNote(currency.code) }, f);
    check(`${currency.code} home state held`, snapshot(career), before);
    app('bank');
    check(`${currency.code} bank fields`, bankRead(career), bankExpected(career, currency.code));
    check(`${currency.code} bank state held`, snapshot(career), before);
    click('‹ Home'); app('market');
    const m = M.ensureMoney(career), asset = M.ASSETS[0], held = M.holdingValue(m, asset.id), pnl = M.unrealised(m, asset.id);
    const market = screen.queryByRole('button', { name: new RegExp(asset.name) });
    check(`${currency.code} market fields`, { free: text(screen.queryByText(/^You have .* to put in$/)), invested: text(screen.queryByText(/^holding /)),
      price: text(market?.querySelector('.text-xs.font-black.shrink-0')), move: text(market?.querySelector('.text-\\[10px\\].font-bold.shrink-0')),
      holding: text(market?.querySelector('.text-sky-300')) }, {
      free: `You have ${E.formatNetWorth(M.spendable(career))} to put in`, invested: `holding ${E.formatNetWorth(M.bankSummary(career).invested)}`,
      price: String(Math.round(m.price[asset.id])), move: `${M.lastMove(m, asset.id) > 0 ? '+' : ''}${M.lastMove(m, asset.id)}%`,
      holding: `you hold ${E.formatNetWorth(held)}, ${pnl >= 0 ? 'up' : 'down'} ${E.formatNetWorth(Math.abs(pnl))}` });
    fireEvent.click(market!);
    check(`${currency.code} asset fields`, { free: fieldRow('You have to spend'), held: fieldRow('You are holding'), pnl: fieldRow('Against what you paid'),
      price: text(document.querySelector('.text-3xl.leading-none')), move: text(screen.queryByText(/% last season$/)) }, {
      free: E.formatNetWorth(M.spendable(career)), held: E.formatNetWorth(held), pnl: `${pnl >= 0 ? '+' : ''}${E.formatNetWorth(pnl)}`,
      price: String(Math.round(m.price[asset.id])), move: `${M.lastMove(m, asset.id) > 0 ? '+' : ''}${M.lastMove(m, asset.id)}% last season` });
    check(`${currency.code} market state held`, snapshot(career), before);
    click('‹ Market'); click('‹ Home'); app('shop');
    check(`${currency.code} shop budget`, text(screen.queryByText(/ to spend$/)), `${E.formatNetWorth(M.spendable(career))} to spend`);
    click(/What you drive/);
    check(`${currency.code} shop values`, shopRead('vehicle'), shopExpected(career, 'vehicle'));
    click('‹ My Life'); click(/Day to day/);
    check(`${currency.code} service values`, shopRead('lifestyle'), shopExpected(career, 'lifestyle'));
    click('‹ My Life'); click(/The other list/);
    check(`${currency.code} narrative money values`, shopRead('shady'), shopExpected(career, 'shady'));
    click('‹ My Life'); click('‹ Home'); app('cards');
    check(`${currency.code} card values`, { record: text(document.querySelector('.text-2xl.font-black')), stake: text(screen.queryByRole('button', { name: /^Sit in for / })),
      limit: text(screen.queryByText(/^One sitting a season,/)) }, {
      record: E.formatNetWorth(m.cNet), stake: `Sit in for ${E.formatNetWorth(M.cardCap(career))}`,
      limit: `One sitting a season, never more than ${E.formatNetWorth(M.CARD_MAX)}, and it stops for good if you ever get ${E.formatNetWorth(M.CARD_SHUT)} down. Nobody is losing a career on this bus.` });
    check(`${currency.code} all navigation held`, snapshot(career), before);
    check(`${currency.code} note remains inside every app`, note(), expectedNote(currency.code));
    click('‹ Home'); click('Put phone away');
    check(`${currency.code} close callback only`, snapshot(career), { ...before, callbacks: [{ kind: 'close' }] });
    view.unmount(); await act(async () => {});
  });
}

it('zero debt and billion balances preserve canonical signs units and input', () => {
  for (const code of ['EUR', 'GBP', 'USD', 'BRL', 'MXN', 'JPY', 'INR', 'AUD']) {
    for (const amount of [0, .123, -1.34, 1340.27]) {
      const f = fixture(amount, false); seedStorage(f.career, code); const before = snapshot(f.career);
      const view = render(<PhonePanel career={f.career} {...callbacks} />);
      check('boundary header', header(), `${E.formatNetWorth(amount)} to your name`, { code, amount });
      app('bank'); check('boundary bank', bankRead(f.career), bankExpected(f.career, code), { code, amount });
      check('boundary environment held', snapshot(f.career), before); view.unmount();
    }
  }
});

it('money action callbacks keep exact euro amounts and percentages', () => {
  for (const code of ['EUR', 'USD', 'JPY']) {
    const { career } = fixture(); seedStorage(career, code); const before = snapshot(career), offset = events.length;
    let view = render(<BankScreen career={career} onBack={() => undefined} onMoney={callbacks.onMoney} />);
    click('Save 25%'); click('Take out half'); view.unmount();
    view = render(<AssetScreen career={career} assetId="ladder" onBack={() => undefined} onMoney={callbacks.onMoney} />);
    click('10%'); click('A quarter'); view.unmount();
    view = render(<CardsScreen career={career} onBack={() => undefined} onMoney={callbacks.onMoney} />);
    click(/^Sit in for /); view.unmount();
    const expected: MoneyAction[] = [{ t: 'deposit', amount: M.spendable(career) * .25 }, { t: 'withdraw', amount: M.bankSummary(career).vault * .5 },
      { t: 'buy', id: 'ladder', amount: M.spendable(career) * .1 }, { t: 'sell', id: 'ladder', frac: .25 }, { t: 'cards', stake: M.cardCap(career) }];
    check('money callbacks stay in euros', events.slice(offset), expected.map(value => ({ kind: 'money', value })), { code });
    check('callback observation keeps career and storage', snapshot(career), { ...before, callbacks: clone(events) });
  }
});

it('shop callbacks and eligibility use the original euro price', () => {
  for (const code of ['EUR', 'USD', 'JPY']) {
    const { career } = fixture(13); seedStorage(career, code); const before = snapshot(career), offset = events.length;
    const view = render(<ShopCategoryScreen career={career} cat="vehicle" onBack={() => undefined} onBuy={callbacks.onBuyItem} />);
    const jet = shopItem('Private Jet')?.querySelector('button'), sub = shopItem('Personal Submarine')?.querySelector('button');
    check('shop eligibility stays in euros', { jetDisabled: (jet as HTMLButtonElement)?.disabled, subDisabled: (sub as HTMLButtonElement)?.disabled }, { jetDisabled: false, subDisabled: true }, { code });
    fireEvent.click(jet!); fireEvent.click(sub!);
    check('shop callbacks keep the item id', events.slice(offset), [{ kind: 'buy', value: 'private_jet' }]);
    check('shop callback observation keeps all state', snapshot(career), { ...before, callbacks: clone(events) }); view.unmount();
  }
});

it('actual phone quiz prize displays selected currency without changing its callback', () => {
  let career = fixture().source;
  for (let turn = 0; turn < 4 && career.phase === 'youth'; turn++) career = E.advanceYouthYear(career, E.FALLBACK_CLUBS);
  check('actual career offers a first contract', career.pendingOffers.length > 0, true);
  career = E.acceptOffer(career, career.pendingOffers[0]);
  career = E.advanceProSeason(career, E.FALLBACK_CLUBS);
  observedCareer = career;
  const questions = arcadeQuestions(career); check('actual completed season supplies three questions', questions.length, 3, { career, questions });
  for (const code of ['EUR', 'USD', 'JPY']) {
    seedStorage(career, code); const before = snapshot(career), offset = events.length;
    const view = render(<PhonePanel career={career} {...callbacks} />); app('arcade');
    for (let index = 0; index < questions.length; index++) { click(questions[index].options[questions[index].answer]); click(index === questions.length - 1 ? 'See how you did' : 'Next one'); }
    check('quiz prize currency', text(screen.queryByText(/^Three from three\./)), `Three from three. ${E.formatNetWorth(M.ARCADE_PRIZE)} in the app and the group chat hears about it.`);
    check('quiz callback unchanged', events.slice(offset), [{ kind: 'money', value: { t: 'arcade', right: 3 } }]);
    check('quiz display keeps all engine and storage state', snapshot(career), { ...before, callbacks: clone(events) }); view.unmount();
  }
});

it(BASELINE, () => {
  const f = fixture(), original = clone(f.career);
  const actions: MoneyAction[] = [{ t: 'deposit', amount: 1.2 }, { t: 'buy', id: 'ladder', amount: .5 }, { t: 'withdraw', amount: .2 }];
  const runs = ['EUR', 'USD'].map(code => {
    localStorage.setItem(PREFERENCE, code); const state = clone(original), before = snapshot(f.career);
    const outcomes = actions.map(action => ({ action, result: M.moneyAct(state, clone(action)), state: clone(state) }));
    return { outcomes, input: clone(f.career), protectedDelta: { draws: draws - before.draws, writes: writes.length - before.writes.length, now: Date.now() - before.now } };
  });
  check(BASELINE, runs[1], runs[0], { source: f.source, original, actions });
  check('baseline actually changes financial state', runs[0].outcomes.at(-1)?.state.netWorth !== original.netWorth, true);
});
