// jsdom has no layout engine and (depending on version) no innerText.
// Give tests reasonable stand-ins so scanner/domLabels behave like a browser.

type CssGlobal = { CSS?: { escape?: (value: string) => string } };
const globals = globalThis as CssGlobal;
if (typeof globals.CSS?.escape !== "function") {
  globals.CSS = {
    ...globals.CSS,
    escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)
  };
}

const probe = document.createElement("div");
probe.textContent = "probe";
if (typeof probe.innerText !== "string") {
  Object.defineProperty(HTMLElement.prototype, "innerText", {
    configurable: true,
    get(this: HTMLElement) {
      return this.textContent ?? "";
    },
    set(this: HTMLElement, value: string) {
      this.textContent = value;
    }
  });
}

// Every element measures 0x0 in jsdom, which would make isVisible() reject the
// whole page. Report a non-zero box; visibility tests use hidden/display:none.
Element.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
  const rect = {
    width: 120,
    height: 24,
    top: 0,
    left: 0,
    right: 120,
    bottom: 24,
    x: 0,
    y: 0,
    toJSON: () => ({})
  };
  return rect as DOMRect;
};
