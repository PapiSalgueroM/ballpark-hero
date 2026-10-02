import { vi } from 'vitest';

class ArcadePointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly isPrimary: boolean;
  readonly pointerType: string;
  constructor(type: string, options: PointerEventInit = {}) {
    super(type, options);
    this.pointerId = options.pointerId ?? 7;
    this.isPrimary = options.isPrimary ?? true;
    this.pointerType = options.pointerType ?? 'mouse';
  }
}

export function installArcadePointers() {
  const captured = new Map<number, Element>();
  const previous = ['setPointerCapture', 'hasPointerCapture', 'releasePointerCapture'].map(name => [name, Object.getOwnPropertyDescriptor(Element.prototype, name)] as const);
  vi.stubGlobal('PointerEvent', ArcadePointerEvent);
  Object.defineProperties(Element.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn(function (this: Element, id: number) { captured.set(id, this); }) },
    hasPointerCapture: { configurable: true, value: function (this: Element, id: number) { return captured.get(id) === this; } },
    releasePointerCapture: { configurable: true, value: vi.fn(function (this: Element, id: number) { if (captured.get(id) === this) captured.delete(id); }) },
  });
  return { restore() {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(Element.prototype, name, descriptor);
      else delete (Element.prototype as unknown as Record<string, unknown>)[name];
    }
  } };
}
