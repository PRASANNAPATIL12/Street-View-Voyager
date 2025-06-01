(() => {
  let dependenciesLoaded = false;
  let initAttempted = false;
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

  function waitForDependencies() {
    return new Promise((resolve, reject) => {
      let checks = 0;
      const maxChecks = 50; // Wait for max 10 seconds
      const check = () => {
        if (
          window.THREE &&
          window.THREE.GLTFLoader && // Note: GLTFLoader might be window.GLTFLoader depending on CDN/import
          window.Howl &&
          window.google &&
          window.google.maps &&
          window.google.maps.StreetViewPanorama &&
          window.google.maps.geometry // Ensure geometry library is loaded
        ) {
          dependenciesLoaded = true;
          resolve();
        } else {
          checks++;
          if (checks > maxChecks) {
            console.error("SVR: Dependencies did not load in time.");
            reject(new Error("Dependencies timed out"));
          } else {
            setTimeout(check, 200);
          }
        }
      };
      check();
    });
  }
  
  // Global state for the rider
  let scene, camera, renderer, loader, clock;
  let carModel = null;
  let currentSettings = {};
  let isDriving = false;
  let keysPressed = { forward: false, backward: false, left: false, right: false, horn: false };
  let speed = 0; // m/s
  let heading = 0; // degrees from North, clockwise
  let pitch = 0; // Vehicle pitch, for visual effect
  let positionLatLng = null;
  let lastFrameTime = performance.now();
  let panorama = null;
  let overlay = null;
  let svrAudio = {}; // { engine: Howl, horn: Howl, ambient: Howl }

  // Default physics/control values, can be overridden by settings
  const baseSettings = {
    vehicleId: "car-sedan",
    volume: 0.5,
    turnSpeed: 60,      // degrees per second at low speed
    maxSpeed: 25,       // m/s
    acceleration: 8,    // m/s^2
    brakingForce: 15,   // m/s^2 (deceleration when braking)
    dragCoefficient: 2.5, // general drag/friction
    controls: { forward: "KeyW", backward: "KeyS", left: "KeyA", right: "KeyD", horn: "Space" }
  };

  async function initStreetViewRider() {
    if (initAttempted) return;
    initAttempted = true;

    try {
      await waitForDependencies();
    } catch (error) {
      console.error("SVR: Failed to initialize due to missing dependencies:", error);
      return;
    }
    
    panorama = findPanoramaInstance();
    if (!panorama) {
      console.error("SVR: StreetViewPanorama instance not found.");
      return;
    }

    // Initial POV and position
    positionLatLng = panorama.getPosition();
    heading = panorama.getPov().heading;

    await loadCurrentSettings(); // Load settings from storage
    setupOverlay();
    setupEventListeners();
    console.log("SVR: Street View Rider initialized.");
  }

  function findPanoramaInstance() {
    // Heuristic to find the StreetViewPanorama instance
    // This might need adjustment if Google changes their page structure.
    const panoramaDiv = document.querySelector('.gm-style > div > div > div:has(canvas)'); // Common structure
    if (panoramaDiv) {
      for (const key in panoramaDiv) {
        if (key.startsWith('__reactFiber$')) { // React internal instance
          let fiberNode = panoramaDiv[key];
          // Traverse upwards to find a component that might hold the panorama or map
          let attempts = 0;
          while(fiberNode && attempts < 15) { // Limit search depth
            if (fiberNode.memoizedProps && fiberNode.memoizedProps.map) {
                 const mapInstance = fiberNode.memoizedProps.map;
                 if (mapInstance && mapInstance.getStreetView && mapInstance.getStreetView()) {
                     const sv = mapInstance.getStreetView();
                     if (sv instanceof google.maps.StreetViewPanorama) return sv;
                 }
            }
             if (fiberNode.return && fiberNode.return.stateNode instanceof google.maps.StreetViewPanorama) {
                return fiberNode.return.stateNode;
            }
            fiberNode = fiberNode.return;
            attempts++;
          }
        }
      }
    }
    // Fallback, less reliable
    for (let key in window) {
      if (window[key] && window[key].gm_bindings_ && Object.values(window[key].gm_bindings_).some(v => v instanceof google.maps.StreetViewPanorama) ) {
        const found = Object.values(window[key].gm_bindings_).find(v => v instanceof google.maps.StreetViewPanorama);
        if(found) return found;
      }
    }
    // Try to find it on any map instance
    if(window.google && window.google.maps && window.google.maps.Map){
        const maps = Object.values(window).filter(obj => obj instanceof window.google.maps.Map);
        for(const map of maps){
            const sv = map.getStreetView();
            if(sv && sv.getVisible()){ // If a street view is active on this map
                return sv;
            }
        }
    }
    return null;
  }

  async function loadCurrentSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get(Object.keys(baseSettings), (items) => {
        currentSettings = { ...baseSettings, ...items };
        // Ensure nested controls object is also merged or defaulted
        currentSettings.controls = items.controlsConfig || baseSettings.controls;
        if (svrAudio.engine) svrAudio.engine.volume(currentSettings.volume);
        if (svrAudio.horn) svrAudio.horn.volume(currentSettings.volume);
        if (svrAudio.ambient) svrAudio.ambient.volume(currentSettings.volume * 0.4); // Ambient usually softer
        resolve();
      });
    });
  }
  
  function setupOverlay() {
    if (!panorama) return;
    overlay = new google.maps.WebGLOverlayView();

    overlay.onAdd = () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
      
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      loader = new THREE.GLTFLoader(); // GLTFLoader should be available on window.THREE
      clock = new THREE.Clock();

      loadVehicleModel(currentSettings.vehicleId);

      // Audio setup
      svrAudio.engine = new Howl({ src: [chrome.runtime.getURL(`assets/audio/engine-loop.mp3`)], loop: true, volume: currentSettings.volume, rate: 1.0 });
      svrAudio.horn = new Howl({ src: [chrome.runtime.getURL(`assets/audio/horn.mp3`)], loop: false, volume: currentSettings.volume });
      svrAudio.ambient = new Howl({ src: [chrome.runtime.getURL(`assets/audio/ambient-street.mp3`)], loop: true, volume: currentSettings.volume * 0.4 });
    };

    overlay.onContextRestored = ({ gl }) => {
      renderer = new THREE.WebGLRenderer({
        canvas: gl.canvas,
        context: gl,
        antialias: true,
        alpha: true
      });
      renderer.autoClear = false; // Important for Google Maps overlay
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace; // For GLTF models
    };

    overlay.onDraw = ({ transformer }) => {
      if (!isDriving && !carModel) { // if not driving and no car loaded, don't draw
        overlay.requestRedraw(); 
        return;
      }
      if (!renderer || !carModel) { // If renderer or car not ready, request redraw and wait
          overlay.requestRedraw();
          return;
      }

      const deltaTime = clock.getDelta();
      updateVehiclePhysics(deltaTime);

      if (isDriving && positionLatLng && google.maps.geometry) {
        panorama.setPosition(positionLatLng);
        panorama.setPov({ heading: heading, pitch: 0, zoom: 1 }); // Keep pitch at 0 for simplicity
      }
      
      // Sync Three.js camera with Street View POV
      const pov = panorama.getPov();
      const fov = 90 / Math.pow(2, panorama.getZoom()); // Approximate FOV calculation
      camera.fov = fov;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      
      // Transform matrix from Google Maps
      const matrix = transformer.fromLatLngAltitude({lat: positionLatLng.lat(), lng: positionLatLng.lng()}, 0);
      camera.projectionMatrix.fromArray(matrix); // This applies the Google Maps projection directly

      // Car model positioned relative to the camera.
      // Since camera projection is handled by Maps, we place car at origin (0,0,0) in view space.
      // And adjust its Z position to appear in front of camera.
      carModel.position.set(0, -0.4, -1.5); // x, y (height from ground), z (distance from camera)
      carModel.rotation.y = THREE.MathUtils.degToRad(180); // Model faces forward relative to camera view
      // Additional pitch effect based on speed/acceleration could be added:
      // carModel.rotation.x = THREE.MathUtils.degToRad(pitch);


      renderer.render(scene, camera);
      overlay.requestRedraw();
    };

    overlay.onRemove = () => {
      if (carModel) scene.remove(carModel);
      if (renderer) renderer.dispose();
      Object.values(svrAudio).forEach(s => s.stop());
    };
    
    overlay.setMap(panorama);
  }

  function updateVehiclePhysics(deltaTime) {
    const absSpeed = Math.abs(speed);
    
    // Acceleration / Braking
    if (keysPressed.forward) {
      speed += currentSettings.acceleration * deltaTime;
    } else if (keysPressed.backward) {
      speed -= currentSettings.brakingForce * deltaTime;
    } else { // Natural deceleration (drag)
      speed -= Math.sign(speed) * currentSettings.dragCoefficient * deltaTime;
      if (absSpeed < 0.1) speed = 0; // Stop if very slow
    }
    speed = Math.max(-currentSettings.maxSpeed / 2, Math.min(speed, currentSettings.maxSpeed)); // Clamp speed

    // Steering
    // Reduce turn speed at higher speeds for stability
    const turnFactor = 1 - Math.min(1, absSpeed / currentSettings.maxSpeed) * 0.7; // Turn less at high speed
    if (keysPressed.left) {
      heading -= currentSettings.turnSpeed * turnFactor * deltaTime * (speed >= 0 ? 1 : -1); // Invert steer if reversing
    }
    if (keysPressed.right) {
      heading += currentSettings.turnSpeed * turnFactor * deltaTime * (speed >= 0 ? 1 : -1);
    }
    heading = (heading + 360) % 360;

    // Update position
    if (google.maps.geometry && google.maps.geometry.spherical && positionLatLng && speed !== 0) {
        const distanceTraveled = speed * deltaTime;
        positionLatLng = google.maps.geometry.spherical.computeOffset(positionLatLng, distanceTraveled, heading);
    }
    
    // Audio update for engine
    if (svrAudio.engine) {
        if (absSpeed > 0.1 && isDriving) {
            if (!svrAudio.engine.playing()) svrAudio.engine.play();
            // Pitch and volume modulation based on speed
            const targetRate = 0.8 + (absSpeed / currentSettings.maxSpeed) * 1.2; // Range from 0.8 to 2.0
            svrAudio.engine.rate(targetRate); // Adjust pitch
            svrAudio.engine.volume(currentSettings.volume * (0.5 + absSpeed / currentSettings.maxSpeed * 0.5) );
        } else if (svrAudio.engine.playing()) {
            svrAudio.engine.fade(svrAudio.engine.volume(), 0, 500); // Fade out when stopped
            setTimeout(() => { if(speed === 0) svrAudio.engine.stop(); }, 500);
        }
    }
  }

  function loadVehicleModel(vehicleId) {
    if (carModel) scene.remove(carModel); // Remove old model if exists
    const modelFileName = {
      "car-sedan": "car-sedan.glb",
      "car-sport": "car-sport.glb",
      "bike-road": "bike-road.glb"
    }[vehicleId];

    if (!modelFileName) {
      console.error(`SVR: Unknown vehicleId "${vehicleId}"`);
      return;
    }
    const modelPath = chrome.runtime.getURL(`assets/models/${modelFileName}`);

    // Check cache for the model
    const cachedModel = getCachedData(modelPath);
    if (cachedModel) {
      console.log("SVR: Loading model from cache:", modelPath);
      carModel = cachedModel; // Directly use cached model
      scene.add(carModel);
    } else {
      loader.load(modelPath, (gltf) => {
        carModel = gltf.scene;
        // Adjust scale and initial orientation as needed for your model
        // Example: carModel.scale.set(0.5, 0.5, 0.5);
        // carModel.rotation.y = Math.PI; // if model faces wrong way
        scene.add(carModel);
        cacheData(modelPath, carModel); // Cache the model
      }, undefined, (error) => {
        console.error("SVR: Error loading model:", error);
      });
    }
  }
  
  function setupEventListeners() {
    window.addEventListener("message", (event) => {
      if (event.source !== window || !event.data) return; // Ignore messages from other sources

      const { type, payload, settings, enable } = event.data;

      if (type === "SVR_START") {
        if (!dependenciesLoaded && !initAttempted) { // If first time starting
          initStreetViewRider().then(() => {
             isDriving = true;
             if (svrAudio.ambient && !svrAudio.ambient.playing()) svrAudio.ambient.play();
          });
        } else if (dependenciesLoaded) { // If already initialized
          isDriving = true;
          if (svrAudio.ambient && !svrAudio.ambient.playing()) svrAudio.ambient.play();
          // Ensure panorama and position are current
          if(panorama) {
            positionLatLng = panorama.getPosition();
            heading = panorama.getPov().heading;
          }
        }
      } else if (type === "SVR_STOP") {
        isDriving = false;
        if (svrAudio.engine && svrAudio.engine.playing()) svrAudio.engine.stop();
        if (svrAudio.ambient && svrAudio.ambient.playing()) svrAudio.ambient.stop();
      } else if (type === "SVR_SETTINGS_UPDATE" && settings) {
        currentSettings = { ...currentSettings, ...settings };
        // Specific updates:
        if (settings.selectedVehicle && settings.selectedVehicle !== currentSettings.vehicleId) {
            currentSettings.vehicleId = settings.selectedVehicle;
            loadVehicleModel(currentSettings.vehicleId);
        }
        if (settings.volume !== undefined) {
            currentSettings.volume = settings.volume;
            if (svrAudio.engine) svrAudio.engine.volume(currentSettings.volume);
            if (svrAudio.horn) svrAudio.horn.volume(currentSettings.volume);
            if (svrAudio.ambient) svrAudio.ambient.volume(currentSettings.volume * 0.4);
        }
        // Other physics params are used directly from currentSettings in updateVehiclePhysics
      }
    });

    const keyMap = (e, pressed) => {
      if (!isDriving) return;
      // Inverse map from key code to action
      const controlActions = Object.entries(currentSettings.controls).reduce((acc, [action, keyCode]) => {
        acc[keyCode] = action;
        return acc;
      }, {});

      const action = controlActions[e.code];
      if (action) {
        keysPressed[action] = pressed;
        if (action === 'horn' && pressed && svrAudio.horn) {
          svrAudio.horn.play();
        }
      }
    };

    window.addEventListener("keydown", (e) => keyMap(e, true));
    window.addEventListener("keyup", (e) => keyMap(e, false));

    // Attempt to initialize if on a Street View page already
    if (document.readyState === 'complete') {
        if (window.location.href.includes("/maps/@") && window.location.href.includes(",3a,")) {
            initStreetViewRider();
        }
    } else {
        window.addEventListener('load', () => {
            if (window.location.href.includes("/maps/@") && window.location.href.includes(",3a,")) {
                initStreetViewRider();
            }
        });
    }
  }

  // Initial call to check if we should init (e.g. page already loaded with StreetView)
  // This is a bit eager, message from content.js (SVR_START) is primary trigger now.
  // if (document.readyState === "complete" || document.readyState === "interactive") {
  //    if (window.location.href.includes("/maps/@") && window.location.href.includes("3a,")) { // If URL looks like SV
  //        initStreetViewRider();
  //    }
  // } else {
  //    window.addEventListener("load", () => {
  //        if (window.location.href.includes("/maps/@") && window.location.href.includes("3a,")) {
  //            initStreetViewRider();
  //        }
  //    });
  // }

})();
