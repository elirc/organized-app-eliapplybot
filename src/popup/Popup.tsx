import { useEffect, useState } from "react";
import { MessageTypes, type ContentRequest, type ContentResponse } from "../shared/messages";
import { listProfiles, setActiveProfile, type ProfileSummary } from "../shared/storage";

type Status = {
  tone: "idle" | "success" | "error";
  text: string;
};

export function Popup() {
  const [status, setStatus] = useState<Status>({ tone: "idle", text: "Ready for an explicit click." });
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);

  useEffect(() => {
    listProfiles().then(setProfiles);
  }, []);

  const activeId = profiles.find((profile) => profile.active)?.id ?? "";

  async function switchProfile(id: string) {
    try {
      await setActiveProfile(id);
      setProfiles(await listProfiles());
      setStatus({ tone: "idle", text: "Profile switched. Autofill uses it on the next run." });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Could not switch profile." });
    }
  }

  async function run(request: ContentRequest) {
    setBusy(true);
    setStatus({ tone: "idle", text: "Working on the current tab..." });
    try {
      const response = await sendToActiveTab(request);
      if (!response.ok) throw new Error(response.error);

      if ("result" in response) {
        setStatus({
          tone: "success",
          text: `Filled ${response.result.filled.length}, unsure ${response.result.unsure.length}, skipped ${response.result.skipped.length}.`
        });
      } else if ("detected" in response) {
        setStatus({ tone: "success", text: `Detected ${response.detected.length} fields. Review panel opened.` });
      } else if ("cleared" in response) {
        setStatus({ tone: "success", text: `Cleared ${response.cleared} changed controls.` });
      }
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not reach this page. Try a normal http/https tab."
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <h1>eli apply mate</h1>
        <p>Local autofill, review first, never submit.</p>
      </header>

      <label className="profile-picker">
        <span>Profile version</span>
        <select
          value={activeId}
          disabled={busy || profiles.length === 0}
          onChange={(event) => switchProfile(event.target.value)}
          aria-label="Active profile version"
        >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </label>

      <section className="button-stack" aria-label="Actions">
        <button disabled={busy} onClick={() => run({ type: MessageTypes.Autofill })}>
          Autofill current page
        </button>
        <button disabled={busy} onClick={() => run({ type: MessageTypes.Detect })}>
          Show detected fields
        </button>
        <button disabled={busy} onClick={() => run({ type: MessageTypes.Clear })}>
          Clear values filled here
        </button>
      </section>

      <div className={`status status-${status.tone}`} role="status">
        {status.text}
      </div>

      <footer className="popup-footer">
        <button className="link-button" onClick={() => chrome.runtime.openOptionsPage()}>
          Manage profile versions
        </button>
      </footer>
    </main>
  );
}

async function sendToActiveTab(request: ContentRequest): Promise<ContentResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");

  await ensureContentScript(tab.id);
  return chrome.tabs.sendMessage(tab.id, request);
}

async function ensureContentScript(tabId: number): Promise<void> {
  // The content script is injected on demand (no <all_urls> content_scripts),
  // so ping first and inject only when nothing answers.
  try {
    const response = (await chrome.tabs.sendMessage(tabId, { type: MessageTypes.Ping })) as ContentResponse;
    if (response?.ok) return;
  } catch {
    // No listener on this page yet — fall through and inject.
  }

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["contentScript.js"] });
  } catch {
    throw new Error("Cannot run on this page. Try a normal http/https tab.");
  }
}
