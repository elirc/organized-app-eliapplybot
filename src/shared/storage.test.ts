import { beforeEach, describe, expect, it } from "vitest";
import { installChromeMock } from "../test/chromeMock";
import { sampleProfile } from "./sampleProfile";
import {
  MAX_PROFILES,
  createProfile,
  deleteProfile,
  duplicateProfile,
  getActiveProfile,
  getActiveProfileName,
  getStore,
  listProfiles,
  renameProfile,
  setActiveProfile,
  updateProfile
} from "./storage";
import type { CandidateProfile } from "./types";

const mock = installChromeMock();

beforeEach(() => {
  mock.reset();
});

describe("profile store", () => {
  it("initializes with a Default version built from the sample profile", async () => {
    const store = await getStore();
    expect(store.profiles).toHaveLength(1);
    expect(store.profiles[0].name).toBe("Default");
    expect(store.activeId).toBe(store.profiles[0].id);
    expect(await getActiveProfile()).toEqual(sampleProfile);
    expect(await getActiveProfileName()).toBe("Default");
  });

  it("migrates a legacy single-profile key and removes it", async () => {
    const legacy: CandidateProfile = structuredClone(sampleProfile);
    legacy.personal.firstName = "Legacy";
    mock.data.candidateProfile = legacy;

    const store = await getStore();
    expect(store.profiles[0].profile.personal.firstName).toBe("Legacy");
    expect(mock.data.candidateProfile).toBeUndefined();
  });

  it("creates versions, makes them active, and keeps names unique", async () => {
    await getStore();
    const backend = await createProfile("Backend");
    expect((await listProfiles()).find((entry) => entry.active)?.id).toBe(backend.id);

    const clash = await createProfile("Backend");
    expect(clash.name).toBe("Backend 2");
  });

  it("duplicates an existing version including its content", async () => {
    await getStore();
    const original = await createProfile("Frontend");
    const edited = structuredClone(sampleProfile);
    edited.personal.firstName = "Fran";
    await updateProfile(original.id, edited);

    const copy = await duplicateProfile(original.id);
    expect(copy.name).toBe("Frontend copy");
    expect(copy.profile.personal.firstName).toBe("Fran");
    expect(copy.id).not.toBe(original.id);
  });

  it("switches the active version", async () => {
    await getStore();
    const second = await createProfile("Second");
    const store = await getStore();
    await setActiveProfile(store.profiles[0].id);
    expect((await listProfiles()).find((entry) => entry.active)?.id).toBe(store.profiles[0].id);
    await setActiveProfile(second.id);
    expect(await getActiveProfileName()).toBe("Second");
  });

  it("rejects switching to a missing version", async () => {
    await getStore();
    await expect(setActiveProfile("nope")).rejects.toThrow("no longer exists");
  });

  it("refuses to delete the last version and reassigns active on delete", async () => {
    const store = await getStore();
    await expect(deleteProfile(store.profiles[0].id)).rejects.toThrow("last profile version");

    const second = await createProfile("Second");
    await deleteProfile(second.id);
    const remaining = await listProfiles();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].active).toBe(true);
    expect(remaining[0].name).toBe("Default");
  });

  it("renames with uniqueness and rejects empty names", async () => {
    await getStore();
    const second = await createProfile("Second");
    await expect(renameProfile(second.id, "   ")).rejects.toThrow("empty");
    await renameProfile(second.id, "Default");
    const list = await listProfiles();
    expect(list.map((entry) => entry.name).sort()).toEqual(["Default", "Default 2"]);
  });

  it("enforces the version limit", async () => {
    await getStore();
    for (let index = 1; index < MAX_PROFILES; index += 1) {
      await createProfile(`Version ${index}`);
    }
    await expect(createProfile("One too many")).rejects.toThrow("Limit");
  });

  it("updates content without touching other versions", async () => {
    await getStore();
    const second = await createProfile("Second");
    const edited = structuredClone(sampleProfile);
    edited.personal.email = "second@example.com";
    await updateProfile(second.id, edited);

    const store = await getStore();
    const first = store.profiles.find((entry) => entry.name === "Default");
    const updated = store.profiles.find((entry) => entry.id === second.id);
    expect(first?.profile.personal.email).toBe(sampleProfile.personal.email);
    expect(updated?.profile.personal.email).toBe("second@example.com");
  });
});
