/**
 * Round 1140: a translated page must not crash.
 * Round 1141: and it must stay right.
 *
 * THE BUG, reproduced in a real browser on the build that was live on 2026-10-08. A
 * Brazilian player could not create a Soccer Career, and Try this page again failed
 * too. His browser had translated the page to Portuguese. A page translator swaps
 * every text node for <font> elements of its own. React still holds the old text
 * nodes, so the next time it removes one (the "Choose nationality" placeholder
 * giving way to "Brazil") the browser throws NotFoundError: that node is not a child
 * of that parent any more. The whole route fell into the error boundary, and its
 * retry reloads into the same translated page, so it failed every single time.
 * Measured on the walk from the create screen to the first season: thirteen
 * separate updates would each have thrown. A pt-BR locale, the Sao Paulo timezone
 * and Brazil as nationality did nothing on their own. Translation alone did it.
 *
 * LAYER ONE (Round 1140). removeChild and insertBefore stop throwing for exactly
 * that case, a node whose parent is no longer the one the caller remembers.
 * Removing a node that is already gone is a no-op. Inserting before a reference
 * that is gone appends at the end. Every other call goes straight to the browser's
 * own method, untouched. That ends the crash and nothing else: the translator's
 * copy stays where it was, so the page kept a stale word beside a fresh one
 * ("Choose positionStriker (ST)") and a number React updated in place never moved
 * (the header said Age 16 when the player was 20).
 *
 * LAYER TWO (Round 1141) knows which copy stands for which text node and puts
 * React's intent through to it. What it is built on was measured, not assumed.
 * WHAT WAS MEASURED, so nobody reads more into it: Google's website translate
 * element (translate_a/element.js), in headless Chromium, on a plain page and on
 * the built site, in Portuguese, Japanese and German, 2026-10-08. That is the
 * library Chrome's own Translate button drives, but the button itself was never
 * pressed (a headless browser has none), and no other browser's translator was
 * looked at. "The translator" below means that one.
 *  - The swap is an insert and a remove. A <font> goes in right before the text
 *    node, then the text node leaves, and the record of that removal names the
 *    <font> as its previous sibling. Every text node gets one wrapper of its own,
 *    numbers, signs and names included.
 *  - The words are NOT kept node by node. A sentence made of several text nodes
 *    ("Age " and "16") is translated as one and shared out again as the language
 *    needs: in Portuguese the first wrapper came back empty and the second held
 *    "16 anos", in German five nodes became two full wrappers and three empty ones.
 *    So one wrapper cannot be mended alone. The whole group goes back together.
 *  - A text node the translator has already taken is never translated again when it
 *    is put back (it marks the node), but a brand new text node is translated
 *    within about a tenth of a second. So React's own node is never put back. A
 *    fresh stand in with the same words goes where the wrapper was, the translator
 *    takes that, and the map follows.
 *  - The translator reads a text node once, when it first sees it, and answers a
 *    moment later with a translation of the words it READ, whatever the node says
 *    by then. A node rewritten five milliseconds after it appeared was swapped for
 *    its first words, and stayed that way. That freezes any figure that ticks and
 *    then stops (a roll, a count up) on an older value, with or without a guard.
 *    So a stand in is never written, only replaced, and a text node that was
 *    rewritten while it was on the page is refreshed once more the moment the
 *    translator takes it.
 *  - While it works through a whole page (the first translation, or "translate"
 *    pressed again) it takes no notice of text that arrives. A stand in put down
 *    in that moment stayed in the first language until something else on the
 *    page changed. So what was handed back is looked at again a little later and
 *    handed over once more if it is still standing there (after 1 s, 2 s, 4 s,
 *    then it is left alone), never while the line keeps changing.
 *  - It can undo itself: "show original", and by its own source also a failed
 *    translation and the page going into the back and forward cache. Its own
 *    button was pressed on the built site: every wrapper leaves and the very node
 *    it took comes back where the wrapper stood (put into the wrapper, its saved
 *    words written to it, taken out, put in front, the wrapper removed), and
 *    "translate" after that takes the same nodes again. For a string layer two
 *    had refreshed that node is a stand in, so who each stand in was made for is
 *    kept for good and a node that comes back is taken up again. Before that fix
 *    the page stopped following React after an undo, where layer one alone healed.
 * Which gives one rule: whenever React removes, inserts before, or rewrites a text
 * node the translator took, or the translator takes a node that was rewritten
 * under it, every translated string directly inside that same element is handed
 * back to the translator as fresh text, in React's order, with React's current
 * words. Measured on the real translator: one rewrite caused exactly one new swap
 * for each string of the group and nothing after it, and a hundred rewrites in a
 * row left the element with exactly the nodes it started with.
 *
 * Layer two cannot touch an untranslated page: it writes to the DOM only where a
 * translator's copy is on record, and a copy only gets on record when a <font>
 * arrived in the very batch of changes that took the text node away. Every step
 * of it sits in a try that falls back to layer one. What it costs a page nobody
 * translated is bookkeeping: a look at each batch of DOM changes, and one set
 * entry for each text node rewritten in place. Measured on the built site, with
 * both layers, with layer one only and with no guard: nothing the numbers can
 * tell from noise on a real walk or on a season played week by week, and on a
 * burst of calls alone about a tenth of a millionth of a second a rewrite
 * (scripts/playTranslatedPage.mjs, COST=1, has the numbers).
 *
 * A bare string React MOVES (a keyed list of plain strings in a new order) is put
 * in again with the node React holds, which lands on the page beside its own
 * copy. The observer sees that, drops the copy and puts a stand in where React
 * placed the string.
 *
 * What it does not mend, said plainly:
 *  - A wrapper the translator shares between an element's own strings and a
 *    child element's (bold words in the middle of a sentence) is only refreshed
 *    on the outer side.
 *  - A translator that does not work with <font> wrappers gets nothing from
 *    layer two. A published description of Firefox's page translation says it
 *    uses none, and then only layer one stands. Edge and Safari were not looked at.
 *  - A translator that MERGES neighbouring text nodes into one before it wraps
 *    them: two published write ups say Chrome's own does. The measured one does
 *    not (one wrapper for each node). If one did, the second node would leave
 *    with no wrapper of its own, nothing would be on record for it, and a number
 *    beside a label would freeze there exactly as under layer one. One look in
 *    real Chrome is still owed.
 *  - A line that changes about once a second goes back to the translator on
 *    every change (about one request a tick). On a plain page it then read
 *    translated nine tenths of the time. On the built Stadium Tycoon a reviewer
 *    saw such a line in the first language, with the right number, at nine looks
 *    of nine. The right number in the wrong language is what is left there.
 *
 * Switches, both read once, before the app boots, and both there for
 * scripts/playTranslatedPage.mjs:
 *   window.__DUKB_NO_TRANSLATE_GUARD__  nothing is installed (the crash is back)
 *   window.__DUKB_NO_TRANSLATE_LIVE__   layer one only (the stale word is back)
 * window.__dukbTranslateStats counts what layer two did. On a page nobody
 * translated every number in it stays at zero, and no timer is ever set.
 */

