import { useCallback, useEffect, useRef, useState } from "react";
import { validateProfileDetailed } from "../shared/profileSchema";
import {
  createProfile,
  deleteProfile,
  duplicateProfile,
  getProfileVersion,
  listProfiles,
  renameProfile,
  resetProfile,
  setActiveProfile,
  updateProfile,
  type ProfileSummary
} from "../shared/storage";
import type { CandidateProfile } from "../shared/types";

type StatusTone = "idle" | "saved" | "error";

export function Options() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [json, setJson] = useState("");
  const [dirty, setDirty] = useState(false);
  const [tone, setTone] = useState<StatusTone>("idle");
  const [messages, setMessages] = useState<string[]>(["Profile data stays in chrome.storage.local."]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (focusId?: string) => {
    const list = await listProfiles();
    setProfiles(list);
    const target = focusId ?? list.find((entry) => entry.active)?.id ?? list[0]?.id ?? null;
    setSelectedId(target);
    if (target) {
      const version = await getProfileVersion(target);
      if (version) setJson(JSON.stringify(version.profile, null, 2));
    }
    setDirty(false);
    return list;
  }, []);

  useEffect(() => {
    refresh().catch((error) => report(error));
  }, [refresh]);

  function report(error: unknown) {
    setTone("error");
    setMessages([error instanceof Error ? error.message : "Something went wrong."]);
  }

  function notify(text: string) {
    setTone("saved");
    setMessages([text]);
  }

  async function selectVersion(id: string) {
    if (dirty && !window.confirm("Discard unsaved edits to the current version?")) return;
    const version = await getProfileVersion(id);
    if (!version) return;
    setSelectedId(id);
    setJson(JSON.stringify(version.profile, null, 2));
    setDirty(false);
    setTone("idle");
    setMessages([`Editing "${version.name}".`]);
  }

  async function save() {
    if (!selectedId) return;
    try {
      const parsed = parseProfile(json);
      await updateProfile(selectedId, parsed);
      await refresh(selectedId);
      notify("Saved locally.");
    } catch (error) {
      if (error instanceof ProfileValidationError) {
        setTone("error");
        setMessages(error.errors);
        return;
      }
      report(error);
    }
  }

  async function makeActive() {
    if (!selectedId) return;
    try {
      await setActiveProfile(selectedId);
      await refresh(selectedId);
      notify("This version is now used for autofill.");
    } catch (error) {
      report(error);
    }
  }

  async function createNew() {
    try {
      const name = window.prompt("Name for the new profile version:", suggestName(profiles));
      if (name === null) return;
      const version = await createProfile(name.trim() || suggestName(profiles));
      await refresh(version.id);
      notify(`Created "${version.name}" from the placeholder sample.`);
    } catch (error) {
      report(error);
    }
  }

  async function duplicateSelected() {
    if (!selectedId) return;
    try {
      const copy = await duplicateProfile(selectedId);
      await refresh(copy.id);
      notify(`Duplicated into "${copy.name}".`);
    } catch (error) {
      report(error);
    }
  }

  async function renameSelected() {
    if (!selectedId) return;
    const current = profiles.find((entry) => entry.id === selectedId);
    const name = window.prompt("New name for this version:", current?.name ?? "");
    if (name === null) return;
    try {
      await renameProfile(selectedId, name);
      await refresh(selectedId);
      notify("Renamed.");
    } catch (error) {
      report(error);
    }
  }

  async function deleteSelected() {
    if (!selectedId) return;
    const current = profiles.find((entry) => entry.id === selectedId);
    if (!window.confirm(`Delete profile version "${current?.name ?? "this version"}"? This cannot be undone.`)) return;
    try {
      await deleteProfile(selectedId);
      await refresh();
      notify("Deleted.");
    } catch (error) {
      report(error);
    }
  }

  async function resetSelected() {
    if (!selectedId) return;
    if (!window.confirm("Replace this version's content with the placeholder sample profile?")) return;
    try {
      const profile = await resetProfile(selectedId);
      setJson(JSON.stringify(profile, null, 2));
      await refresh(selectedId);
      notify("Reset to placeholder sample profile.");
    } catch (error) {
      report(error);
    }
  }

  async function exportSelected() {
    if (!selectedId) return;
    const version = await getProfileVersion(selectedId);
    if (!version) return;
    const blob = new Blob([JSON.stringify(version.profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(version.name)}.profile.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Exported "${version.name}" as a JSON file. It contains everything in this version — treat it like your resume.`);
  }

  async function importFile(file: File) {
    try {
      const text = await file.text();
      const parsed = parseProfile(text);
      const baseName = file.name.replace(/\.profile\.json$|\.json$/i, "").trim() || "Imported";
      const version = await createProfile(baseName, parsed);
      await refresh(version.id);
      notify(`Imported "${version.name}" and made it the active version.`);
    } catch (error) {
      if (error instanceof ProfileValidationError) {
        setTone("error");
        setMessages([`"${file.name}" is not a valid profile:`, ...error.errors]);
        return;
      }
      report(error);
    }
  }

  const selected = profiles.find((entry) => entry.id === selectedId);

  return (
    <main className="options-shell">
      <header className="options-header">
        <div>
          <h1>eli apply mate profiles</h1>
          <p>Keep separate profile versions (frontend resume, backend resume, ...) and pick which one autofill uses.</p>
        </div>
        <div className="options-actions">
          <button onClick={createNew}>New version</button>
          <button onClick={() => fileInputRef.current?.click()}>Import JSON file</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) importFile(file);
            }}
          />
        </div>
      </header>

      <div className="options-body">
        <aside className="version-list" aria-label="Profile versions">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              className={`version-item${profile.id === selectedId ? " selected" : ""}`}
              onClick={() => selectVersion(profile.id)}
            >
              <span className="version-name">{profile.name}</span>
              <span className="version-meta">
                {profile.active ? "active · " : ""}
                {new Date(profile.updatedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </aside>

        <section className="editor-pane">
          <div className="editor-toolbar">
            <strong>{selected ? selected.name : "No version selected"}</strong>
            <div className="editor-buttons">
              <button onClick={save} disabled={!selectedId || !dirty}>
                Save
              </button>
              <button onClick={makeActive} disabled={!selectedId || selected?.active}>
                Use for autofill
              </button>
              <button className="secondary" onClick={duplicateSelected} disabled={!selectedId}>
                Duplicate
              </button>
              <button className="secondary" onClick={renameSelected} disabled={!selectedId}>
                Rename
              </button>
              <button className="secondary" onClick={exportSelected} disabled={!selectedId}>
                Export
              </button>
              <button className="secondary" onClick={resetSelected} disabled={!selectedId}>
                Reset sample
              </button>
              <button className="danger" onClick={deleteSelected} disabled={!selectedId || profiles.length <= 1}>
                Delete
              </button>
            </div>
          </div>

          <textarea
            spellCheck={false}
            value={json}
            onChange={(event) => {
              setJson(event.target.value);
              setDirty(true);
              setTone("idle");
              setMessages(["Unsaved edits."]);
            }}
            aria-label="Candidate profile JSON"
          />
        </section>
      </div>

      <div className={`options-status options-status-${tone === "saved" ? "saved" : tone === "error" ? "error" : "idle"}`} role="status">
        {messages.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    </main>
  );
}

class ProfileValidationError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super(errors[0] ?? "Invalid profile.");
    this.errors = errors;
  }
}

function parseProfile(text: string): CandidateProfile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ProfileValidationError([
      `Not valid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`
    ]);
  }
  const result = validateProfileDetailed(parsed);
  if (!result.valid) throw new ProfileValidationError(result.errors.slice(0, 8));
  return parsed as CandidateProfile;
}

function suggestName(profiles: ProfileSummary[]): string {
  return `Version ${profiles.length + 1}`;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "profile";
}
