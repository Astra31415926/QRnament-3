// --- 1. SPRITE LIBRARY & CONFIG ---
const SPRITE_LIB = [
  [0,0,1,0,0, 0,1,1,1,0, 1,1,1,1,1, 0,1,1,1,0, 0,0,1,0,0], [1,1,1,1,1, 1,0,0,0,1, 1,0,0,0,1, 1,0,0,0,1, 1,1,1,1,1],
  [0,0,1,0,0, 0,0,1,0,0, 1,1,1,1,1, 0,0,1,0,0, 0,0,1,0,0], [1,0,0,0,1, 0,1,0,1,0, 0,0,1,0,0, 0,1,0,1,0, 1,0,0,0,1],
  [1,1,1,1,1, 0,0,0,0,1, 1,1,1,0,1, 1,0,0,0,1, 1,1,1,1,1], [1,1,1,1,1, 1,0,1,0,1, 1,0,1,0,1, 1,0,1,0,1, 1,1,1,1,1],
  [1,1,1,1,1, 1,0,0,0,0, 1,1,1,1,1, 0,0,0,0,1, 1,1,1,1,1], [1,1,0,1,1, 1,1,0,1,1, 0,0,0,0,0, 1,1,0,1,1, 1,1,0,1,1],
  [1,1,1,1,1, 1,0,0,0,0, 1,0,1,1,1, 1,0,1,0,1, 1,0,1,1,1], [0,0,1,0,0, 0,1,1,1,0, 1,1,1,1,1, 0,0,0,0,0, 0,0,0,0,0],
  [1,0,1,0,1, 0,1,0,1,0, 1,0,1,0,1, 0,1,0,1,0, 1,0,1,0,1], [1,1,1,1,1, 0,0,0,0,0, 1,1,1,1,1, 0,0,0,0,0, 1,1,1,1,1],
  [0,1,1,1,0, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 0,1,1,1,0], [1,1,0,1,1, 1,1,0,1,1, 0,0,1,0,0, 1,1,0,1,1, 1,1,0,1,1],
  [1,1,1,1,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 1,1,1,1,1], [0,0,1,0,0, 0,1,0,1,0, 1,0,0,0,1, 0,1,0,1,0, 0,0,1,0,0],
  [1,1,1,0,0, 1,1,1,0,0, 1,1,1,0,0, 0,0,0,0,0, 0,0,0,0,0], [0,0,0,0,1, 0,0,0,1,0, 0,0,1,0,0, 0,1,0,0,0, 1,0,0,0,0],
  [1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0, 1,1,1,1,1], [1,1,1,1,1, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0]
];

