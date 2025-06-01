// background.js
// This service worker listens for messages from the popup and options pages,
// and can relay configuration changes if needed. For now, it mostly idles.

chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings if none exist
  chrome.storage.sync.get(
    ["selectedVehicle", "volume", "controlsConfig"],
    (items) => {
      if (!items.selectedVehicle) {
        chrome.storage.sync.set({ selectedVehicle: "car-sedan" });
      }
      if (items.volume === undefined) { // Check for undefined to allow 0
        chrome.storage.sync.set({ volume: 0.5 });
      }
      if (!items.controlsConfig) {
        chrome.storage.sync.set({
          controlsConfig: { forward: "KeyW", backward: "KeyS", left: "KeyA", right: "KeyD", horn: "Space" }
        });
      }
      // Default driving parameters from options page
      if (items.turnSpeed === undefined) {
         chrome.storage.sync.set({ turnSpeed: 30 });
      }
      if (items.maxSpeed === undefined) {
         chrome.storage.sync.set({ maxSpeed: 20 });
      }
    }
  );
});

// Listen for messages from popup.js or content scripts if needed in future
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    chrome.storage.sync.get(null, (items) => {
      sendResponse({ settings: items });
    });
    return true; // keep channel open for async sendResponse
  }

  // Relay settings changes to active Street View tabs
  if (request.action === "settingsUpdated") {
    chrome.tabs.query({url: "https://*.google.com/maps/*"}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: "SVR_SETTINGS_UPDATE", settings: request.settings });
        }
      });
    });
  }
});
