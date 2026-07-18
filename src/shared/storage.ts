import { sampleProfile } from "./sampleProfile";
import { validateCandidateProfile } from "./profileSchema";
import type { CandidateProfile } from "./types";

const LEGACY_PROFILE_KEY = "candidateProfile";
const STORE_KEY = "profileStore";
export const MAX_PROFILES = 20;

export type ProfileVersion = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  profile: CandidateProfile;
};

export type ProfileStore = {
  version: 2;
  activeId: string;
  profiles: ProfileVersion[];
};

export type ProfileSummary = {
  id: string;
  name: string;
  updatedAt: string;
  active: boolean;
};

export async function getStore(): Promise<ProfileStore> {
  const stored = await chrome.storage.local.get([STORE_KEY, LEGACY_PROFILE_KEY]);
  const store = stored[STORE_KEY];
  if (isProfileStore(store)) return store;

  // First run or upgrade from the single-profile format: keep the old profile as "Default".
  const legacy = stored[LEGACY_PROFILE_KEY];
  const initial = validateCandidateProfile(legacy) ? legacy : sampleProfile;
  const fresh = createStoreWith(makeVersion("Default", initial));
  await persist(fresh);
  await chrome.storage.local.remove(LEGACY_PROFILE_KEY);
  return fresh;
}

export async function getActiveProfile(): Promise<CandidateProfile> {
  const store = await getStore();
  const active = store.profiles.find((entry) => entry.id === store.activeId) ?? store.profiles[0];
  return active.profile;
}

export async function getActiveProfileName(): Promise<string> {
  const store = await getStore();
  const active = store.profiles.find((entry) => entry.id === store.activeId) ?? store.profiles[0];
  return active.name;
}

export async function listProfiles(): Promise<ProfileSummary[]> {
  const store = await getStore();
  return store.profiles.map((entry) => ({
    id: entry.id,
    name: entry.name,
    updatedAt: entry.updatedAt,
    active: entry.id === store.activeId
  }));
}

export async function getProfileVersion(id: string): Promise<ProfileVersion | null> {
  const store = await getStore();
  return store.profiles.find((entry) => entry.id === id) ?? null;
}

export async function setActiveProfile(id: string): Promise<void> {
  const store = await getStore();
  if (!store.profiles.some((entry) => entry.id === id)) {
    throw new Error("That profile version no longer exists.");
  }
  store.activeId = id;
  await persist(store);
}

export async function createProfile(name: string, profile: CandidateProfile = sampleProfile): Promise<ProfileVersion> {
  const store = await getStore();
  if (store.profiles.length >= MAX_PROFILES) {
    throw new Error(`Limit of ${MAX_PROFILES} profile versions reached. Delete one first.`);
  }
  const version = makeVersion(uniqueName(store, name), profile);
  store.profiles.push(version);
  store.activeId = version.id;
  await persist(store);
  return version;
}

export async function duplicateProfile(id: string): Promise<ProfileVersion> {
  const store = await getStore();
  const source = store.profiles.find((entry) => entry.id === id);
  if (!source) throw new Error("That profile version no longer exists.");
  if (store.profiles.length >= MAX_PROFILES) {
    throw new Error(`Limit of ${MAX_PROFILES} profile versions reached. Delete one first.`);
  }
  const copy = makeVersion(uniqueName(store, `${source.name} copy`), structuredClone(source.profile));
  store.profiles.push(copy);
  store.activeId = copy.id;
  await persist(store);
  return copy;
}

export async function renameProfile(id: string, name: string): Promise<void> {
  const store = await getStore();
  const target = store.profiles.find((entry) => entry.id === id);
  if (!target) throw new Error("That profile version no longer exists.");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Profile name cannot be empty.");
  target.name = uniqueName(store, trimmed, id);
  target.updatedAt = new Date().toISOString();
  await persist(store);
}

export async function deleteProfile(id: string): Promise<void> {
  const store = await getStore();
  const index = store.profiles.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error("That profile version no longer exists.");
  if (store.profiles.length === 1) {
    throw new Error("Cannot delete the last profile version. Create another one first.");
  }
  store.profiles.splice(index, 1);
  if (store.activeId === id) store.activeId = store.profiles[0].id;
  await persist(store);
}

export async function updateProfile(id: string, profile: CandidateProfile): Promise<void> {
  const store = await getStore();
  const target = store.profiles.find((entry) => entry.id === id);
  if (!target) throw new Error("That profile version no longer exists.");
  target.profile = profile;
  target.updatedAt = new Date().toISOString();
  await persist(store);
}

export async function resetProfile(id: string): Promise<CandidateProfile> {
  await updateProfile(id, sampleProfile);
  return sampleProfile;
}

function persist(store: ProfileStore): Promise<void> {
  return chrome.storage.local.set({ [STORE_KEY]: store });
}

function makeVersion(name: string, profile: CandidateProfile): ProfileVersion {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    profile: structuredClone(profile)
  };
}

function createStoreWith(version: ProfileVersion): ProfileStore {
  return { version: 2, activeId: version.id, profiles: [version] };
}

function uniqueName(store: ProfileStore, desired: string, ignoreId?: string): string {
  const taken = new Set(
    store.profiles.filter((entry) => entry.id !== ignoreId).map((entry) => entry.name.toLowerCase())
  );
  const base = desired.trim() || "Untitled";
  if (!taken.has(base.toLowerCase())) return base;
  let counter = 2;
  while (taken.has(`${base} ${counter}`.toLowerCase())) counter += 1;
  return `${base} ${counter}`;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isProfileStore(value: unknown): value is ProfileStore {
  if (!value || typeof value !== "object") return false;
  const store = value as ProfileStore;
  return (
    store.version === 2 &&
    typeof store.activeId === "string" &&
    Array.isArray(store.profiles) &&
    store.profiles.length > 0 &&
    store.profiles.every(
      (entry) =>
        !!entry &&
        typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        validateCandidateProfile(entry.profile)
    )
  );
}