// --- 2. APP MODULE ---
const App = {
    state: {
        lang: 'ua',
        frozen: false,
        isScanning: false
    },

    els: {},

    init() {
        this.els = {
            canvas: document.getElementById('canvas'),
            video: document.getElementById('video'),
            input: document.getElementById('main-input'),
            status: document.getElementById('status'),
            scanLine: document.getElementById('scan-line'),
            flash: document.getElementById('flash-layer'),
            menu: document.getElementById('menu-overlay'),
            fileInput: document.getElementById('file-input')
        };
        
        this.els.ctx = this.els.canvas.getContext('2d');
        
        // Event Listeners
        this.els.input.addEventListener('input', () => {
            if (this.state.frozen) this.state.frozen = false;
            this.generate();
        });
        
        this.els.fileInput.addEventListener('change', (e) => this.handleFile(e));
        
        this.clearCanvas();
        this.setLang('ua');
    },

    // --- DYNAMIC PATTERN GENERATION ---

    getTextSeed(text) {
        // Sum of char codes creates a dynamic integer seed
        let seed = 0;
        for (let i = 0; i < text.length; i++) {
            seed += text.charCodeAt(i);
        }
        return seed || 1; // Avoid 0
    },

    generate() {
        const text = this.els.input.value;
        if (!text) {
            this.clearCanvas();
            this.updateStatus("Waiting for input...");
            return;
        }

        try {
            const utf8Text = unescape(encodeURIComponent(text));
            const qr = qrcode(0, 'M');
            qr.addData(utf8Text);
            qr.make();
            
            const moduleCount = qr.getModuleCount();
            const quietZone = 2;
            const totalModules = moduleCount + quietZone * 2;
            const modSize = 1024 / totalModules;
            
            // 1. Calculate Base Seed
            const baseSeed = this.getTextSeed(text);

            // 2. Double Pass Generation (Golden Ratio Split)
            // Red uses baseSeed
            const gridR = this.buildFabricGrid(totalModules, baseSeed);
            
            // Green uses baseSeed * 1.618 (Golden Ratio) -> Mathematically different pattern
            const gridG = this.buildFabricGrid(totalModules, Math.floor(baseSeed * 1.618));
            
            // 3. Render
            const ctx = this.els.ctx;
            
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, 1024, 1024);
            
            ctx.globalCompositeOperation = "screen";

            // Draw Red
            ctx.fillStyle = "#FF0000";
            this.drawGrid(ctx, gridR, totalModules, modSize);
            
            // Draw Green
            ctx.fillStyle = "#00FF00";
            this.drawGrid(ctx, gridG, totalModules, modSize);

            // Draw Blue QR
            ctx.fillStyle = "#0000FF";
            for (let r = 0; r < moduleCount; r++) {
                for (let c = 0; c < moduleCount; c++) {
                    if (qr.isDark(r, c)) {
                        ctx.fillRect((c + quietZone) * modSize, (r + quietZone) * modSize, modSize, modSize);
                    }
                }
            }

            ctx.globalCompositeOperation = "source-over";
            this.updateStatus("Seed: " + baseSeed);

        } catch (e) {
            console.error(e);
            this.updateStatus("Error");
        }
    },

    buildFabricGrid(size, seed) {
        const grid = Array(size).fill(0).map(() => Array(size).fill(0));
        const center = Math.floor(size / 2);
        
        // Iterate Octant
        for (let y = 0; y <= center; y++) {
            for (let x = 0; x <= y; x++) {
                
                const tx = x + 2;
                const ty = y + 2;
                
                const tileX = Math.floor(tx / 5);
                const tileY = Math.floor(ty / 5);
                
                const localX = tx % 5;
                const localY = ty % 5;
                
                // Use Seed in hash calculation to shuffle sprites
                // XOR mixing for better distribution
                const hash = (tileX * 1337 + tileY * 7919) ^ seed; 
                const spriteIdx = Math.abs(hash) % SPRITE_LIB.length;
                
                const sprite = SPRITE_LIB[spriteIdx];
                const val = sprite[localY * 5 + localX];

                // 8-Fold Symmetry Mirroring
                const points = [
                    [x, y], [y, x], [-x, y], [-y, x],
                    [x, -y], [y, -x], [-x, -y], [-y, -x]
                ];

                points.forEach(([px, py]) => {
                    const gx = center + px;
                    const gy = center + py;
                    if (gx >= 0 && gx < size && gy >= 0 && gy < size) {
                        grid[gy][gx] = val;
                    }
                });
            }
        }
        return grid;
    },

    drawGrid(ctx, grid, size, cellSize) {
        for(let r=0; r<size; r++) {
            for(let c=0; c<size; c++) {
                if(grid[r][c]) {
                    ctx.fillRect(c*cellSize, r*cellSize, cellSize, cellSize);
                }
            }
        }
    },

    // --- SCANNER & RITUAL LOGIC ---

    startCamera() {
        if(this.state.isScanning) return;
        this.state.isScanning = true;
        this.updateStatus("Accessing Camera...");

        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(stream => {
                this.els.video.srcObject = stream;
                this.els.video.style.display = 'block';
                this.els.video.play();
                this.updateStatus("Scanning...");
                
                // Start Audio Atmosphere
                AudioEngine.startScanAtmosphere();
                
                this.scanLoop();
            })
            .catch(err => {
                alert("Camera Error: " + err.message);
                this.stopCamera();
            });
    },

    stopCamera() {
        this.state.isScanning = false;
        AudioEngine.stopAll();
        if(this.els.video.srcObject) {
            this.els.video.srcObject.getTracks().forEach(t => t.stop());
        }
        this.els.video.style.display = 'none';
        this.els.scanLine.style.display = 'none';
    },

    scanLoop() {
        if (!this.state.isScanning) return;
        
        const video = this.els.video;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const result = this.processFrame(video, video.videoWidth, video.videoHeight);
            
            if (result) {
                this.captureFrame(video, video.videoWidth, video.videoHeight);
                this.stopCamera();
                this.performRitual(result);
                return;
            }
        }
        requestAnimationFrame(() => this.scanLoop());
    },

    processFrame(source, w, h) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // CENTER CROP Implementation (Preserved)
        const aspect = w / h;
        let sx = 0, sy = 0, sw = w, sh = h;
        
        if (aspect > 1) {
            sw = h; sx = (w - sw) / 2;
        } else {
            sh = w; sy = (h - sh) / 2;
        }
        
        ctx.drawImage(source, sx, sy, sw, sh, 0, 0, 1024, 1024);
        
        const imageData = ctx.getImageData(0, 0, 1024, 1024);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const b = data[i+2];
            data[i] = b; data[i+1] = b; data[i+2] = b;
        }

        return jsQR(data, 1024, 1024, { inversionAttempts: "attemptBoth" });
    },

    captureFrame(source, w, h) {
        const ctx = this.els.ctx;
        const aspect = w / h;
        let sx = 0, sy = 0, sw = w, sh = h;
        if (aspect > 1) { sw = h; sx = (w - sw) / 2; } 
        else { sh = w; sy = (h - sh) / 2; }
        
        ctx.drawImage(source, sx, sy, sw, sh, 0, 0, 1024, 1024);
    },

    performRitual(code) {
        this.state.isScanning = true; 
        // Audio is already playing from startCamera, but we ensure it's on
        AudioEngine.startScanAtmosphere();

        // Animation with Pulse
        const line = this.els.scanLine;
        line.style.display = 'block';
        line.style.animation = 'pulse 1.5s infinite'; // Apply CSS pulse animation
        line.style.top = '0%';
        line.style.transition = 'none';
        void line.offsetHeight;
        line.style.transition = 'top 2.5s linear'; // Slower for effect
        line.style.top = '100%';
        this.updateStatus("Analyzing...");

        setTimeout(() => {
            this.els.flash.style.opacity = '1';
            AudioEngine.playSuccessClick();
            
            setTimeout(() => {
                this.els.flash.style.opacity = '0';
                line.style.animation = 'none'; // Stop pulse
                
                if (code) {
                    try {
                        this.els.input.value = decodeURIComponent(escape(code.data));
                    } catch(e) {
                        this.els.input.value = code.data;
                    }
                    
                    this.els.ctx.fillStyle = "rgba(0,0,0,0.7)";
                    this.els.ctx.fillRect(0, 0, 1024, 1024);
                    this.updateStatus("Decoded!");
                    this.state.frozen = true;
                } else {
                    this.updateStatus("No Data Found");
                    this.clearCanvas();
                }
                
                this.state.isScanning = false;
                line.style.display = 'none';
            }, 150);
        }, 2500);
    },

    handleFile(e) {
        const file = e.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                this.captureFrame(img, img.width, img.height);
                const result = this.processFrame(img, img.width, img.height);
                // Trigger ritual manually for file
                this.state.isScanning = true;
                AudioEngine.startScanAtmosphere();
                this.performRitual(result);
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    },

    // --- UTILS ---
    
    clearCanvas() {
        this.els.ctx.fillStyle = "#000"; 
        this.els.ctx.fillRect(0,0,1024,1024);
    },

    updateStatus(msg) {
        this.els.status.innerText = msg;
    },

    toggleMenu() {
        this.els.menu.classList.toggle('open');
    },

    setLang(lang) {
        this.state.lang = lang;
        document.getElementById('btn-lang-ua').classList.toggle('bg-white', lang === 'ua');
        document.getElementById('btn-lang-ua').classList.toggle('text-black', lang === 'ua');
        document.getElementById('btn-lang-en').classList.toggle('bg-white', lang === 'en');
        document.getElementById('btn-lang-en').classList.toggle('text-black', lang === 'en');
    },

    save() {
        const link = document.createElement('a');
        link.download = 'qrnament-v3.1.png';
        link.href = this.els.canvas.toDataURL();
        link.click();
    }
};

