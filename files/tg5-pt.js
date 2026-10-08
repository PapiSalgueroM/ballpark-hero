var TG = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/lib/translateGuard.ts
  var translateGuard_exports = {};
  __export(translateGuard_exports, {
    installTranslateGuard: () => installTranslateGuard
  });
  var MARK = "__dukbTranslateGuard";
  var isWrapper = (node) => !!node && node.nodeType === 1 && node.nodeName === "FONT";
  function makeLive(win, native) {
    const doc = win.document;
    if (!doc || typeof win.MutationObserver !== "function") return null;
    const stats = { swaps: 0, removed: 0, inserted: 0, restored: 0, returned: 0 };
    win.__dukbTranslateStats = stats;
    const shown = /* @__PURE__ */ new WeakMap();
    const owner = /* @__PURE__ */ new WeakMap();
    const behind = /* @__PURE__ */ new WeakMap();
    let young = null;
    const rewritten = /* @__PURE__ */ new WeakSet();
    const take = (records) => {
      let arrived = null;
      let late = null;
      let back = null;
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const came = record.addedNodes;
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
            arrived = /* @__PURE__ */ new Set();
            for (let a = 0; a < records.length; a++) {
              const came2 = records[a].addedNodes;
              for (let b = 0; b < came2.length; b++) if (isWrapper(came2[b])) arrived.add(came2[b]);
            }
          }
          let wrapper = null;
          const here = record.addedNodes;
          for (let k = 0; k < here.length && !wrapper; k++) if (isWrapper(here[k])) wrapper = here[k];
          if (!wrapper && record.previousSibling && arrived.has(record.previousSibling)) wrapper = record.previousSibling;
          if (!wrapper && record.nextSibling && arrived.has(record.nextSibling)) wrapper = record.nextSibling;
          if (!wrapper || owner.has(wrapper) || wrapper.parentNode !== record.target) continue;
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
      if (back) {
        for (let i = 0; i < back.length; i++) {
          const parent = home(back[i]);
          if (parent) (late || (late = [])).push(parent);
        }
      }
      if (late) for (let i = 0; i < late.length; i++) refresh(late[i]);
    };
    const observer = new win.MutationObserver((records) => {
      try {
        take(records);
      } catch {
      }
    });
    observer.observe(doc, { childList: true, subtree: true });
    const flush = () => take(observer.takeRecords());
    const WAITS = [1e3, 2e3, 4e3, 8e3];
    const owed = /* @__PURE__ */ new Map();
    let timer = 0;
    let quiet = false;
    const arm = () => {
      if (timer || !owed.size) return;
      let first = Infinity;
      owed.forEach((debt) => {
        if (debt.at < first) first = debt.at;
      });
      timer = win.setTimeout(pay, Math.max(50, first - Date.now()));
    };
    const owe = (parent) => {
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
    const refresh = (parent) => {
      let made = false;
      let child = parent.firstChild;
      while (child) {
        const next = child.nextSibling;
        const mine = owner.get(child);
        if (mine && !(young && young.has(child) && child.nodeValue === (mine.nodeValue || ""))) {
          const standIn = (mine.ownerDocument || doc).createTextNode(mine.nodeValue || "");
          native.insertBefore.call(parent, standIn, child);
          native.removeChild.call(parent, child);
          owner.delete(child);
          owner.set(standIn, mine);
          behind.set(standIn, mine);
          shown.set(mine, standIn);
          if (!young) {
            young = /* @__PURE__ */ new Set();
            Promise.resolve().then(() => {
              young = null;
            });
          }
          young.add(standIn);
          stats.restored += 1;
          made = true;
        }
        child = next;
      }
      if (made) owe(parent);
    };
    const home = (text) => {
      const parent = text.parentNode;
      if (!parent) return null;
      const first = behind.get(text);
      if (first) {
        if (owner.get(text) === first) return null;
        const copy2 = shown.get(first);
        if (copy2 && copy2 !== text && copy2.isConnected) return null;
        if (copy2) owner.delete(copy2);
        shown.set(first, text);
        owner.set(text, first);
        stats.returned += 1;
        quiet = true;
        return text.nodeValue === first.nodeValue ? null : parent;
      }
      const copy = shown.get(text);
      if (!copy) return null;
      shown.delete(text);
      owner.delete(copy);
      const from = copy.parentNode;
      if (!from || !copy.isConnected) {
        stats.returned += 1;
        quiet = true;
        return null;
      }
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
        refresh(parent);
        return true;
      },
      before(parent, reference) {
        if (reference.nodeType !== 3) return null;
        flush();
        const copy = shown.get(reference);
        if (!copy || copy.parentNode !== parent) return null;
        refresh(parent);
        stats.inserted += 1;
        return shown.get(reference) || null;
      },
      wrote(text, was) {
        flush();
        const copy = shown.get(text);
        if (!copy) return;
        const parent = copy.parentNode;
        if (!parent || text.nodeValue === was) return;
        refresh(parent);
      },
      touched(text) {
        const mine = owner.get(text);
        if (!mine) {
          rewritten.add(text);
          return;
        }
        if (text.nodeValue === mine.nodeValue) return;
        native.setValue.call(mine, text.nodeValue);
        if (text.parentNode) refresh(text.parentNode);
      }
    };
  }
  function installTranslateGuard(win = window) {
    const NodeCtor = win.Node;
    if (typeof NodeCtor !== "function" || !NodeCtor.prototype) return false;
    if (win.__DUKB_NO_TRANSLATE_GUARD__) return false;
    const proto = NodeCtor.prototype;
    if (proto[MARK]) return true;
    const nativeRemoveChild = proto.removeChild;
    const nativeInsertBefore = proto.insertBefore;
    const slot = Object.getOwnPropertyDescriptor(proto, "nodeValue");
    const readValue = slot && slot.configurable ? slot.get : void 0;
    const writeValue = slot && slot.configurable ? slot.set : void 0;
    const live = win.__DUKB_NO_TRANSLATE_LIVE__ || !readValue || !writeValue ? null : makeLive(win, { removeChild: nativeRemoveChild, insertBefore: nativeInsertBefore, setValue: writeValue });
    let told = false;
    const tell = (what) => {
      if (told) return;
      told = true;
      console.warn(`[dukb] ${what} a node this page no longer owns. A page translator moved it, carrying on.`);
    };
    proto.removeChild = function(child) {
      if (child && child.parentNode !== this) {
        if (live) {
          try {
            if (live.remove(this, child)) return child;
          } catch {
          }
        }
        tell("Skipped removing");
        return child;
      }
      return nativeRemoveChild.call(this, child);
    };
    proto.insertBefore = function(node, reference) {
      if (reference && reference.parentNode !== this) {
        if (live) {
          let copy = null;
          try {
            copy = live.before(this, reference);
          } catch {
          }
          if (copy && copy.parentNode === this) return nativeInsertBefore.call(this, node, copy);
        }
        tell("Appended instead of inserting before");
        return nativeInsertBefore.call(this, node, null);
      }
      return nativeInsertBefore.call(this, node, reference);
    };
    if (live && slot && readValue && writeValue) {
      Object.defineProperty(proto, "nodeValue", {
        configurable: true,
        enumerable: slot.enumerable,
        get: readValue,
        set(value) {
          if (this.nodeType !== 3) {
            writeValue.call(this, value);
            return;
          }
          const offPage = !this.isConnected;
          const was = offPage ? readValue.call(this) : null;
          writeValue.call(this, value);
          try {
            if (offPage) live.wrote(this, was);
            else live.touched(this);
          } catch {
          }
        }
      });
    }
    proto[MARK] = true;
    return true;
  }
  return __toCommonJS(translateGuard_exports);
})();