export interface TranslateStats {
  /** text nodes a translator took and left a copy for */
  swaps: number;
  /** removals put through to the translator's copy */
  removed: number;
  /** inserts placed before the translator's copy */
  inserted: number;
  /** translated copies handed back to the translator as fresh text */
  restored: number;
  /** text nodes a translator gave back (it undid itself) that layer two took up again */
  returned: number;
}

type GuardWindow = Window & typeof globalThis & {
  __DUKB_NO_TRANSLATE_GUARD__?: boolean;
  __DUKB_NO_TRANSLATE_LIVE__?: boolean;
  __dukbTranslateStats?: TranslateStats;
};

const MARK = '__dukbTranslateGuard';

interface Natives {
  removeChild: Node['removeChild'];
  insertBefore: Node['insertBefore'];
  /** The browser's own nodeValue setter, for the writes layer two makes itself. */
  setValue: (this: Node, value: string | null) => void;
}

interface Live {
  /** React removes `child`, which `parent` no longer holds. True when its copy was removed in its place. */
  remove(parent: Node, child: Node): boolean;
  /** React inserts before `reference`, which `parent` no longer holds. What stands there now, or null. */
  before(parent: Node, reference: Node): Node | null;
  /** React wrote new words into `text` while it is off the page. `was` is what it held before. */
  wrote(text: Node, was: string | null): void;
  /** Somebody other than layer two wrote into `text` while it is on the page. */
  touched(text: Node): void;
}

