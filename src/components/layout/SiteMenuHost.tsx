import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

type Placement = {
  host: HTMLElement | null;
  trigger: RefObject<HTMLButtonElement>;
  setTrigger: (node: HTMLButtonElement | null) => void;
  attach: (node: HTMLElement) => () => void;
};
const PlacementContext = createContext<Placement | null>(null);
export const useSiteMenuPlacement = () => useContext(PlacementContext);

export function SiteMenuProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const currentHost = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const focused = useRef<HTMLButtonElement | null>(null);
  const captureFocus = useCallback(() => {
    const active = document.activeElement;
    if (trigger.current === active) focused.current = trigger.current;
    else if (active && active !== focused.current && active !== document.body && active.isConnected) focused.current = null;
  }, []);
  const attach = useCallback((node: HTMLElement) => {
    captureFocus(); currentHost.current = node; setHost(node);
    return () => {
      if (currentHost.current !== node) return;
      captureFocus(); currentHost.current = null; setHost(null);
    };
  }, [captureFocus]);
  const setTrigger = useCallback((node: HTMLButtonElement | null) => {
    captureFocus(); trigger.current = node;
    if (!node) return;
    const previous = focused.current, active = document.activeElement;
    focused.current = null;
    if (previous && (active === previous || active === document.body || !active?.isConnected)
      && node.isConnected && node.getClientRects().length && getComputedStyle(node).visibility === 'visible') {
      node.focus({ preventScroll: true });
    }
  }, [captureFocus]);
  return <PlacementContext.Provider value={{ host, trigger, setTrigger, attach }}>{children}</PlacementContext.Provider>;
}

export function SiteMenuHost() {
  const placement = useSiteMenuPlacement(), node = useRef<HTMLSpanElement>(null);
  const attach = placement?.attach;
  useLayoutEffect(() => {
    if (attach && node.current) return attach(node.current);
  }, [attach]);
  return placement ? <span ref={node} className="inline-flex h-11 w-11 shrink-0" /> : null;
}
