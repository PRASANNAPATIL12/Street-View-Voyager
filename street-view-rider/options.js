// options.js
// Save and load global default options

document.addEventListener("DOMContentLoaded", () => {
  const defaultVehicleSelect = document.getElementById("default-vehicle-select");
  const defaultVolumeSlider = document.getElementById("default-volume-slider");
  const defaultVolumeValueDisplay = document.getElementById("default-volume-value");
  const turnSpeedInput = document.getElementById("turn-speed");
  const maxSpeedInput = document.getElementById("max-speed");
  const accelerationInput = document.getElementById("acceleration");
  const brakingForceInput = document.getElementById("braking-force");
  const dragCoefficientInput = document.getElementById("drag-coefficient");
  const saveBtn = document.getElementById("options-save-button");
  const statusMessage = document.getElementById("options-status-message");

  // Default values for settings
  const defaultSettings = {
    defaultVehicle: "car-sedan",
    defaultVolume: 0.5,
    turnSpeed: 60, // degrees per second, increased from 30
    maxSpeed: 25,  // m/s, increased from 20
    acceleration: 8, // m/s^2
    brakingForce: 15, // m/s^2
    dragCoefficient: 2.5 
  };

  // Load saved options or set defaults
  chrome.storage.sync.get(Object.keys(defaultSettings), (items) => {
    defaultVehicleSelect.value = items.defaultVehicle || defaultSettings.defaultVehicle;
    
    const volume = items.defaultVolume !== undefined ? items.defaultVolume : defaultSettings.defaultVolume;
    defaultVolumeSlider.value = volume;
    updateVolumeDisplay(volume);

    turnSpeedInput.value = items.turnSpeed || defaultSettings.turnSpeed;
    maxSpeedInput.value = items.maxSpeed || defaultSettings.maxSpeed;
    accelerationInput.value = items.acceleration || defaultSettings.acceleration;
    brakingForceInput.value = items.brakingForce || defaultSettings.brakingForce;
    dragCoefficientInput.value = items.dragCoefficient || defaultSettings.dragCoefficient;
  });

  defaultVolumeSlider.addEventListener("input", (e) => {
    updateVolumeDisplay(e.target.value);
  });

  function updateVolumeDisplay(value) {
    defaultVolumeValueDisplay.textContent = `${Math.round(parseFloat(value) * 100)}%`;
  }

  saveBtn.addEventListener("click", () => {
    const options = {
      defaultVehicle: defaultVehicleSelect.value,
      defaultVolume: parseFloat(defaultVolumeSlider.value),
      turnSpeed: parseFloat(turnSpeedInput.value),
      maxSpeed: parseFloat(maxSpeedInput.value),
      acceleration: parseFloat(accelerationInput.value),
      brakingForce: parseFloat(brakingForceInput.value),
      dragCoefficient: parseFloat(dragCoefficientInput.value)
    };

    // Validate inputs
    for (const key in options) {
        if (typeof options[key] === 'number' && isNaN(options[key])) {
            statusMessage.textContent = `Error: Invalid value for ${key}.`;
            statusMessage.style.color = '#dc3545'; // Red for error
            setTimeout(() => {
              statusMessage.textContent = "";
              statusMessage.style.color = '#28a745'; // Reset to green
            }, 3000);
            return;
        }
    }
    
    chrome.storage.sync.set(options, () => {
      statusMessage.textContent = "Options Saved!";
      statusMessage.style.color = '#28a745'; // Green for success
      setTimeout(() => (statusMessage.textContent = ""), 2000);

      // Notify content scripts if any settings that affect them were changed globally
      // This is a general notification; content-inject.js will re-fetch all settings.
      chrome.runtime.sendMessage({ action: "settingsUpdated", settings: options });
    });
  });
});
