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
        isScanning: false,
        audioCtx: null,
        noiseSource: null
    },

    els: {},

    init() {
        // Cache DOM elements
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
        
        // Initial Draw
        this.clearCanvas();
        this.setLang('ua');
    },

    // --- GENERATION LOGIC ---

    generate() {
        const text = this.els.input.value;
        if (!text) {
            this.clearCanvas();
            this.updateStatus("Input text...");
            return;
        }

        try {
            // 1. Prepare QR Data
            const utf8Text = unescape(encodeURIComponent(text));
            const qr = qrcode(0, 'M');
            qr.addData(utf8Text);
            qr.make();
            
            const moduleCount = qr.getModuleCount();
            const quietZone = 2;
            const totalModules = moduleCount + quietZone * 2;
            const modSize = 1024 / totalModules;
            
            // 2. Double Pass Generation
            // Pass 1: Red Channel (Variant 0)
            const gridR = this.buildFabricGrid(totalModules, 0);
            
            // Pass 2: Green Channel (Variant 1 - different pattern)
            const gridG = this.buildFabricGrid(totalModules, 1);
            
            // 3. Render
            const ctx = this.els.ctx;
            
            // Background
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, 1024, 1024);
            
            // Additive Blending for Colors
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
            this.updateStatus("Generated " + moduleCount + "x" + moduleCount);

        } catch (e) {
            console.error(e);
            this.updateStatus("Error");
        }
    },

    buildFabricGrid(size, variantSeed) {
        const grid = Array(size).fill(0).map(() => Array(size).fill(0));
        const center = Math.floor(size / 2);
        
        // Iterate only over the Octant (1/8th of the square)
        for (let y = 0; y <= center; y++) {
            for (let x = 0; x <= y; x++) {
                
                // Tile Coordinates (5x5 sprites)
                const tx = x + 2; // Shift to align center
                const ty = y + 2;
                
                const tileX = Math.floor(tx / 5);
                const tileY = Math.floor(ty / 5);
                
                const localX = tx % 5;
                const localY = ty % 5;
                
                // Deterministic random selection based on position and variant
                // Using a simple hash: TileX + TileY + Variant
                const hash = (tileX * 1337 + tileY * 7919 + variantSeed * 13); 
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

    // --- SCANNER LOGIC ---

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
                AudioEngine.start();
                this.scanLoop();
            })
            .catch(err => {
                alert("Camera Error: " + err.message);
                this.stopCamera();
            });
    },

    stopCamera() {
        this.state.isScanning = false;
        AudioEngine.stop();
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
            // Process Frame
            const result = this.processFrame(video, video.videoWidth, video.videoHeight);
            
            if (result) {
                this.captureFrame(video, video.videoWidth, video.videoHeight); // Freeze frame
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
        
        // CENTER CROP Implementation
        const aspect = w / h;
        let sx = 0, sy = 0, sw = w, sh = h;
        
        if (aspect > 1) {
            // Landscape: crop sides
            sw = h;
            sx = (w - sw) / 2;
        } else {
            // Portrait: crop top/bottom
            sh = w;
            sy = (h - sh) / 2;
        }
        
        // Draw cropped image to 1024x1024
        ctx.drawImage(source, sx, sy, sw, sh, 0, 0, 1024, 1024);
        
        const imageData = ctx.getImageData(0, 0, 1024, 1024);
        const data = imageData.data;

        // Blue Channel Isolation
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
        this.state.isScanning = true; // Lock
        AudioEngine.start();

        // Animation
        const line = this.els.scanLine;
        line.style.display = 'block';
        line.style.top = '0%';
        line.style.transition = 'none';
        void line.offsetHeight; // Reflow
        line.style.transition = 'top 2s linear';
        line.style.top = '100%';
        this.updateStatus("Extracting...");

        setTimeout(() => {
            this.els.flash.style.opacity = '1';
            AudioEngine.success();
            
            setTimeout(() => {
                this.els.flash.style.opacity = '0';
                
                if (code) {
                    try {
                        this.els.input.value = decodeURIComponent(escape(code.data));
                    } catch(e) {
                        this.els.input.value = code.data;
                    }
                    
                    // Frozen State
                    this.els.ctx.fillStyle = "rgba(0,0,0,0.7)";
                    this.els.ctx.fillRect(0, 0, 1024, 1024);
                    this.updateStatus("Decoded!");
                    this.state.frozen = true;
                } else {
                    AudioEngine.success(); 
                    this.updateStatus("No Data Found");
                    this.clearCanvas();
                }
                
                this.state.isScanning = false;
                line.style.display = 'none';
            }, 150);
        }, 2000);
    },

    handleFile(e) {
        const file = e.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                // Show image
                this.captureFrame(img, img.width, img.height);
                const result = this.processFrame(img, img.width, img.height);
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
        link.download = 'qrnament-v3.png';
        link.href = this.els.canvas.toDataURL();
        link.click();
    }
};

// --- AUDIO ENGINE MODULE ---
const AudioEngine = {
    ctx: null,
    source: null,

    init() {
        if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    start() {
        this.init();
        if(this.source) return;
        
        // Noise Buffer
        const bufferSize = 2 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 0.5;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.15;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();

        this.source = noise;
    },

    stop() {
        if(this.source) {
            try { this.source.stop(); } catch(e) {}
            this.source = null;
        }
    },

    success() {
        this.init();
        this.stop();
        const now = this.ctx.currentTime;
        // Click
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1500;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => App.init());