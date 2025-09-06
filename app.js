// 3D Peaceful Meditation Garden Application
class MeditationGarden {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = new THREE.Clock();
        
        // Environment state
        this.timeOfDay = 12; // 0-24 hours
        this.rainIntensity = 0.3;
        this.windStrength = 0.5;
        this.season = 'spring'; // spring, summer, autumn, winter
        this.isIdleMode = false;
        
        // Objects and systems
        this.rainSystem = null;
        this.avatar = null;
        this.animals = [];
        this.interactables = [];
        this.sounds = {};
        this.lights = {};
        
        // Audio context
        this.audioContext = null;
        this.audioNodes = {};
        
        this.init();
    }

    async init() {
        this.updateLoadingProgress(20, 'Setting up audio...');
        await this.setupAudio();
        
        this.updateLoadingProgress(40, 'Creating 3D scene...');
        this.createScene();
        this.createLighting();
        
        this.updateLoadingProgress(60, 'Building environment...');
        this.createEnvironment();
        this.createAvatar();
        
        this.updateLoadingProgress(80, 'Adding animals and weather...');
        this.createAnimals();
        this.createWeatherSystems();
        
        this.updateLoadingProgress(90, 'Setting up controls...');
        this.setupControls();
        this.setupEventListeners();
        
        this.updateLoadingProgress(100, 'Welcome to your peaceful garden!');
        
        // Start the render loop first
        this.startRenderLoop();
        
        // Hide loading screen after a short delay
        setTimeout(() => {
            this.hideLoadingScreen();
        }, 1000);
    }

    updateLoadingProgress(percent, message) {
        const loadingBar = document.getElementById('loading-bar');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingBar) {
            loadingBar.style.width = percent + '%';
        }
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    async setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create audio nodes for different sound layers
            this.audioNodes.rain = this.audioContext.createGain();
            this.audioNodes.nature = this.audioContext.createGain();
            this.audioNodes.wind = this.audioContext.createGain();
            
            // Connect to destination
            this.audioNodes.rain.connect(this.audioContext.destination);
            this.audioNodes.nature.connect(this.audioContext.destination);
            this.audioNodes.wind.connect(this.audioContext.destination);
            
            // Set initial volumes
            this.audioNodes.rain.gain.value = 0.6;
            this.audioNodes.nature.gain.value = 0.7;
            this.audioNodes.wind.gain.value = 0.5;
            
            // Create procedural audio
            this.createProceduralAudio();
        } catch (error) {
            console.log('Audio setup failed, continuing without audio:', error);
        }
    }

    createProceduralAudio() {
        if (!this.audioContext) return;
        
        // Rain sound using white noise and filtering
        const createRainSound = () => {
            const bufferSize = this.audioContext.sampleRate * 2;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.3;
            }
            
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            
            source.connect(filter);
            filter.connect(this.audioNodes.rain);
            source.start();
            
            return { source, filter };
        };

        // Wind sound
        const createWindSound = () => {
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = 60;
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 200;
            filter.Q.value = 0.5;
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0.1;
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioNodes.wind);
            oscillator.start();
            
            return { oscillator, filter, gainNode };
        };

        // Nature sounds (birds, crickets)
        const createNatureSound = () => {
            const bufferSize = this.audioContext.sampleRate * 0.1;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Create chirping pattern
            for (let i = 0; i < bufferSize; i++) {
                const t = i / this.audioContext.sampleRate;
                data[i] = Math.sin(2 * Math.PI * (800 + 400 * Math.sin(20 * Math.PI * t)) * t) * 
                         Math.exp(-t * 10) * 0.2;
            }
            
            const playBirdSound = () => {
                if (Math.random() < 0.1) { // 10% chance per frame
                    const source = this.audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(this.audioNodes.nature);
                    source.start();
                }
                setTimeout(playBirdSound, 100 + Math.random() * 2000);
            };
            
            playBirdSound();
        };

        this.sounds.rain = createRainSound();
        this.sounds.wind = createWindSound();
        createNatureSound();
    }

    createScene() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 100);
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 3, 8);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        
        document.getElementById('scene-container').appendChild(this.renderer.domElement);
        
        // Controls setup
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.maxDistance = 20;
        this.controls.minDistance = 2;
    }

    createLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        this.lights.ambient = ambientLight;
        
        // Sun (directional light)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(10, 10, 5);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 50;
        sunLight.shadow.camera.left = -10;
        sunLight.shadow.camera.right = 10;
        sunLight.shadow.camera.top = 10;
        sunLight.shadow.camera.bottom = -10;
        this.scene.add(sunLight);
        this.lights.sun = sunLight;
        
        // Moon light (initially off)
        const moonLight = new THREE.DirectionalLight(0x9999ff, 0.1);
        moonLight.position.set(-10, 8, -5);
        moonLight.visible = false;
        this.scene.add(moonLight);
        this.lights.moon = moonLight;
        
        // Point lights for fireflies (night time)
        this.lights.fireflies = [];
        for (let i = 0; i < 10; i++) {
            const fireflyLight = new THREE.PointLight(0xffff99, 0.5, 2);
            fireflyLight.visible = false;
            this.scene.add(fireflyLight);
            this.lights.fireflies.push(fireflyLight);
        }
    }

    createEnvironment() {
        // Ground
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // House structure
        this.createHouse();
        
        // Porch
        this.createPorch();
        
        // Trees and plants
        this.createTrees();
        
        // Bird feeder and fountain
        this.createBirdFeeder();
        
        // Road
        this.createRoad();
        
        // Sky and clouds
        this.createSky();
    }

    createHouse() {
        // Simple house structure
        const houseGroup = new THREE.Group();
        
        // Main house body
        const houseGeometry = new THREE.BoxGeometry(8, 4, 6);
        const houseMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const house = new THREE.Mesh(houseGeometry, houseMaterial);
        house.position.set(0, 2, -3);
        house.castShadow = true;
        house.receiveShadow = true;
        houseGroup.add(house);
        
        // Roof
        const roofGeometry = new THREE.ConeGeometry(6, 2, 4);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 5, -3);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        houseGroup.add(roof);
        
        this.scene.add(houseGroup);
    }

    createPorch() {
        const porchGroup = new THREE.Group();
        
        // Porch deck
        const deckGeometry = new THREE.BoxGeometry(6, 0.2, 3);
        const deckMaterial = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
        const deck = new THREE.Mesh(deckGeometry, deckMaterial);
        deck.position.set(0, 0.1, 1);
        deck.castShadow = true;
        deck.receiveShadow = true;
        porchGroup.add(deck);
        
        // Porch posts
        for (let i = 0; i < 4; i++) {
            const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
            const postMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
            const post = new THREE.Mesh(postGeometry, postMaterial);
            const x = (i % 2) * 5 - 2.5;
            const z = Math.floor(i / 2) * 2.5 - 0.25;
            post.position.set(x, 1.5, z);
            post.castShadow = true;
            porchGroup.add(post);
        }
        
        // Swing
        this.createSwing(porchGroup);
        
        // Rocking chair
        this.createRockingChair(porchGroup);
        
        this.scene.add(porchGroup);
    }

    createSwing(parent) {
        const swingGroup = new THREE.Group();
        
        // Swing seat
        const seatGeometry = new THREE.BoxGeometry(2, 0.1, 0.8);
        const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(-1, 1.5, 1);
        seat.castShadow = true;
        swingGroup.add(seat);
        
        // Swing chains
        for (let i = 0; i < 4; i++) {
            const chainGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.3);
            const chainMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const chain = new THREE.Mesh(chainGeometry, chainMaterial);
            const x = (i % 2) * 1.8 - 0.9;
            const z = Math.floor(i / 2) * 0.6 + 0.7;
            chain.position.set(-1 + x * 0.5, 2.15, z);
            swingGroup.add(chain);
        }
        
        // Make swing interactive
        const swingInteractable = {
            object: seat,
            type: 'swing',
            action: () => this.interactWithSwing(swingGroup)
        };
        this.interactables.push(swingInteractable);
        
        parent.add(swingGroup);
    }

    createRockingChair(parent) {
        const chairGroup = new THREE.Group();
        
        // Chair seat
        const seatGeometry = new THREE.BoxGeometry(1, 0.1, 1);
        const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(2, 0.8, 1);
        seat.castShadow = true;
        chairGroup.add(seat);
        
        // Chair back
        const backGeometry = new THREE.BoxGeometry(1, 1.5, 0.1);
        const backMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const back = new THREE.Mesh(backGeometry, backMaterial);
        back.position.set(2, 1.3, 0.55);
        back.castShadow = true;
        chairGroup.add(back);
        
        // Rockers
        for (let i = 0; i < 2; i++) {
            const rockerGeometry = new THREE.TorusGeometry(0.8, 0.05, 8, 16, Math.PI);
            const rockerMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
            const rocker = new THREE.Mesh(rockerGeometry, rockerMaterial);
            rocker.position.set(2, 0.3, 0.5 + i * 1);
            rocker.rotation.x = Math.PI / 2;
            chairGroup.add(rocker);
        }
        
        // Make chair interactive
        const chairInteractable = {
            object: seat,
            type: 'chair',
            action: () => this.interactWithChair(chairGroup)
        };
        this.interactables.push(chairInteractable);
        
        parent.add(chairGroup);
    }

    createTrees() {
        // Cherry blossom tree
        const treeGroup = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(-4, 1.5, 3);
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // Foliage (cherry blossoms)
        const foliageGeometry = new THREE.SphereGeometry(2, 8, 8);
        const foliageMaterial = new THREE.MeshLambertMaterial({ 
            color: this.season === 'spring' ? 0xFFB6C1 : 0x228B22 
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.set(-4, 4, 3);
        foliage.castShadow = true;
        treeGroup.add(foliage);
        
        this.scene.add(treeGroup);
        
        // Additional smaller trees
        for (let i = 0; i < 3; i++) {
            const smallTree = treeGroup.clone();
            smallTree.scale.set(0.6, 0.6, 0.6);
            smallTree.position.set(
                Math.random() * 20 - 10,
                0,
                Math.random() * 20 - 10
            );
            this.scene.add(smallTree);
        }
    }

    createBirdFeeder() {
        const feederGroup = new THREE.Group();
        
        // Post
        const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2);
        const postMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(3, 1, 4);
        post.castShadow = true;
        feederGroup.add(post);
        
        // Feeder bowl
        const bowlGeometry = new THREE.CylinderGeometry(0.5, 0.3, 0.2);
        const bowlMaterial = new THREE.MeshLambertMaterial({ color: 0xFF6347 });
        const bowl = new THREE.Mesh(bowlGeometry, bowlMaterial);
        bowl.position.set(3, 2.1, 4);
        bowl.castShadow = true;
        feederGroup.add(bowl);
        
        // Water fountain effect
        this.createWaterFountain(feederGroup, 3, 2.2, 4);
        
        this.scene.add(feederGroup);
    }

    createWaterFountain(parent, x, y, z) {
        // Simple particle system for water
        const particleCount = 50;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = x + (Math.random() - 0.5) * 0.2;
            positions[i + 1] = y + Math.random() * 2;
            positions[i + 2] = z + (Math.random() - 0.5) * 0.2;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x87CEEB,
            size: 0.05,
            transparent: true,
            opacity: 0.6
        });
        
        const particleSystem = new THREE.Points(particles, particleMaterial);
        parent.add(particleSystem);
        
        // Animate water particles
        const animateWater = () => {
            const positions = particleSystem.geometry.attributes.position.array;
            
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] -= 0.02; // Fall down
                
                if (positions[i] < y - 0.5) {
                    positions[i] = y + Math.random() * 2;
                }
            }
            
            particleSystem.geometry.attributes.position.needsUpdate = true;
        };
        
        this.waterAnimation = animateWater;
    }

    createRoad() {
        const roadGeometry = new THREE.PlaneGeometry(50, 4);
        const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0.02, 10);
        road.receiveShadow = true;
        this.scene.add(road);
        
        // Occasionally spawn vehicles
        this.spawnVehicles();
    }

    spawnVehicles() {
        const spawnVehicle = () => {
            if (Math.random() < 0.1) { // 10% chance
                const vehicleGeometry = new THREE.BoxGeometry(2, 0.8, 1);
                const vehicleMaterial = new THREE.MeshLambertMaterial({ 
                    color: Math.random() * 0xffffff 
                });
                const vehicle = new THREE.Mesh(vehicleGeometry, vehicleMaterial);
                vehicle.position.set(-25, 0.4, 10);
                vehicle.castShadow = true;
                this.scene.add(vehicle);
                
                // Animate vehicle movement
                const moveVehicle = () => {
                    vehicle.position.x += 0.3;
                    if (vehicle.position.x > 25) {
                        this.scene.remove(vehicle);
                        return;
                    }
                    requestAnimationFrame(moveVehicle);
                };
                moveVehicle();
            }
            
            setTimeout(spawnVehicle, 5000 + Math.random() * 10000);
        };
        
        setTimeout(spawnVehicle, 2000);
    }

    createSky() {
        // Skybox
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x87CEEB,
            side: THREE.BackSide 
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
        this.sky = sky;
        
        // Clouds
        this.createClouds();
        
        // Stars (initially invisible)
        this.createStars();
    }

    createClouds() {
        this.clouds = [];
        
        for (let i = 0; i < 10; i++) {
            const cloudGeometry = new THREE.SphereGeometry(2, 8, 8);
            const cloudMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            });
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            
            cloud.position.set(
                Math.random() * 100 - 50,
                10 + Math.random() * 20,
                Math.random() * 100 - 50
            );
            
            cloud.scale.set(
                1 + Math.random() * 2,
                0.5 + Math.random() * 0.5,
                1 + Math.random() * 2
            );
            
            this.scene.add(cloud);
            this.clouds.push(cloud);
        }
    }

    createStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 1000;
            positions[i + 1] = Math.random() * 500 + 100;
            positions[i + 2] = (Math.random() - 0.5) * 1000;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 2,
            transparent: true,
            opacity: 0
        });
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
    }

    createAvatar() {
        const avatarGroup = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB5 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        avatarGroup.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.25);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB5 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.8;
        head.castShadow = true;
        avatarGroup.add(head);
        
        // Hair
        const hairGeometry = new THREE.SphereGeometry(0.27);
        const hairColors = {
            brown: 0x8B4513,
            blonde: 0xFFE135,
            black: 0x000000,
            red: 0xB22222,
            gray: 0x808080
        };
        const hairMaterial = new THREE.MeshLambertMaterial({ color: hairColors.brown });
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 1.9;
        hair.scale.set(1, 0.8, 1);
        avatarGroup.add(hair);
        
        avatarGroup.position.set(0, 0, 5);
        this.scene.add(avatarGroup);
        this.avatar = { group: avatarGroup, hair: hair };
    }

    createAnimals() {
        this.animals = [];
        
        // Create squirrels
        for (let i = 0; i < 3; i++) {
            const squirrel = this.createSquirrel();
            this.animals.push(squirrel);
        }
        
        // Create birds
        for (let i = 0; i < 5; i++) {
            const bird = this.createBird();
            this.animals.push(bird);
        }
        
        // Create cats
        for (let i = 0; i < 2; i++) {
            const cat = this.createCat();
            this.animals.push(cat);
        }
    }

    createSquirrel() {
        const squirrelGroup = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.SphereGeometry(0.15);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        squirrelGroup.add(body);
        
        // Tail
        const tailGeometry = new THREE.SphereGeometry(0.12);
        const tailMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 0.1, -0.2);
        tail.scale.set(0.8, 0.8, 1.5);
        squirrelGroup.add(tail);
        
        squirrelGroup.position.set(
            Math.random() * 10 - 5,
            0.15,
            Math.random() * 10 - 5
        );
        
        this.scene.add(squirrelGroup);
        
        return {
            group: squirrelGroup,
            type: 'squirrel',
            behavior: this.animateSquirrel.bind(this, squirrelGroup)
        };
    }

    createBird() {
        const birdGroup = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.SphereGeometry(0.08);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: Math.random() > 0.5 ? 0x8B0000 : 0x4169E1 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        birdGroup.add(body);
        
        // Wings
        for (let i = 0; i < 2; i++) {
            const wingGeometry = new THREE.ConeGeometry(0.05, 0.15, 3);
            const wingMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const wing = new THREE.Mesh(wingGeometry, wingMaterial);
            wing.position.set((i - 0.5) * 0.15, 0, 0);
            wing.rotation.z = (i - 0.5) * Math.PI / 4;
            birdGroup.add(wing);
        }
        
        birdGroup.position.set(
            Math.random() * 15 - 7.5,
            2 + Math.random() * 3,
            Math.random() * 15 - 7.5
        );
        
        this.scene.add(birdGroup);
        
        return {
            group: birdGroup,
            type: 'bird',
            behavior: this.animateBird.bind(this, birdGroup)
        };
    }

    createCat() {
        const catGroup = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.9);
        const catColors = [0x000000, 0x8B4513, 0xFF4500, 0xD3D3D3];
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: catColors[Math.floor(Math.random() * catColors.length)] 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        body.position.y = 0.2;
        body.castShadow = true;
        catGroup.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.12);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0.4, 0.2, 0);
        head.castShadow = true;
        catGroup.add(head);
        
        // Tail
        const tailGeometry = new THREE.CylinderGeometry(0.03, 0.02, 0.8);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(-0.5, 0.3, 0);
        tail.rotation.z = Math.PI / 4;
        catGroup.add(tail);
        
        catGroup.position.set(
            Math.random() * 12 - 6,
            0,
            Math.random() * 12 - 6
        );
        
        this.scene.add(catGroup);
        
        return {
            group: catGroup,
            type: 'cat',
            behavior: this.animateCat.bind(this, catGroup)
        };
    }

    createWeatherSystems() {
        // Rain particle system
        this.createRainSystem();
        
        // Wind effects
        this.createWindEffects();
    }

    createRainSystem() {
        const particleCount = 1000;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 50;
            positions[i + 1] = Math.random() * 20 + 10;
            positions[i + 2] = (Math.random() - 0.5) * 50;
            
            velocities[i] = 0;
            velocities[i + 1] = -0.3 - Math.random() * 0.2;
            velocities[i + 2] = 0;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const rainMaterial = new THREE.PointsMaterial({
            color: 0x87CEEB,
            size: 0.1,
            transparent: true,
            opacity: this.rainIntensity
        });
        
        this.rainSystem = new THREE.Points(particles, rainMaterial);
        this.scene.add(this.rainSystem);
    }

    createWindEffects() {
        // Wind will affect trees, clouds, and other objects
        this.windForce = new THREE.Vector3(0, 0, 0);
    }

    setupControls() {
        // Time control
        const timeSlider = document.getElementById('time-slider');
        const timeDisplay = document.getElementById('time-display');
        
        timeSlider.addEventListener('input', (e) => {
            this.timeOfDay = parseFloat(e.target.value);
            this.updateTimeDisplay();
            this.updateLighting();
        });
        
        // Rain control
        const rainSlider = document.getElementById('rain-slider');
        rainSlider.addEventListener('input', (e) => {
            this.rainIntensity = parseFloat(e.target.value);
            this.updateRain();
        });
        
        // Wind control
        const windSlider = document.getElementById('wind-slider');
        windSlider.addEventListener('input', (e) => {
            this.windStrength = parseFloat(e.target.value);
            this.updateWind();
        });
        
        // Season button
        const seasonBtn = document.getElementById('season-btn');
        seasonBtn.addEventListener('click', () => {
            this.changeSeason();
        });
        
        // Random weather button
        const weatherRandomBtn = document.getElementById('weather-random');
        weatherRandomBtn.addEventListener('click', () => {
            this.randomizeWeather();
        });
        
        // Idle mode toggle
        const idleToggle = document.getElementById('idle-toggle');
        const modeStatus = document.getElementById('mode-status');
        
        idleToggle.addEventListener('click', () => {
            this.isIdleMode = !this.isIdleMode;
            idleToggle.textContent = this.isIdleMode ? 'Disable Idle Mode' : 'Enable Idle Mode';
            modeStatus.textContent = this.isIdleMode ? 'Idle Mode - Automatic interactions' : 'Active Mode - Click to interact';
            modeStatus.className = this.isIdleMode ? 'status idle' : 'status';
        });
        
        // Avatar customization
        this.setupAvatarControls();
        
        // Audio controls
        this.setupAudioControls();
        
        // Initial updates
        this.updateTimeDisplay();
        this.updateLighting();
        this.updateRain();
        this.updateWind();
    }

    setupAvatarControls() {
        const hairColorSelect = document.getElementById('hair-color');
        const bodyTypeSelect = document.getElementById('body-type');
        const clothingSelect = document.getElementById('clothing');
        
        const hairColors = {
            brown: 0x8B4513,
            blonde: 0xFFE135,
            black: 0x000000,
            red: 0xB22222,
            gray: 0x808080
        };
        
        hairColorSelect.addEventListener('change', (e) => {
            this.avatar.hair.material.color.setHex(hairColors[e.target.value]);
        });
        
        bodyTypeSelect.addEventListener('change', (e) => {
            const scale = e.target.value === 'slim' ? 0.8 : e.target.value === 'broad' ? 1.2 : 1;
            this.avatar.group.scale.set(scale, 1, scale);
        });
    }

    setupAudioControls() {
        if (!this.audioContext) return;
        
        const rainAudio = document.getElementById('rain-audio');
        const natureAudio = document.getElementById('nature-audio');
        const windAudio = document.getElementById('wind-audio');
        
        rainAudio.addEventListener('input', (e) => {
            this.audioNodes.rain.gain.value = parseFloat(e.target.value);
        });
        
        natureAudio.addEventListener('input', (e) => {
            this.audioNodes.nature.gain.value = parseFloat(e.target.value);
        });
        
        windAudio.addEventListener('input', (e) => {
            this.audioNodes.wind.gain.value = parseFloat(e.target.value);
        });
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Click interactions
        this.renderer.domElement.addEventListener('click', (event) => {
            this.handleClick(event);
        });
        
        // Instructions close button
        const closeInstructions = document.getElementById('close-instructions');
        closeInstructions.addEventListener('click', () => {
            document.getElementById('instructions').classList.add('hidden');
        });
        
        // Audio context resume (required for some browsers)
        document.addEventListener('click', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }, { once: true });
    }

    handleClick(event) {
        if (this.isIdleMode) return;
        
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        const interactableObjects = this.interactables.map(item => item.object);
        const intersects = raycaster.intersectObjects(interactableObjects);
        
        if (intersects.length > 0) {
            const clicked = intersects[0].object;
            const interactable = this.interactables.find(item => item.object === clicked);
            if (interactable) {
                interactable.action();
            }
        }
    }

    interactWithSwing(swingGroup) {
        // Animate swing motion
        let swingCount = 0;
        const maxSwings = 50;
        const swing = () => {
            if (swingCount < maxSwings) {
                swingGroup.rotation.z = Math.sin(Date.now() * 0.005) * 0.2;
                swingCount++;
                requestAnimationFrame(swing);
            }
        };
        swing();
        
        this.showStatusMessage('Enjoying the peaceful swing...');
    }

    interactWithChair(chairGroup) {
        // Animate rocking motion
        let rockCount = 0;
        const maxRocks = 50;
        const rock = () => {
            if (rockCount < maxRocks) {
                chairGroup.rotation.x = Math.sin(Date.now() * 0.006) * 0.1;
                rockCount++;
                requestAnimationFrame(rock);
            }
        };
        rock();
        
        this.showStatusMessage('Relaxing in the rocking chair...');
    }

    showStatusMessage(message) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'status-message';
        statusDiv.textContent = message;
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.remove();
        }, 3000);
    }

    updateTimeDisplay() {
        const hours = Math.floor(this.timeOfDay);
        const minutes = Math.floor((this.timeOfDay - hours) * 60);
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        document.getElementById('time-display').textContent = timeString;
    }

    updateLighting() {
        const isNight = this.timeOfDay < 6 || this.timeOfDay > 18;
        const isDawn = this.timeOfDay >= 6 && this.timeOfDay < 8;
        const isDusk = this.timeOfDay >= 18 && this.timeOfDay < 20;
        
        // Sun/Moon visibility
        this.lights.sun.visible = !isNight;
        this.lights.moon.visible = isNight;
        
        // Ambient light intensity
        let ambientIntensity = 0.6;
        if (isNight) ambientIntensity = 0.2;
        else if (isDawn || isDusk) ambientIntensity = 0.4;
        
        this.lights.ambient.intensity = ambientIntensity;
        
        // Sky color
        let skyColor = 0x87CEEB; // Day
        if (isNight) skyColor = 0x191970; // Night
        else if (isDawn || isDusk) skyColor = 0xFF6347; // Dawn/Dusk
        
        this.sky.material.color.setHex(skyColor);
        this.renderer.setClearColor(skyColor);
        
        // Stars visibility
        this.stars.material.opacity = isNight ? 0.8 : 0;
        
        // Fireflies
        this.lights.fireflies.forEach((light, index) => {
            light.visible = isNight;
            if (isNight) {
                light.position.set(
                    Math.sin(Date.now() * 0.001 + index) * 5,
                    1 + Math.sin(Date.now() * 0.002 + index) * 0.5,
                    Math.cos(Date.now() * 0.001 + index) * 5
                );
                light.intensity = 0.3 + Math.sin(Date.now() * 0.01 + index) * 0.2;
            }
        });
    }

    updateRain() {
        if (this.rainSystem) {
            this.rainSystem.material.opacity = this.rainIntensity;
            this.rainSystem.visible = this.rainIntensity > 0;
        }
        
        // Update rain audio
        if (this.audioNodes.rain) {
            this.audioNodes.rain.gain.value = this.rainIntensity * 0.6;
        }
    }

    updateWind() {
        this.windForce.set(this.windStrength, 0, 0);
        
        // Move clouds
        this.clouds.forEach(cloud => {
            cloud.position.x += this.windStrength * 0.01;
            if (cloud.position.x > 50) cloud.position.x = -50;
        });
        
        // Update wind audio
        if (this.sounds.wind) {
            this.sounds.wind.gainNode.gain.value = this.windStrength * 0.1;
        }
    }

    changeSeason() {
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const currentIndex = seasons.indexOf(this.season);
        this.season = seasons[(currentIndex + 1) % seasons.length];
        
        // Update season button text
        document.getElementById('season-btn').textContent = `Season: ${this.season.charAt(0).toUpperCase() + this.season.slice(1)}`;
        
        this.updateSeasonalEffects();
    }

    updateSeasonalEffects() {
        // This would update tree colors, weather patterns, etc.
        // For now, just show a message
        this.showStatusMessage(`Season changed to ${this.season}`);
    }

    randomizeWeather() {
        this.timeOfDay = Math.random() * 24;
        this.rainIntensity = Math.random();
        this.windStrength = Math.random();
        
        // Update UI controls
        document.getElementById('time-slider').value = this.timeOfDay;
        document.getElementById('rain-slider').value = this.rainIntensity;
        document.getElementById('wind-slider').value = this.windStrength;
        
        this.updateTimeDisplay();
        this.updateLighting();
        this.updateRain();
        this.updateWind();
        
        this.showStatusMessage('Weather randomized!');
    }

    // Animal behaviors
    animateSquirrel(squirrelGroup) {
        const time = Date.now() * 0.001;
        squirrelGroup.position.x += Math.sin(time) * 0.01;
        squirrelGroup.position.z += Math.cos(time) * 0.01;
        
        // Keep squirrel in bounds
        squirrelGroup.position.x = Math.max(-8, Math.min(8, squirrelGroup.position.x));
        squirrelGroup.position.z = Math.max(-8, Math.min(8, squirrelGroup.position.z));
    }

    animateBird(birdGroup) {
        const time = Date.now() * 0.002;
        birdGroup.position.x += Math.sin(time) * 0.02;
        birdGroup.position.y += Math.sin(time * 2) * 0.01;
        birdGroup.position.z += Math.cos(time) * 0.02;
        
        // Wing flapping
        birdGroup.children.forEach((child, index) => {
            if (index > 0) { // Wings
                child.rotation.z = Math.sin(time * 10) * 0.5;
            }
        });
        
        // Keep bird in bounds
        if (birdGroup.position.x > 10) birdGroup.position.x = -10;
        if (birdGroup.position.x < -10) birdGroup.position.x = 10;
        if (birdGroup.position.z > 10) birdGroup.position.z = -10;
        if (birdGroup.position.z < -10) birdGroup.position.z = 10;
    }

    animateCat(catGroup) {
        const time = Date.now() * 0.0005;
        
        // Slow, lazy movement
        if (Math.random() < 0.01) { // Change direction occasionally
            catGroup.userData.direction = Math.random() * Math.PI * 2;
        }
        
        if (catGroup.userData.direction !== undefined) {
            catGroup.position.x += Math.sin(catGroup.userData.direction) * 0.005;
            catGroup.position.z += Math.cos(catGroup.userData.direction) * 0.005;
            catGroup.rotation.y = catGroup.userData.direction;
        }
        
        // Keep cat in bounds and away from road
        catGroup.position.x = Math.max(-8, Math.min(8, catGroup.position.x));
        catGroup.position.z = Math.max(-8, Math.min(6, catGroup.position.z)); // Stay away from road
    }

    performIdleActions() {
        if (!this.isIdleMode) return;
        
        // Random interactions every few seconds
        if (Math.random() < 0.005) { // 0.5% chance per frame
            const actions = [
                () => this.randomizeWeather(),
                () => this.showStatusMessage('A gentle breeze flows through the garden...'),
                () => this.showStatusMessage('Birds are singing peacefully...'),
                () => this.showStatusMessage('The fountain gently bubbles...'),
                () => this.showStatusMessage('Squirrels playfully chase each other...'),
                () => this.showStatusMessage('Cats lazily stretch in the sun...')
            ];
            
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            randomAction();
        }
    }

    animate() {
        const delta = this.clock.getDelta();
        
        // Update controls
        this.controls.update();
        
        // Update rain particles
        if (this.rainSystem && this.rainIntensity > 0) {
            const positions = this.rainSystem.geometry.attributes.position.array;
            const velocities = this.rainSystem.geometry.attributes.velocity.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += velocities[i + 1];
                
                if (positions[i + 1] < 0) {
                    positions[i + 1] = 20;
                    positions[i] = (Math.random() - 0.5) * 50;
                    positions[i + 2] = (Math.random() - 0.5) * 50;
                }
            }
            
            this.rainSystem.geometry.attributes.position.needsUpdate = true;
        }
        
        // Animate water fountain
        if (this.waterAnimation) {
            this.waterAnimation();
        }
        
        // Update animal behaviors
        this.animals.forEach(animal => {
            if (animal.behavior) {
                animal.behavior();
            }
        });
        
        // Update lighting based on time
        this.updateLighting();
        
        // Perform idle actions
        this.performIdleActions();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    startRenderLoop() {
        const render = () => {
            this.animate();
            requestAnimationFrame(render);
        };
        render();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new MeditationGarden();
});