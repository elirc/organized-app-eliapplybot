import type { SiteAdapter } from "../shared/types";

export const ashbyAdapter: SiteAdapter = {
  name: "ashby",
  matches: (url) => /ashbyhq\.com|jobs\.ashbyhq/i.test(url.hostname)
};
