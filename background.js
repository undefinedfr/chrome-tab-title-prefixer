const DEFAULT_CONDITIONS = [
  {
    id: "default-local",
    name: "Local dev",
    patterns: [".localhost", ".local"],
    prefix: "🟢 ",
    enabled: true,
  },
];

chrome.runtime.onInstalled.addListener(async () => {
  const { conditions } = await chrome.storage.sync.get("conditions");
  if (!Array.isArray(conditions)) {
    await chrome.storage.sync.set({ conditions: DEFAULT_CONDITIONS });
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
