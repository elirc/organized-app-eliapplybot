import type { SiteAdapter } from "../shared/types";

export const leverAdapter: SiteAdapter = {
  name: "lever",
  matches: (url) => /lever\.co|jobs\.lever/i.test(url.hostname)
};