const isWrapper = (node: Node | null): node is Element => !!node && node.nodeType === 1 && node.nodeName === 'FONT';

/** Layer two. Null when this window cannot carry it, and then layer one stands alone. */
function makeLive(win: GuardWindow, native: Natives): Live | null {
  const doc = win.document;
  if (!doc || typeof win.MutationObserver !== 'function') return null;

  const stats: TranslateStats = { swaps: 0, removed: 0, inserted: 0, restored: 0, returned: 0 };
  win.__dukbTranslateStats = stats;

  /** React's text node, to what stands for it on the page: a translator's wrapper, or a stand in waiting for one. */
  const shown = new WeakMap<Node, Node>();
  /** The other way round, for what is on the page now. It forgets a stand in the moment the translator takes it. */
  const owner = new WeakMap<Node, Node>();
  /**
   * A stand in, to the node React holds, for good. A translator that undoes itself (show original, a
   * translation that failed, the page going into the back and forward cache) puts back the very nodes it
   * took, and for a string layer two had refreshed that node is a stand in `owner` has long forgotten.
   */
  const behind = new WeakMap<Node, Node>();
  /**
   * Stand ins made in this same turn. No translator has read them yet (it reads the page in a microtask at
   * the earliest), so one commit that touches an element five times makes its stand ins once.
   */
  let young: Set<Node> | null = null;
  /**
   * Text nodes that were rewritten while on the page. The translator reads a node once, when it first sees
   * it, and answers a moment later with a translation of the words it READ, whatever the node says by then
   * (measured: a node rewritten five milliseconds after it appeared was swapped for its first words). So a
   * wrapper that takes one of these may be showing words that are already old.
   */
  const rewritten = new WeakSet<Node>();

  /**
   * THE MAP. A swap is a text node leaving while a <font> that arrived in the same batch sits where it stood:
   * added by the same record, or the removed node's previous or next sibling. The "same batch" half is what
   * keeps an ordinary removal beside an older wrapper from ever being read as a swap.
   */
  const take = (records: MutationRecord[]) => {
    let arrived: Set<Node> | null = null;
    let late: Node[] | null = null;
    let back: Node[] | null = null;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const came = record.addedNodes;
      // A text node that is on the map arrives on the page. Looked at below, once the batch is read.
      for (let j = 0; j < came.length; j++) {
        const text = came[j];
        if (text.nodeType === 3 && (behind.has(text) || shown.has(text))) (back || (back = [])).push(text);
      }
      const gone = record.removedNodes;
      if (gone.length === 0) continue;
      for (let j = 0; j < gone.length; j++) {
        const text = gone[j];
        if (text.nodeType !== 3) continue;
        if (!arrived) {
          arrived = new Set();
          for (let a = 0; a < records.length; a++) {
            const came = records[a].addedNodes;
            for (let b = 0; b < came.length; b++) if (isWrapper(came[b])) arrived.add(came[b]);
          }
        }
        let wrapper: Node | null = null;
        const here = record.addedNodes;
        for (let k = 0; k < here.length && !wrapper; k++) if (isWrapper(here[k])) wrapper = here[k];
        if (!wrapper && record.previousSibling && arrived.has(record.previousSibling)) wrapper = record.previousSibling;
        if (!wrapper && record.nextSibling && arrived.has(record.nextSibling)) wrapper = record.nextSibling;
        if (!wrapper || owner.has(wrapper) || wrapper.parentNode !== record.target) continue;
        // A stand in of ours was taken: the entry belongs to the node React holds. What stood for that
        // node until now is this stand in itself, or, when the translator gave the stand in back and
        // takes it again in one batch, a wrapper that is gone. Only a stand in that something newer on
        // the page has replaced is nobody's any more.
        const first = behind.get(text);
        const now = first && shown.get(first);
        const mine = first && !(now && now !== text && now.isConnected) ? first : text;
        if (now && mine === first) owner.delete(now);
        owner.delete(text);
        shown.set(mine, wrapper);
        owner.set(wrapper, mine);
        stats.swaps += 1;
        quiet = false;
        if (rewritten.has(text)) (late || (late = [])).push(record.target);
      }
    }
    // Only once the whole batch is on the map: a sentence is refreshed whole or not at all.
    if (back) {
      for (let i = 0; i < back.length; i++) {
        const parent = home(back[i]);
        if (parent) (late || (late = [])).push(parent);
      }
    }
    if (late) for (let i = 0; i < late.length; i++) refresh(late[i]);
  };
  const observer = new win.MutationObserver(records => {
    try {
      take(records);
    } catch {
      // nothing to undo: layer one still holds the page up
    }
  });
  observer.observe(doc, { childList: true, subtree: true });
  /** React can commit in a microtask that runs ahead of the observer's own, so every lookup reads the queue first. */
  const flush = () => take(observer.takeRecords());

  /**
   * THE ONE RULE. Every translated string directly inside `parent` goes back to the translator as a brand new
   * text node holding React's current words. Never React's own node (the translator would not look at it
   * again) and never a write into a stand in (the translator may be working on it): a stand in whose words
   * are out of date is replaced like any wrapper.
   */
  /**
   * WHAT THE TRANSLATOR STILL OWES. A stand in is only worth anything if the translator takes it, and it
   * does not always look. Measured on the real one: while it works through a whole page (the first
   * translation, or "translate" pressed again) it takes no notice of text that arrives, so a stand in
   * layer two put down in that moment stayed in the first language until something else on the page
   * changed, which on a quiet screen is the visitor's next press. So an element whose strings were
   * handed back is looked at again a little later, and if a stand in is still standing there it is
   * handed over once more, three times at most and each time after a longer wait. Every new hand back
   * pushes the look further out, so a line that keeps changing is never interrupted, and after the
   * translator has undone itself nothing is owed at all.
   */
  const WAITS = [1000, 2000, 4000, 8000];
  const owed = new Map<Node, { tries: number; at: number }>();
  let timer = 0;
  /** The last thing the translator was seen to do was give its nodes back: nobody is there to take a stand in. */
  let quiet = false;
  const arm = () => {
    if (timer || !owed.size) return;
    let first = Infinity;
    owed.forEach(debt => { if (debt.at < first) first = debt.at; });
    timer = win.setTimeout(pay, Math.max(50, first - Date.now()));
  };
  const owe = (parent: Node) => {
    const debt = owed.get(parent);
    if (debt) debt.at = Date.now() + WAITS[debt.tries];
    else owed.set(parent, { tries: 0, at: Date.now() + WAITS[0] });
    arm();
  };
  const pay = () => {
    timer = 0;
    try {
      flush();
      const now = Date.now();
      owed.forEach((debt, parent) => {
        let waiting = false;
        if (!quiet && parent.isConnected) {
          for (let child = parent.firstChild; child && !waiting; child = child.nextSibling) waiting = child.nodeType === 3 && owner.has(child);
        }
        if (!waiting) owed.delete(parent);
        else if (now >= debt.at) {
          debt.tries += 1;
          if (debt.tries >= WAITS.length) owed.delete(parent);
          else refresh(parent);
        }
      });
    } catch {
      owed.clear();
    }
    arm();
  };

  const refresh = (parent: Node) => {
    let made = false;
    let child = parent.firstChild;
    while (child) {
      const next = child.nextSibling;
      const mine = owner.get(child);
      // A stand in made earlier in this same turn, still saying the right words, is fresh enough.
      if (mine && !(young && young.has(child) && child.nodeValue === (mine.nodeValue || ''))) {
        const standIn = (mine.ownerDocument || doc).createTextNode(mine.nodeValue || '');
        native.insertBefore.call(parent, standIn, child);
        native.removeChild.call(parent, child);
        owner.delete(child);
        owner.set(standIn, mine);
        behind.set(standIn, mine);
        shown.set(mine, standIn);
        if (!young) {
          young = new Set();
          Promise.resolve().then(() => { young = null; });
        }
        young.add(standIn);
        stats.restored += 1;
        made = true;
      }
      child = next;
    }
    if (made) owe(parent);
  };

  /**
   * THE WAY BACK. `text` is on the map and has just arrived on the page. Layer two never puts a node of
   * React's back, and a stand in it makes is on record from the start, so anything else is the translator
   * undoing itself: it puts back the very node it took, where the wrapper stood. Measured on the real one
   * (its own "show original" button, on the built site): every wrapper left and every node it had taken
   * came back. Without this the map still pointed at a wrapper that is gone, and every string layer two
   * had ever refreshed was cut off from React until a reload, which layer one alone never did.
   * Returns the element whose strings have to go back to the translator, or null.
   */
  const home = (text: Node): Node | null => {
    const parent = text.parentNode;
    if (!parent) return null; // it has left again since
    const first = behind.get(text);
    if (first) {
      // A stand in of ours. Where layer two put it and nobody took it, there is nothing to do.
      if (owner.get(text) === first) return null;
      const copy = shown.get(first);
      // Something newer already stands for that string. Not ours to judge.
      if (copy && copy !== text && copy.isConnected) return null;
      if (copy) owner.delete(copy);
      shown.set(first, text);
      owner.set(text, first);
      stats.returned += 1;
      quiet = true;
      // It stands for React's node again. If its words are not React's (a translator may put back the words
      // it saved), the group goes round once more.
      return text.nodeValue === first.nodeValue ? null : parent;
    }
    const copy = shown.get(text);
    if (!copy) return null;
    shown.delete(text);
    owner.delete(copy);
    const from = copy.parentNode;
    if (!from || !copy.isConnected) {
      // React's own node is back where its wrapper stood. It is React's again, and nothing stands for it.
      stats.returned += 1;
      quiet = true;
      return null;
    }
    // React's own node is on the page AND so is its copy: React MOVED the string (a bare string that changed
    // place among keyed neighbours is put in again with the very node React holds). The copy stayed where
    // the string used to be, so the words showed twice, once of them in the first language for good,
    // because the translator never takes a node twice. The copy goes, and the node stands for itself for a
    // moment, which makes the one rule below put a fresh stand in exactly where React placed it.
    native.removeChild.call(from, copy);
    owner.set(text, text);
    if (from !== parent) refresh(from);
    return parent;
  };

  return {
    remove(parent, child) {
      if (child.nodeType !== 3) return false;
      flush();
      const copy = shown.get(child);
      if (!copy || copy.parentNode !== parent) return false;
      native.removeChild.call(parent, copy);
      shown.delete(child);
      owner.delete(copy);
      stats.removed += 1;
      // The words of the node that left may live in a neighbour's wrapper, and the other way round.
      refresh(parent);
      return true;
    },
    before(parent, reference) {
      if (reference.nodeType !== 3) return null;
      flush();
      const copy = shown.get(reference);
      if (!copy || copy.parentNode !== parent) return null;
      // The new node lands in the middle of a sentence the translator shared out its own way, so the
      // sentence goes back whole and the new node takes its place among React's words.
      refresh(parent);
      stats.inserted += 1;
      return shown.get(reference) || null;
    },
    wrote(text, was) {
      flush();
      const copy = shown.get(text);
      if (!copy) return;
      const parent = copy.parentNode;
      // Nothing to do when the translator's copy is gone, or when the words did not change.
      if (!parent || text.nodeValue === was) return;
      refresh(parent);
    },
    touched(text) {
      const mine = owner.get(text);
      if (!mine) {
        rewritten.add(text);
        return;
      }
      // Words that did not change are nobody's news. It is also what ends a writer that is not React (a
      // translator that writes its answer into the node in place, which the measured one never does)
      // the second time it comes round with the same answer, where it used to be handed a new node for ever.
      if (text.nodeValue === mine.nodeValue) return;
      // A stand in was rewritten in place: React found it as the only child of its element and wrote
      // to it. The node behind it gets the same words, and the stand in is made again, because the
      // translator may already be working on the old one.
      native.setValue.call(mine, text.nodeValue);
      if (text.parentNode) refresh(text.parentNode);
    },
  };
}

