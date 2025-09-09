// peaceful-meditation/app.js – Full integration with /assets/models, /assets/textures, /assets/sfx

// --- Import Three.js, relevant loaders, and controls (assume these scripts are loaded globally or via bundler) ---
// import * as THREE from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Utility Loaders ---
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new THREE.GLTFLoader();
const audioLoader = new THREE.AudioLoader();

class MeditationGarden {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = new THREE.Clock();
    
    // Environment
    this.timeOfDay = 12;
    this.rainIntensity = 0.3;
    this.windStrength = 0.5;
    this.season = 'spring';
    this.isIdleMode = false;

    // Assets
    this.assets = { models: {}, textures: {}, sounds: {} };
    // Instances
    this.animals = [];
    this.vehicles = [];
    this.natureObjects = [];
    this.interactables = [];
    // Lighting, audio, systems
    this.lights = {};
    this.audioContext = null;
    this.audioNodes = {};
    this.sfx = {};

    // Animal spawning parameters
    this.maxAnimals = 6;
    this.animalSpawnInterval = 5000; // ms
    this.animalLifetime = 15000; // ms

    // Start program
    this.init();
  }

  async init() {
    this.updateLoadingProgress(10, 'Loading textures...');
    await this.loadAllTextures();
    this.updateLoadingProgress(20, 'Loading models...');
    await this.loadAllModels();
    this.updateLoadingProgress(30, 'Loading sound effects...');
    await this.loadAllSounds();

    this.updateLoadingProgress(40, 'Setting up audio...');
    await this.setupAudio();

    this.updateLoadingProgress(50, 'Creating 3D scene...');
    this.createScene();
    this.createLighting();

    this.updateLoadingProgress(60, 'Building environment...');
    await this.createEnvironment(); // async now, since it loads models
    this.createAvatar();

    this.updateLoadingProgress(80, 'Populating garden and weather...');
    await this.createAnimals();
    await this.createVehicles();
    this.createWeatherSystems();

    this.updateLoadingProgress(90, 'Setting up controls...');
    this.setupControls();
    this.setupEventListeners();

    this.updateLoadingProgress(100, 'Welcome to your peaceful garden!');
    this.startRenderLoop();
    setTimeout(() => { this.hideLoadingScreen(); }, 1000);
  }

  // ----------- Asset Loaders --------------
  async loadAllTextures() {
    const textureNames = [
      'clouds', 'driveway', 'flame', 'grass', 'road', 'snow', 'stars', 'water'
    ];
    for (const tName of textureNames) {
      this.assets.textures[tName] = await new Promise((resolve) => {
        textureLoader.load(
          `assets/textures/${tName}.png`,
          tex => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            resolve(tex);
          },
          undefined,
          err => {
            console.error(`Texture load error: ${tName}`, err);
            this.showStatusMessage(`Texture missing: ${tName}`);
            resolve(null);
          }
        );
      });
    }
  }

  async loadAllModels() {
    // Map core types to model filenames (some will be randomized for variety)
    const modelTypes = {
      // Example logical mapping (more can be added as needed)
      squirrel: ['4cc3142b8ddf_squirrel__3d_asset_0_glb.glb','557a06770f39_squirrel__3d_asset_0_glb.glb'],
      bird: ['89abc6bdbb5b_cardinal__3d_asset_0_glb.glb','3a1af7d14723_blue_bird__3d_asset_0_glb.glb','db96878a5a10_woodpecker__3d_asset_0_glb.glb'],
      cat: ['08d0c3d15252_cat__3d_asset_0_glb.glb','98758d5f630d_cat__3d_asset_0_glb.glb','af707b76f76b_cat__3d_asset_0_glb.glb','f2afac263718_cat_black__3d_asset_0_glb.glb'],
      dog: [], // add if present
      butterfly: ['0af6ab9bd921_butterfly__3d_asset_0_glb.glb','26ee47591d21_butterfly__3d_asset_0_glb.glb','0be1c416d548_butterfly__3d_asset_0_glb.glb','d87ee13b11ec_butterfly__3d_asset_0_glb.glb'],
      frog: ['01ad36a5bea9_frog__3d_asset_0_glb.glb','a8e904d52958_frog__3d_asset_0_glb.glb','f45b6ce8e5ac_frog__3d_asset_0_glb.glb'],
      cricket: ['0267cff264d9_cricket_insect__3d_asset_0_glb.glb'],
      firefly: ['8746c07b2b96_firefly__3d_asset_0_glb.glb'],
      hummingbird: ['bbfb9b235202_hummingbird__3d_asset_0_glb.glb','6c1843fe3b22_hummingbird__3d_asset_0_glb.glb'],
      chicken: ['40a02764f871_chicken__3d_asset_0_glb.glb','8101a9f6298b_chicken__3d_asset_0_glb.glb','edab23da86f0_chicken__3d_asset_0_glb.glb'],
      duck: ['97f3e231fc7b_duck__3d_asset_0_glb.glb'],
      rabbit: ['c9b7221975c3_rabbit__3d_asset_0_glb.glb'],
      owl: ['b044afadcd8c_owl__3d_asset_0_glb.glb'],
      pigeon: ['763f6c4d2761_pigeon__3d_asset_0_glb.glb'],
      crow: ['ebdae75b9d94_crow__3d_asset_0_glb.glb'],
      geese: ['a44d4f1f30b7_geese__3d_asset_0_glb.glb'],
      bee: ['60c7f3c7b593_honeybee__3d_asset_0_glb.glb'],
      tree: ['1df36cc8fe8f_tree__3d_asset_0_glb.glb','74e34cbb78e8_tree__3d_asset_0_glb.glb','a7b0c26150fd_tree__3d_asset_0_glb.glb','bf7e9e10cf68_tree__3d_asset_0_glb.glb'],
      house: ['129527db017e_small_cabin_with_front_porch_and.glb','400bfc61c3d1_small_cabin_with_front_porch_and.glb'],
      birdbath: ['b3d90bc61e3f_birdbath__3d_asset_0_glb.glb'],
      birdhouse: ['305481297443_bird_house__3d_asset_0_glb.glb'],
      'porch-swing': ['48e2c4e32db4_porch_swing.glb','f28da8b525ca_porch_swing.glb'],
      'rocking-chair': ['3d6f05dbef54_rocking_chair__3d_asset_0_glb.glb'],
      truck: ['5410e4161646_truck__3d_asset_0_glb.glb','7540f9c77786_truck__3d_asset_0_glb.glb','eec3e444d4b9_truck__3d_asset_0_glb.glb','d85cc87b0b01_ford_truck__3d_asset_0_glb.glb','a1a9370e018d_ford_truck__3d_asset_0_glb.glb'],
      car: ['24428ba0e7d5_car__3d_asset_0_glb.glb','f08d14e54b71_car__3d_asset_0_glb.glb','1d8ed9c76843_dark_blue_2016_chevrolet_son_0_glb.glb'],
      motorcycle: ['0c0b438e0008_motorcycle_and_rider__3d_ass_0_glb.glb','aa27ba03cc01_motorcycle_and_rider__3d_ass_0_glb.glb'],
      campfire: ['f7b5d7163386_campfire__3d_asset_0_glb.glb'],
      // expand mapping as desired
    };
    // Pre-load all in parallel for reuse:
    const promises = [];
    for (const [key, glbList] of Object.entries(modelTypes)) {
      this.assets.models[key] = [];
      for (const file of glbList) {
        const p = new Promise((resolve) => {
          gltfLoader.load(
            `assets/models/${file}`,
            gltf => resolve(gltf.scene),
            undefined,
            err => {
              console.error(`Model load error: ${file}`, err);
              this.showStatusMessage(`Model missing: ${file}`);
              resolve(null);
            }
          );
        });
        this.assets.models[key].push(p);
      }
    }
    // When resolving, convert promises to loaded objects (swap array of promises with actual objects)
    for (const key in this.assets.models) {
      const result = await Promise.all(this.assets.models[key]);
      this.assets.models[key] = result;
    }
  }

  async loadAllSounds() {
    // Map SFX files (ambient and on-event)
    const soundMap = {
      rain: 'rain-and-thunder-sfx-12820.mp3',
      wind: 'wind-rustling-grass-339094.mp3',
      fire: 'fire-sound-334130.mp3',
      thunder: 'heavy-thunder-sound-effect-no-copyright-338980.mp3',
      car: 'car-passing-city-364146.mp3',
      truck: 'diesel-truck-passing-369306.mp3',
      motorcycle: 'passing-sports-motorcycle-381838.mp3',
      swing: 'swing-ropes-56497.mp3',
      // animal/nature sfx
      bird: 'bird-chirps-343624.mp3',
      chicken: 'chicken-soundscape-200111.mp3',
      cricket: 'cricket-250777.mp3',
      frog: 'crickets-395138.mp3',
      owl: 'owl-hooting-1-232347.mp3',
      squirrel: 'squirrel-74027.mp3',
      cat: 'cat-meow-7-fx-306186.mp3',
      dog: '', // add if available
      duck: '063961_female-duck-40184.mp3',
      geese: 'geese-honking-34339.mp3',
      crow: 'crow-sound-effect-hd-336784.mp3',
      hummingbird: 'humming-bird-333662.mp3',
      // expand as desired
    };
    for (const [key, file] of Object.entries(soundMap)) {
      if (!file) continue;
      this.assets.sounds[key] = await new Promise((resolve) => {
        audioLoader.load(
          `assets/sfx/${file}`,
          buffer => resolve(buffer),
          undefined,
          err => {
            console.error(`Sound load error: ${file}`, err);
            this.showStatusMessage(`Sound missing: ${file}`);
            resolve(null);
          }
        );
      });
    }
  }
  
  // ----------- UI --------------
  updateLoadingProgress(percent, message) {
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');
    if (bar) bar.style.width = percent + '%';
    if (txt) txt.textContent = message;
  }
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.classList.add('hidden');
  }
  showStatusMessage(message) {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'status-message';
    statusDiv.textContent = message;
    document.body.appendChild(statusDiv);
    setTimeout(() => { statusDiv.remove(); }, 3000);
  }

  // ----------- Audio Setup --------------
  async setupAudio() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.audioNodes.main = this.audioContext.createGain();
    this.audioNodes.main.connect(this.audioContext.destination);
    this.audioNodes.main.gain.value = 1.0;
    // Create players for ambient sound loops
    this.sfx = {};
    for (const key of ['rain', 'wind', 'fire']) {
      if (this.assets.sounds[key]) {
        const src = this.audioContext.createBufferSource();
        src.buffer = this.assets.sounds[key];
        src.loop = true;
        src.connect(this.audioNodes.main);
        src.start();
        this.sfx[key] = src;
      }
    }
  }

  playSound(key) {
    if (!this.audioContext || !this.assets.sounds[key]) return;
    const src = this.audioContext.createBufferSource();
    src.buffer = this.assets.sounds[key];
    src.connect(this.audioNodes.main);
    src.start();
  }

  // ----------- Scene Setup --------------
  createScene() {
    this.scene = new THREE.Scene();
    // TEXTURED FOG (dynamic color on time/season): fallback to default if no texture/color
    this.scene.fog = new THREE.Fog(0x87CEEB, 10, 100);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 3, 8);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('scene-container').appendChild(this.renderer.domElement);
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.maxDistance = 20; this.controls.minDistance = 2;
  }

  createLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    this.lights.ambient = ambientLight;
    // Sun
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(10, 10, 5); sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048; sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight); this.lights.sun = sunLight;
    // Moon
    const moonLight = new THREE.DirectionalLight(0x9999ff, 0.1);
    moonLight.position.set(-10, 8, -5); moonLight.visible = false;
    this.scene.add(moonLight); this.lights.moon = moonLight;
    // Fireflies (night only)
    this.lights.fireflies = [];
    for (let i = 0; i < 10; i++) {
      const fireflyLight = new THREE.PointLight(0xffff99, 0.5, 2);
      fireflyLight.visible = false; this.scene.add(fireflyLight);
      this.lights.fireflies.push(fireflyLight);
    }
  }

  // ----------- Environment / Scenery -------------
  async createEnvironment() {
    // 1. Ground with seasonal/grass/snow TEXTURE
    const groundTexture = this.assets.textures[this.season === 'winter' ? 'snow' : 'grass'] || null;
    const groundMaterial = new THREE.MeshLambertMaterial({
      map: groundTexture, color: !groundTexture ? 0x228B22 : 0xffffff
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), groundMaterial);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);

    // 2. House model or fallback cube
    await this.instantiateModel('house', { pos: [0, 0, -3], scale: 1.5 }) ||
      this.createFallbackHouse();

    // 3. Porch swing / rocking chair if asset present (attach to porch area)
    await this.instantiateModel('porch-swing', { pos: [-1, 1, 2], scale: 1 });
    await this.instantiateModel('rocking-chair', { pos: [2, 0.8, 1], scale: 1 });

    // 4. Birdbath (by fountain)
    await this.instantiateModel('birdbath', { pos: [4, 0, 4], scale: 1 });

    // 5. Trees: scattered (random positions)
    for (let i = 0; i < 4; i++)
      await this.instantiateModel('tree', { pos: [Math.random()*20-10, 0, Math.random()*20-10], scale: 0.66+Math.random()*0.33 });

    // 6. Road with TEXTURE
    const roadMat = new THREE.MeshLambertMaterial({
      map: this.assets.textures.road || null, color: !this.assets.textures.road ? 0x333333 : 0xffffff
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(50, 4), roadMat);
    road.rotation.x = -Math.PI/2; road.position.set(0, 0.02, 10); road.receiveShadow = true;
    this.scene.add(road);
    // 6b. Driveway to the house
    const driveMat = new THREE.MeshLambertMaterial({
      map: this.assets.textures.driveway || null, color: !this.assets.textures.driveway ? 0x666666 : 0xffffff
    });
    const drive = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), driveMat);
    drive.rotation.x = -Math.PI / 2; drive.position.set(0, 0.03, 3); drive.receiveShadow = true;
    this.scene.add(drive);

    // 7. Pond with WATER texture
    const pondMat = new THREE.MeshLambertMaterial({
      map: this.assets.textures.water || null, color: !this.assets.textures.water ? 0x3366ff : 0xffffff
    });
    const pond = new THREE.Mesh(new THREE.CircleGeometry(3, 32), pondMat);
    pond.rotation.x = -Math.PI / 2; pond.position.set(-5, 0.04, 5); pond.receiveShadow = true;
    this.scene.add(pond);

    // 8. Birdhouse and campfire
    await this.instantiateModel('birdhouse', { pos: [5, 2.5, 0], scale: 0.3 });
    const camp = await this.instantiateModel('campfire', { pos: [-3, 0, 2], scale: 0.5 });
    if (camp && this.assets.textures.flame) {
      const flameMat = new THREE.SpriteMaterial({ map: this.assets.textures.flame, transparent: true });
      const flame = new THREE.Sprite(flameMat);
      flame.position.set(-3, 0.7, 2); flame.scale.set(1,1,1);
      this.scene.add(flame);
    }

    // 9. Sky dome/sphere + TEXTURED clouds/stars
    this.createSky();
  }
  createFallbackHouse() {
    // Fallback if no asset/model: simple mesh as before.
    const houseGroup = new THREE.Group();
    const house = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 6), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    house.position.set(0, 2, -3); house.castShadow = true; house.receiveShadow = true; houseGroup.add(house);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 2, 4), new THREE.MeshLambertMaterial({ color: 0x654321 }));
    roof.position.set(0, 5, -3); roof.rotation.y = Math.PI/4; roof.castShadow = true; houseGroup.add(roof);
    this.scene.add(houseGroup);
  }

  async instantiateModel(type, { pos = [0,0,0], scale = 1, rot = [0,0,0] } = {}) {
    // Pick a random asset if multiple
    let arr = this.assets.models[type] || [];
    if (!arr.length) return null;
    let asset = arr[Math.floor(Math.random()*arr.length)].clone();
    asset.position.set(...pos); asset.scale.set(scale, scale, scale);
    if (rot) asset.rotation.set(...rot);
    asset.traverse(child => { if (child.isMesh) {child.castShadow = true; child.receiveShadow = true;} });
    this.scene.add(asset);
    return asset;
  }

  createSky() {
    // Day/Night sky, textured sphere
    const geometry = new THREE.SphereGeometry(500, 32, 32);
    let matOpt = { side: THREE.BackSide };
    if (this.assets.textures.stars) matOpt.map = this.assets.textures.stars;
    else matOpt.color = 0x87CEEB;
    const sky = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(matOpt));
    this.scene.add(sky); this.sky = sky;

    // Add clouds (textured sprites or meshes)
    for(let i=0;i<10;i++) {
      const cloudGeo = new THREE.SphereGeometry(2, 8, 8);
      let mat = this.assets.textures.clouds ?
        new THREE.MeshLambertMaterial({ map: this.assets.textures.clouds, transparent: true, opacity: 0.7 }) :
        new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
      const cloud = new THREE.Mesh(cloudGeo, mat);
      cloud.position.set(Math.random()*100-50, 12+Math.random()*12, Math.random()*100-50);
      cloud.scale.set(1+Math.random()*2, 0.6+Math.random()*0.7, 1+Math.random()*2);
      this.scene.add(cloud); (this.clouds = this.clouds || []).push(cloud);
    }
  }

  // ----------- Avatar -------------
  createAvatar() {
    // Fallback avatar: (Can plug in a custom asset if added, else procedural)
    // ... keep previous method or add code for custom asset avatar here
  }

  // ----------- Dynamic Animals, Vehicles, Nature -------------
  getRandomAnimalPosition(type) {
    let x = Math.random() * 20 - 10;
    let z = Math.random() * 20 - 10;
    let y = 0;
    const flyers = ['bird','pigeon','crow','owl','hummingbird','firefly','bee','butterfly'];
    if (flyers.includes(type)) y = 1 + Math.random() * 2;
    if (type === 'duck') { x = Math.random()*6-3; z = Math.random()*6+2; y = 0.05; }
    return [x, y, z];
  }

  getAnimalScale(type) {
    const scaleMap = { butterfly: 0.7, frog: 1, cricket: 1, duck: 1, rabbit: 0.8, owl: 0.8, pigeon: 0.9, crow: 0.9, geese: 1, hummingbird: 0.6, firefly: 0.3, bee: 0.3 };
    return scaleMap[type] || 1;
  }

  async createAnimals() {
    this.animals = [];
    this.animalTypes = ['squirrel','bird','cat','frog','cricket','butterfly','duck','rabbit','owl','pigeon','crow','geese','hummingbird','firefly','bee'];

    const spawnAnimal = async () => {
      if (this.animals.length >= this.maxAnimals) return;
      const type = this.animalTypes[Math.floor(Math.random()*this.animalTypes.length)];
      const pos = this.getRandomAnimalPosition(type);
      const scale = this.getAnimalScale(type);
      const animal = await this.instantiateModel(type, { pos, scale });
      if (animal) {
        this.animals.push(animal);
        this.playSound(type);
        setTimeout(() => {
          this.scene.remove(animal);
          this.animals = this.animals.filter(a => a !== animal);
        }, this.animalLifetime);
      }
    };

    this.spawnAnimal = spawnAnimal;
    for (let i = 0; i < this.maxAnimals; i++) await spawnAnimal();
    setInterval(spawnAnimal, this.animalSpawnInterval);
  }
  async createVehicles() {
    // Add random vehicles to road, using vehicles assets as available
    for(let i=0; i<2; i++)
      this.vehicles.push(await this.instantiateModel('car', { pos: [-25+i*10, 0.4, 10], scale: 1.2 }));
    for(let i=0; i<1; i++)
      this.vehicles.push(await this.instantiateModel('truck', { pos: [-20, 0.6, 10], scale: 1.2 }));
    for(let i=0; i<1; i++)
      this.vehicles.push(await this.instantiateModel('motorcycle', { pos: [-15, 0.5, 10], scale: 1.2 }));
  }

  // ----------- Controls, Logic, Render ---------
  setupControls() {
    // Example: connect sliders/buttons to properties (expand as needed)
    const timeSlider = document.getElementById('time-slider');
    if (timeSlider) {
      timeSlider.addEventListener('input', e => {
        this.timeOfDay = parseFloat(e.target.value);
        if (typeof this.updateTimeDisplay === 'function') this.updateTimeDisplay();
      });
    }
    const rainSlider = document.getElementById('rain-slider');
    if (rainSlider) {
      rainSlider.addEventListener('input', e => {
        this.rainIntensity = parseFloat(e.target.value);
        if (typeof this.updateWeather === 'function') this.updateWeather();
      });
    }
    const windSlider = document.getElementById('wind-slider');
    if (windSlider) {
      windSlider.addEventListener('input', e => {
        this.windStrength = parseFloat(e.target.value);
        if (typeof this.updateWeather === 'function') this.updateWeather();
      });
    }
    // Add more controls as needed
  }
  setupEventListeners() {
    // Example: button for changing season
    const seasonBtn = document.getElementById('season-btn');
    if (seasonBtn) {
      seasonBtn.addEventListener('click', () => {
        if (typeof this.changeSeason === 'function') this.changeSeason();
      });
    }
    // Example: random weather button
    const weatherRandom = document.getElementById('weather-random');
    if (weatherRandom) {
      weatherRandom.addEventListener('click', () => {
        if (typeof this.randomizeWeather === 'function') this.randomizeWeather();
      });
    }
    // Add more event listeners as needed
  }

  // ----------- Weather & Season ---------
  createWeatherSystems() { /* ... Rain, wind, snow, etc (use SFX) ... */ }

  // ----------- Animation Loop -----------
  animate() {
    const delta = this.clock.getDelta();
    if(this.controls) this.controls.update();
    // Animate animals, move clouds, switch lights (add user sound triggers if needed) ...
    this.renderer.render(this.scene, this.camera);
  }
  startRenderLoop() {
    const render = () => { this.animate(); requestAnimationFrame(render); };
    render();
  }
}

// --- Application Launch ---
document.addEventListener('DOMContentLoaded', () => { new MeditationGarden(); });