// --- AUDIO ENGINE MODULE (UPDATED) ---
const AudioEngine = {
    ctx: null,
    scanNodes: [],

    init() {
        if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    startScanAtmosphere() {
        this.init();
        this.stopAll(); // Clear previous

        // 1. Low Drone (40Hz)
        const drone = this.ctx.createOscillator();
        drone.type = 'sine';
        drone.frequency.value = 40;
        const droneGain = this.ctx.createGain();
        droneGain.gain.value = 0.15;
        drone.connect(droneGain);
        droneGain.connect(this.ctx.destination);
        drone.start();
        this.scanNodes.push(drone);

        // 2. Intermittent Signal (880Hz)
        const beep = this.ctx.createOscillator();
        beep.type = 'square';
        beep.frequency.value = 880;
        const beepGain = this.ctx.createGain();
        beepGain.gain.value = 0.05;
        beep.connect(beepGain);
        beepGain.connect(this.ctx.destination);
        beep.start();
        this.scanNodes.push(beep);

        // Intermittent logic (Tremolo simulation via Gain ramping)
        const toggleBeep = () => {
            if(!this.scanNodes.includes(beep)) return;
            const now = this.ctx.currentTime;
            beepGain.gain.setValueAtTime(beepGain.gain.value, now);
            beepGain.gain.linearRampToValueAtTime(beepGain.gain.value > 0.04 ? 0.001 : 0.08, now + 0.1);
        };
        
        this.beepInterval = setInterval(toggleBeep, 250);
    },

    stopAll() {
        if(this.beepInterval) clearInterval(this.beepInterval);
        this.scanNodes.forEach(node => {
            try { node.stop(); } catch(e) {}
        });
        this.scanNodes = [];
    },

    playSuccessClick() {
        this.init();
        this.stopAll();
        
        const now = this.ctx.currentTime;

        // 1. Metallic Click (Noise + Filter)
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000; // Metallic sound

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.0, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);

        // 2. Reverb/Delay Tail
        const delay = this.ctx.createDelay(1.0);
        delay.delayTime.value = 0.1;
        
        const feedback = this.ctx.createGain();
        feedback.gain.value = 0.4;

        const delayGain = this.ctx.createGain();
        delayGain.gain.value = 0.2;

        // Routing: Noise -> Delay -> Feedback -> Delay...
        // Actually for a click, we route the noise burst to delay
        noise.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(this.ctx.destination);

        // 3. Final Low Thud (Success confirm)
        const thud = this.ctx.createOscillator();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(150, now);
        thud.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        const thudGain = this.ctx.createGain();
        thudGain.gain.setValueAtTime(0.5, now);
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        thud.connect(thudGain);
        thudGain.connect(this.ctx.destination);
        thud.start(now);
        thud.stop(now + 0.3);
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => App.init());