export function installTranslateGuard(win: GuardWindow = window as GuardWindow): boolean {
  const NodeCtor = win.Node;
  if (typeof NodeCtor !== 'function' || !NodeCtor.prototype) return false;
  if (win.__DUKB_NO_TRANSLATE_GUARD__) return false;
  const proto = NodeCtor.prototype as Node & { [MARK]?: boolean };
  if (proto[MARK]) return true;

  const nativeRemoveChild = proto.removeChild;
  const nativeInsertBefore = proto.insertBefore;
  // React rewrites a string in place through nodeValue, and uses nothing else for it. Layer two has to
  // see those writes, so it only exists where that property can be wrapped (every browser, and jsdom).
  const slot = Object.getOwnPropertyDescriptor(proto, 'nodeValue');
  const readValue = slot && slot.configurable ? slot.get : undefined;
  const writeValue = slot && slot.configurable ? slot.set : undefined;
  const live = win.__DUKB_NO_TRANSLATE_LIVE__ || !readValue || !writeValue
    ? null
    : makeLive(win, { removeChild: nativeRemoveChild, insertBefore: nativeInsertBefore, setValue: writeValue });

  // One line in the console is enough to explain an odd looking translated page.
  let told = false;
  const tell = (what: string) => {
    if (told) return;
    told = true;
    console.warn(`[dukb] ${what} a node this page no longer owns. A page translator moved it, carrying on.`);
  };

  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child && child.parentNode !== this) {
      if (live) {
        try {
          if (live.remove(this, child)) return child;
        } catch {
          // layer one, below
        }
      }
      tell('Skipped removing');
      return child;
    }
    return nativeRemoveChild.call(this, child) as T;
  };

  proto.insertBefore = function <T extends Node>(this: Node, node: T, reference: Node | null): T {
    if (reference && reference.parentNode !== this) {
      if (live) {
        let copy: Node | null = null;
        try {
          copy = live.before(this, reference);
        } catch {
          // layer one, below
        }
        if (copy && copy.parentNode === this) return nativeInsertBefore.call(this, node, copy) as T;
      }
      tell('Appended instead of inserting before');
      return nativeInsertBefore.call(this, node, null) as T;
    }
    return nativeInsertBefore.call(this, node, reference) as T;
  };

  // The write itself always goes to the browser's own setter first, untouched. After it: a text node that
  // is OFF the page may be one the translator took, and then the screen has to follow. A text node that is
  // ON the page is remembered as rewritten (one set entry), because the translator may be about to swap it
  // for a translation of its older words. Anything that is not text costs one read here.
  if (live && slot && readValue && writeValue) {
    Object.defineProperty(proto, 'nodeValue', {
      configurable: true,
      enumerable: slot.enumerable,
      get: readValue,
      set(this: Node, value: string | null) {
        if (this.nodeType !== 3) {
          writeValue.call(this, value);
          return;
        }
        const offPage = !this.isConnected;
        const was = offPage ? (readValue.call(this) as string | null) : null;
        writeValue.call(this, value);
        try {
          if (offPage) live.wrote(this, was);
          else live.touched(this);
        } catch {
          // the write itself went through, which is all layer one promises
        }
      },
    });
  }

  proto[MARK] = true;
  return true;
}
