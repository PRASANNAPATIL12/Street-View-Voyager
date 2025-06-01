// popup.js

const vehicles = [
  { id: "car-sedan", name: "Sedan", thumbnail: "assets/models/car-sedan-thumb.png" },
  { id: "car-sport", name: "Sport", thumbnail: "assets/models/car-sport-thumb.png" },
  { id: "bike-road", name: "Road Bike", thumbnail: "assets/models/bike-road-thumb.png" }
  // Add more vehicles here. Ensure thumbnails and GLB models exist.
  // { id: "new-vehicle", name: "New Vehicle", thumbnail: "assets/models/new-vehicle-thumb.png" },
];

let currentTabId = null;
let isRiderEnabled = false;

document.addEventListener("DOMContentLoaded", () => {
  const vehicleList = document.getElementById("vehicle-list");
  const volumeSlider = document.getElementById("volume-slider");
  const volumeValueDisplay = document.getElementById("volume-value");
  const keyForwardInput = document.getElementById("key-forward");
  const keyBackwardInput = document.getElementById("key-backward");
  const keyLeftInput = document.getElementById("key-left");
  const keyRightInput = document.getElementById("key-right");
  const keyHornInput = document.getElementById("key-horn");
  const saveButton = document.getElementById("save-settings-button");
  const statusMessage = document.getElementById("status-message");
  const toggleRiderButton = document.getElementById("toggle-rider-button");

  const keyInputs = {
    forward: keyForwardInput,
    backward: keyBackwardInput,
    left: keyLeftInput,
    right: keyRightInput,
    horn: keyHornInput
  };

  // Get current tab to send messages to
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
        currentTabId = tabs[0].id;
        // Request current rider status from content script
        chrome.tabs.sendMessage(currentTabId, { action: "SVR_GET_STATUS" }, (response) => {
            if (chrome.runtime.lastError) {
                // console.warn("SVR Popup: Error getting status, content script may not be active.", chrome.runtime.lastError.message);
                toggleRiderButton.disabled = true; // Disable if not on maps page
                toggleRiderButton.textContent = "N/A on this page";
                return;
            }
            if (response && response.isEnabled !== undefined) {
                isRiderEnabled = response.isEnabled;
                updateToggleButton();
            }
        });
    } else {
        toggleRiderButton.disabled = true;
        toggleRiderButton.textContent = "Error: No active tab";
    }
  });

  // Create vehicle thumbnails
  vehicles.forEach((veh) => {
    const div = document.createElement("div");
    div.classList.add("vehicle-item");
    div.dataset.vehicleId = veh.id;
    const img = document.createElement("img");
    img.src = chrome.runtime.getURL(veh.thumbnail); // Use getURL for extension assets
    img.alt = veh.name;
    img.setAttribute('data-ai-hint', `${veh.name.toLowerCase().replace(' ', '-')} vehicle`); // AI hint for placeholder
    div.appendChild(img);
    div.addEventListener("click", () => {
      document.querySelectorAll(".vehicle-item").forEach(el => el.classList.remove("selected"));
      div.classList.add("selected");
      // No need to save immediately, save button will handle it.
    });
    vehicleList.appendChild(div);
  });

  // Load saved settings
  chrome.storage.sync.get(["selectedVehicle", "volume", "controlsConfig"], (items) => {
    if (items.selectedVehicle) {
      const sel = document.querySelector(`.vehicle-item[data-vehicle-id="${items.selectedVehicle}"]`);
      if (sel) sel.classList.add("selected");
    } else {
      const firstVehicleItem = document.querySelector(".vehicle-item");
      if (firstVehicleItem) {
         firstVehicleItem.classList.add("selected");
      }
    }

    volumeSlider.value = items.volume !== undefined ? items.volume : 0.5;
    updateVolumeDisplay(volumeSlider.value);

    const defaultConfig = { forward: "KeyW", backward: "KeyS", left: "KeyA", right: "KeyD", horn: "Space" };
    const controls = items.controlsConfig || defaultConfig;
    keyInputs.forward.value = controls.forward;
    keyInputs.backward.value = controls.backward;
    keyInputs.left.value = controls.left;
    keyInputs.right.value = controls.right;
    keyInputs.horn.value = controls.horn;
  });

  volumeSlider.addEventListener("input", (e) => {
    updateVolumeDisplay(e.target.value);
  });

  function updateVolumeDisplay(value) {
    volumeValueDisplay.textContent = `${Math.round(parseFloat(value) * 100)}%`;
  }
  
  // Handle key input fields to display "Press any key..."
  Object.values(keyInputs).forEach(input => {
    input.addEventListener('focus', () => {
      input.dataset.originalValue = input.value;
      input.value = 'Press key...';
      input.select(); // Select text for easy overwrite
    });
    input.addEventListener('blur', () => {
      if (input.value === 'Press key...' || input.value.trim() === '') {
        input.value = input.dataset.originalValue || getDefaultKey(input.dataset.keybind);
      }
    });
    input.addEventListener('keydown', (e) => {
      e.preventDefault();
      input.value = e.code; // Use e.code for physical key, e.key for character
      input.blur(); // Move to next field or save
    });
  });

  function getDefaultKey(binding) {
    const defaults = { forward: "KeyW", backward: "KeyS", left: "KeyA", right: "KeyD", horn: "Space" };
    return defaults[binding] || "";
  }

  saveButton.addEventListener("click", () => {
    const selectedVehicleDiv = document.querySelector(".vehicle-item.selected");
    const selectedVehicle = selectedVehicleDiv ? selectedVehicleDiv.dataset.vehicleId : vehicles[0].id;
    
    const controlsConfig = {
      forward: keyInputs.forward.value.trim() || getDefaultKey('forward'),
      backward: keyInputs.backward.value.trim() || getDefaultKey('backward'),
      left: keyInputs.left.value.trim() || getDefaultKey('left'),
      right: keyInputs.right.value.trim() || getDefaultKey('right'),
      horn: keyInputs.horn.value.trim() || getDefaultKey('horn')
    };

    const settingsToSave = {
      selectedVehicle: selectedVehicle,
      volume: parseFloat(volumeSlider.value),
      controlsConfig: controlsConfig
    };

    chrome.storage.sync.set(settingsToSave, () => {
      statusMessage.textContent = "Settings Saved!";
      setTimeout(() => {
        statusMessage.textContent = "";
      }, 2000);
      // Notify content script of settings update
      if (currentTabId) {
        chrome.tabs.sendMessage(currentTabId, { action: "SVR_SETTINGS_UPDATE", settings: settingsToSave });
      }
      // Notify background script to relay to other tabs if necessary
      chrome.runtime.sendMessage({ action: "settingsUpdated", settings: settingsToSave });
    });
  });

  function updateToggleButton() {
    if (isRiderEnabled) {
      toggleRiderButton.textContent = "Disable Rider";
      toggleRiderButton.classList.add("active");
    } else {
      toggleRiderButton.textContent = "Enable Rider";
      toggleRiderButton.classList.remove("active");
    }
  }

  toggleRiderButton.addEventListener("click", () => {
    if (currentTabId) {
      isRiderEnabled = !isRiderEnabled;
      chrome.tabs.sendMessage(currentTabId, { action: "SVR_TOGGLE_RIDER", enable: isRiderEnabled }, (response) => {
         if (chrome.runtime.lastError) {
            // console.error("SVR Popup: Error toggling rider.", chrome.runtime.lastError.message);
            statusMessage.textContent = "Error on page.";
            // Revert state if message failed
            isRiderEnabled = !isRiderEnabled; 
            return;
        }
        if (response && response.status === "toggled") {
            updateToggleButton();
        }
      });
    }
  });

});
