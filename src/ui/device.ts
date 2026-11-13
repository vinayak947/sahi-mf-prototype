// The prototype runs inside one phone (.device). On wide screens it is a 412px frame on the
// page, on phones it fills the screen. The phone, not the window, scrolls and anchors every
// fixed layer, so code that used window scroll or window coordinates goes through here.

export const device = () => document.querySelector<HTMLElement>(".device") ?? document.body;
export const scroller = () => document.querySelector<HTMLElement>(".device-scroll");

export const scrollToTop = () => scroller()?.scrollTo({ top: 0 });

// Size of the phone's screen, for layers laid out against it.
export function deviceSize() {
  const el = device();
  return { width: el.clientWidth, height: el.clientHeight };
}

// A rect from getBoundingClientRect (window coordinates) in the phone's own coordinates,
// which is what position: fixed means inside the frame.
export function toDevice(rect: DOMRect): DOMRect {
  const box = device().getBoundingClientRect();
  return new DOMRect(rect.left - box.left, rect.top - box.top, rect.width, rect.height);
}
