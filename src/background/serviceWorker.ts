chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ eliApplyMateInstalledAt: new Date().toISOString() });
});
