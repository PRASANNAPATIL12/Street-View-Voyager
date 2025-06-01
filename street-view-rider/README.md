# Street View Voyager Chrome Extension

**Version**: 1.0.0  
**Author**: Firebase Studio AI

---

## Overview

“Street View Voyager” is a Chrome extension that transforms Google Maps’ Street View into an immersive 3D driving experience. Once installed and enabled, you can select a car (or bike) from the extension’s popup, then navigate through real-world streets using keyboard or on-screen controls—all without incurring additional Google Maps API billing, because the extension reuses the existing Street View instance on the page.

---

## Features

- Select from multiple 3D vehicles (Sedan, Sport Car, Road Bike).  
- Realistic driving physics (acceleration, drag, turning).  
- Immersive audio: engine loop, horn, ambient street sounds.  
- Customizable controls (W/A/S/D or any key binding) and volume.  
- Seamless integration via WebGLOverlayView—no extra Maps API calls.  
- Visually appealing interface inspired by [SlowRoads](https://slowroads.io/) and Three.js demos by [Bruno Simon](https://bruno-simon.com/).

---

## Installation

1. **Clone or download** this repository.  
2. Open Chrome and navigate to `chrome://extensions`.  
3. Enable **Developer mode** (toggle in top‐right).  
4. Click **Load unpacked** and select the `street-view-rider/` folder from this project.
5. Ensure the extension icon (puzzle piece menu) appears in your Chrome toolbar. Pin it for easy access.

---

## Usage

1. Go to **Google Maps Street View** (e.g., navigate to a location on Google Maps, then drag the Pegman onto a street). A typical Street View URL might look like: `https://www.google.com/maps/@34.0522,-118.2437,3a,75y,90h,90t/data=!3m6!...`
2. Click the “Street View Voyager” icon in the toolbar.  
3. In the popup, select your vehicle, adjust volume, and change key bindings if desired. Click "Save Settings".
4. Click **Enable Rider**. The Street View panorama will be overlaid with your chosen 3D car.  
5. Use **W/A/S/D** (or your configured keys) to accelerate, brake, and turn. Press **Space** (or your configured key) to honk.  
6. To stop, click “Disable Rider” in the popup.  

---

## How It Works

- **content.js** injects a `<div>` overlay (`svr-container`) over the entire viewport and injects `content-inject.js` into the page context.  
- **content-inject.js** locates the existing `StreetViewPanorama` instance on `maps.google.com` and attaches a `WebGLOverlayView` so Three.js can render a 3D car in front of the Street View.  
- Driving "physics" update the Street View camera’s position (`panorama.setPosition(...)`) and heading (`panorama.setPov(...)`) each animation frame, using `google.maps.geometry.spherical.computeOffset(...)` for geodesic movement.  
- Audio is handled with Howler.js; engine sound pitch changes with speed, ambient loop runs in the background, and horn plays on demand.  
- All configurable parameters (selectedVehicle, volume, turnSpeed, maxSpeed, controlsConfig, etc.) are stored in `chrome.storage.sync` to persist across devices and sessions.  

---

## File Breakdown

- **manifest.json**: Extension metadata, permissions, and content script injection.  
- **background.js**: Service worker for default settings and messaging.  
- **popup.html / popup.js / styles/popup.css**: UI for selecting vehicles and adjusting controls/volume at runtime.  
- **options.html / options.js / styles/options.css**: Full options page for setting defaults (vehicle, volume, turnSpeed, maxSpeed, acceleration, etc.).  
- **content.js**: Content script that injects the overlay div and `content-inject.js`, and listens for toggle messages from popup.  
- **content-inject.js**: Main driving logic in page context—sets up Three.js scene, loads models, handles physics, updates Street View.  
- **assets/**:  
  - **models/**: `.glb` 3D car/bike models + thumbnails (e.g., `car-sedan.glb`, `car-sedan-thumb.png`).  
  - **audio/**: Engine, horn, and ambient loops (e.g., `engine-loop.mp3`).  
  - **icons/**: Extension icons for Chrome (e.g., `icon48.png`).  

---

## Configuration & Customization

- **Vehicle Models**: To add more vehicles, drop `.glb` files in `assets/models/` and their corresponding `.png` thumbnails. Update the `vehicles` array in `popup.js` and the model mapping in `content-inject.js` and `options.html/js`.
- **Audio**: Swap audio files in `assets/audio/` with any `mp3` or `ogg`. Adjust volume behavior in `content-inject.js`.  
- **Controls**: Default keys are “KeyW”, “KeyS”, “KeyA”, “KeyD”, "Space". Change in popup or options.  
- **Driving Parameters**: Most driving parameters (turn speed, max speed, acceleration, braking, drag) can be configured on the **Options** page of the extension.

---

## Dependencies & Credits

- [Three.js](https://threejs.org/) for WebGL 3D rendering.  
- [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) for loading `.glb` models.  
- [Howler.js](https://howlerjs.com/) for audio playback.  
- **Google Maps JavaScript API** (already loaded by maps.google.com) for Street View and geometry: uses `panorama.setPosition()`, `panorama.setPov()`, and `google.maps.geometry.spherical.computeOffset()`.  
- Inspired by [SlowRoads](https://slowroads.io/) for simple driving controls and ambience.  
- 3D model inspiration from [Bruno Simon’s Three.js demos](https://bruno-simon.com/).  

---

## Troubleshooting

1. **“Could not locate StreetViewPanorama” / "N/A on this page" / Button disabled**:  
   - Ensure you are on a Google Maps URL that has an active Street View panorama.  
   - Reload the Google Maps page, then try clicking “Enable Rider” again.  
2. **No 3D car appears**:  
   - Open DevTools (Ctrl+Shift+I or Cmd+Opt+I), go to Console tab. Look for errors starting with "SVR:".  
   - Confirm your `.glb` files exist in `street-view-rider/assets/models/` and names match those in `content-inject.js`.  
   - Check that the CDN links for Three.js, GLTFLoader, and Howler.js in `content.js` are correct and accessible.
3. **Audio not playing**:  
   - Confirm volume slider in popup isn’t set to 0.  
   - Check DevTools Console for Howler.js errors.  
4. **Slow performance**:  
   - Try a simpler `.glb` with fewer polygons/textures.  
   - Ensure you’re not running other resource-intensive Chrome extensions simultaneously.  

---

## Thank You

Enjoy your drive!
