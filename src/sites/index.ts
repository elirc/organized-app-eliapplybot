import type { SiteAdapter } from "../shared/types";
import { ashbyAdapter } from "./ashby";
import { genericAdapter } from "./generic";
import { greenhouseAdapter } from "./greenhouse";
import { leverAdapter } from "./lever";
import { workdayAdapter } from "./workday";

const adapters: SiteAdapter[] = [greenhouseAdapter, leverAdapter, workdayAdapter, ashbyAdapter, genericAdapter];

export function getSiteAdapter(href: string): SiteAdapter {
  const url = new URL(href);
  return adapters.find((adapter) => adapter.matches(url)) ?? genericAdapter;
}
