import type { SiteAdapter } from "../shared/types";

export const greenhouseAdapter: SiteAdapter = {
  name: "greenhouse",
  matches: (url) => /greenhouse\.io|greenhouse\.com|boards\.greenhouse/i.test(url.hostname)
};
