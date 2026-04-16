(() => {
  let activePrefixes = [];
  let titleObserver = null;
  let headObserver = null;

  const combine = (arr) => arr.join("");

  const computePrefixes = (conditions, hostname) => {
    if (!Array.isArray(conditions)) return [];
    return conditions
      .filter((c) => c && c.enabled !== false)
      .filter(
        (c) =>
          Array.isArray(c.patterns) &&
          c.patterns.some(
            (p) => typeof p === "string" && p !== "" && hostname.includes(p)
          )
      )
      .map((c) => (typeof c.prefix === "string" ? c.prefix : ""))
      .filter((p) => p !== "");
  };

  const applyCurrent = () => {
    const combined = combine(activePrefixes);
    if (!combined) return;
    const current = document.title || "";
    if (current.startsWith(combined)) return;
    document.title = combined + current;
  };

  const observeTitle = () => {
    const titleEl = document.querySelector("head > title");
    if (!titleEl) return false;
    if (titleObserver) titleObserver.disconnect();
    titleObserver = new MutationObserver(applyCurrent);
    titleObserver.observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return true;
  };

  const waitForTitle = () => {
    if (observeTitle()) {
      applyCurrent();
      return;
    }
    if (headObserver) headObserver.disconnect();
    headObserver = new MutationObserver(() => {
      if (observeTitle()) {
        headObserver.disconnect();
        headObserver = null;
        applyCurrent();
      }
    });
    headObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  };

  const stopObservers = () => {
    if (titleObserver) {
      titleObserver.disconnect();
      titleObserver = null;
    }
    if (headObserver) {
      headObserver.disconnect();
      headObserver = null;
    }
  };

  const replacePrefixes = (oldPrefixes, newPrefixes) => {
    const current = document.title || "";
    const oldCombined = combine(oldPrefixes);
    const newCombined = combine(newPrefixes);
    let clean = current;
    if (oldCombined && clean.startsWith(oldCombined)) {
      clean = clean.slice(oldCombined.length);
    }
    const next = newCombined + clean;
    if (document.title !== next) document.title = next;
  };

  const init = async () => {
    try {
      const { conditions } = await chrome.storage.sync.get("conditions");
      activePrefixes = computePrefixes(conditions, location.hostname);
    } catch {
      activePrefixes = [];
    }
    if (activePrefixes.length > 0) waitForTitle();
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.conditions) return;
    const oldPrefixes = activePrefixes;
    activePrefixes = computePrefixes(
      changes.conditions.newValue,
      location.hostname
    );
    replacePrefixes(oldPrefixes, activePrefixes);
    if (activePrefixes.length > 0 && !titleObserver) {
      waitForTitle();
    } else if (activePrefixes.length === 0) {
      stopObservers();
    }
  });

  init();
})();
