(() => {
  let svrContainer = document.getElementById("svr-container");
  let riderEnabled = false; // Local state for the toggle
  const cacheKeyPrefix = 'svr_cache_';

  // Function to cache data
  const cacheData = (key, data) => {
    try {
      localStorage.setItem(cacheKeyPrefix + key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to cache data:', e);
    }
  };

  // Function to retrieve data from cache
  const getCachedData = (key) => {
    try {
      const cachedData = localStorage.getItem(cacheKeyPrefix + key);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (e) {
      console.error('Failed to retrieve data from cache:', e);
      return null;
    }
  };

  if (!svrContainer) {
    svrContainer = document.createElement("div");
    svrContainer.id = "svr-container";
    Object.assign(svrContainer.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "2147483647", 
      display: "none"
    });
    document.body.appendChild(svrContainer);

    // Inject scripts only once
    const injectScripts = () => {
      const scripts = [
        // Three.js r152 is known to work, but newer versions could be used.
        // Pinning versions for stability:
        "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.152.2/three.min.js",
        // GLTFLoader is part of examples/jsm/loaders in modern Three.js, but this CDN link is for older structure.
        // If issues, consider bundling or using a module loader. This example uses a common CDN path for GLTFLoader.
        "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/js/loaders/GLTFLoader.js", 
        "https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js", // Using 2.2.4
        chrome.runtime.getURL("content-inject.js")
      ];
      scripts.forEach((src) => {
        const s = document.createElement("script");
        s.src = src;
        s.type = "text/javascript"; // 'module' if content-inject.js uses ES6 imports
        s.async = false; // Load them sequentially for dependency
        document.head.appendChild(s);
      });
    };
    injectScripts();
  }


  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "SVR_TOGGLE_RIDER") {
      riderEnabled = message.enable;
      if (riderEnabled) {
        svrContainer.style.display = "block";
        svrContainer.style.pointerEvents = "auto"; // Allow interactions with overlay if needed, e.g., on-screen controls
        window.postMessage({ type: "SVR_START" }, "*");
      } else {
        svrContainer.style.display = "none";
        svrContainer.style.pointerEvents = "none";
        window.postMessage({ type: "SVR_STOP" }, "*");
      }
      sendResponse({ status: "toggled", isEnabled: riderEnabled });
    } else if (message.action === "SVR_GET_STATUS") {
      sendResponse({ isEnabled: riderEnabled });
    } else if (message.action === "SVR_SETTINGS_UPDATE") {
      // Forward settings update to the injected script
      window.postMessage({ type: "SVR_SETTINGS_UPDATE", settings: message.settings }, "*");
    }
    return true; // Keep message channel open for async response if needed.
  });

})();
