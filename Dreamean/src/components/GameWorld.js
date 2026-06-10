/**
 * Dreamean - 2D Canvas Game World & Physics Component
 */
import { Player } from './Player.js';

export class GameWorld {
    constructor(canvasId, callbacks = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.callbacks = callbacks;
        
        // Game dimensions
        this.width = 800;
        this.height = 400;
        this.canvas.width = this.width / 2;  // Physical buffer half-resolution for chunky pixel-art look
        this.canvas.height = this.height / 2;
        
        // Game control state
        this.controlsEnabled = true;
        this.keys = {};
        
        // Physics constants
        this.gravity = 0.45;
        this.friction = 0.82;
        
        // Player state (Modularized Player class, spawning at x=800, y=100)
        this.player = new Player(800, 100);
        
        // Platforms definition across a 1600px wide map
        this.platforms = [
            // Left Platform (Chest is here)
            { x: 50, y: 240, width: 200, height: 16, rx: 8 },
            // Stepping Platform Left
            { x: 320, y: 270, width: 100, height: 12, rx: 6 },
            // Main Center Island (Oracle is here)
            { x: 500, y: 300, width: 600, height: 16, rx: 10 },
            // Stepping Platform Right
            { x: 1180, y: 270, width: 100, height: 12, rx: 6 },
            // Right Platform (Mirror is here)
            { x: 1350, y: 240, width: 200, height: 16, rx: 8 }
        ];
        
        // Interactive Objects repositioned across the 1600px wide map
        this.objects = {
            chest: {
                x: 120,
                y: 240 - 24,
                width: 32,
                height: 24,
                label: '기억 상자',
                action: 'vault',
                color: 'var(--accent-magenta)',
                icon: 'archive'
            },
            oracle: {
                x: 800,
                y: 300 - 60, // Center of main platform (y=300)
                radius: 45,  // 4x larger size
                label: '해몽 수정구',
                action: 'oracle',
                color: 'var(--accent-cyan)',
                icon: 'sparkles',
                pulse: 1,
                pulseDir: 1,
                glowIntensity: 20
            },
            mirror: {
                x: 1450,
                y: 240 - 32,
                width: 24,
                height: 32,
                label: '영혼의 거울',
                action: 'settings',
                color: 'var(--accent-orange)',
                icon: 'key-round'
            }
        };
        
        // Visual effects state
        this.particles = [];
        this.oracleState = 'idle'; // 'idle', 'loading', 'success'
        this.oracleParticles = [];
        this.nearObject = null;
        
        // Cache the high-res HTML interaction prompt element
        this.promptEl = document.getElementById('game-interaction-prompt');
        
        // Camera and scrolling state
        this.mapWidth = 1600;
        this.camera = { x: 400, y: 0 }; // Initialize centered around player spawn
        
        this.init();
    }

    init() {
        // Keyboard listeners
        window.addEventListener('keydown', (e) => {
            if (!this.controlsEnabled) return;
            
            // Prevent scrolling on space / arrow keys
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.code)) {
                e.preventDefault();
            }
            
            this.keys[e.code] = true;
            this.keys[e.key] = true; // Support both format
            
            // Check interaction key press (E only)
            if (e.code === 'KeyE' && this.nearObject) {
                this.triggerInteraction(this.nearObject);
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keys[e.key] = false;
        });

        // Pointer down listener for mobile/mouse click interaction
        this.canvas.addEventListener('pointerdown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            
            // Get click coordinates relative to canvas bounding box
            const clickX = ((e.clientX - rect.left) / rect.width) * this.width;
            const clickY = ((e.clientY - rect.top) / rect.height) * this.height;
            
            // Translate to logical world coordinates (taking camera horizontal scroll into account)
            const worldClickX = clickX + this.camera.x;
            const worldClickY = clickY;
            
            // 1. Oracle (Crystal Ball) - radius: 45, check distance from center
            const oracle = this.objects.oracle;
            const distOracle = Math.hypot(oracle.x - worldClickX, oracle.y - worldClickY);
            if (distOracle < oracle.radius + 20) { // expanded hit radius for touch comfort
                this.triggerInteraction(oracle);
                return;
            }
            
            // 2. Chest - width: 32, height: 24
            const chest = this.objects.chest;
            if (worldClickX >= chest.x - 20 && worldClickX <= chest.x + chest.width + 20 &&
                worldClickY >= chest.y - 20 && worldClickY <= chest.y + chest.height + 20) {
                this.triggerInteraction(chest);
                return;
            }
            
            // 3. Mirror - width: 24, height: 32
            const mirror = this.objects.mirror;
            if (worldClickX >= mirror.x - 20 && worldClickX <= mirror.x + mirror.width + 20 &&
                worldClickY >= mirror.y - 20 && worldClickY <= mirror.y + mirror.height + 20) {
                this.triggerInteraction(mirror);
                return;
            }
        });

        // Cursor hover pointer change
        this.canvas.addEventListener('pointermove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * this.width;
            const clickY = ((e.clientY - rect.top) / rect.height) * this.height;
            const worldClickX = clickX + this.camera.x;
            const worldClickY = clickY;
            
            let hover = false;
            
            // Oracle
            const oracle = this.objects.oracle;
            if (Math.hypot(oracle.x - worldClickX, oracle.y - worldClickY) < oracle.radius + 15) {
                hover = true;
            }
            
            // Chest
            const chest = this.objects.chest;
            if (!hover && worldClickX >= chest.x - 15 && worldClickX <= chest.x + chest.width + 15 &&
                worldClickY >= chest.y - 15 && worldClickY <= chest.y + chest.height + 15) {
                hover = true;
            }
            
            // Mirror
            const mirror = this.objects.mirror;
            if (!hover && worldClickX >= mirror.x - 15 && worldClickX <= mirror.x + mirror.width + 15 &&
                worldClickY >= mirror.y - 15 && worldClickY <= mirror.y + mirror.height + 15) {
                hover = true;
            }
            
            this.canvas.style.cursor = hover ? 'pointer' : 'default';
        });

        
        // Run animation loop
        this.animate(0);
    }

    enableControls(enable) {
        this.controlsEnabled = enable;
        if (!enable) {
            // Reset keys so character stops instantly
            this.keys = {};
            this.player.vx = 0;
        }
    }

    setOracleState(state) {
        this.oracleState = state;
        if (state === 'loading') {
            this.objects.oracle.glowIntensity = 50;
        } else {
            this.objects.oracle.glowIntensity = 20;
        }
    }

    triggerInteraction(obj) {
        if (this.callbacks.onInteract) {
            this.callbacks.onInteract(obj.action);
        }
    }

    createOracleParticles() {
        // Particles converging or revolving around oracle
        if (this.oracleState === 'loading') {
            if (Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 80 + 30;
                this.oracleParticles.push({
                    x: this.objects.oracle.x + Math.cos(angle) * distance,
                    y: this.objects.oracle.y + Math.sin(angle) * distance,
                    targetX: this.objects.oracle.x,
                    targetY: this.objects.oracle.y,
                    size: Math.random() * 2.5 + 0.8,
                    speed: Math.random() * 0.05 + 0.02,
                    color: Math.random() > 0.5 ? 'cyan' : 'magenta',
                    life: 1.0
                });
            }
        }
    }

    updateOracleParticles() {
        for (let i = this.oracleParticles.length - 1; i >= 0; i--) {
            const p = this.oracleParticles[i];
            
            // Converge to center
            p.x += (p.targetX - p.x) * p.speed;
            p.y += (p.targetY - p.y) * p.speed;
            
            // Fade out near center
            const dist = Math.hypot(p.targetX - p.x, p.targetY - p.y);
            if (dist < 8) {
                p.life -= 0.1;
            }
            
            if (p.life <= 0) {
                this.oracleParticles.splice(i, 1);
            }
        }
    }

    createWalkParticles() {
        if (Math.abs(this.player.vx) > 0.5 && this.player.grounded) {
            if (Math.random() < 0.15) {
                this.particles.push({
                    x: this.player.x + this.player.width / 2,
                    y: this.player.y + this.player.height,
                    vx: (Math.random() - 0.5) * 1,
                    vy: -Math.random() * 0.8,
                    size: Math.random() * 3 + 1,
                    alpha: 0.8,
                    color: 'rgba(0, 242, 254, 0.4)'
                });
            }
        }
    }

    update(timestamp) {
        // Update Player instance physics, inputs, and boundaries (mapWidth 1600 passed instead of width 800)
        this.player.update(
            this.keys,
            this.controlsEnabled,
            this.gravity,
            this.friction,
            this.mapWidth,
            timestamp,
            () => {
                // Jump particle burst callback
                for (let i = 0; i < 8; i++) {
                    this.particles.push({
                        x: this.player.x + this.player.width / 2,
                        y: this.player.y + this.player.height,
                        vx: (Math.random() - 0.5) * 4,
                        vy: -Math.random() * 1.5,
                        size: Math.random() * 3 + 1,
                        alpha: 0.9,
                        color: 'rgba(226, 91, 245, 0.5)'
                    });
                }
            }
        );

        // Platform Collision
        this.player.grounded = false;
        
        for (let plat of this.platforms) {
            // Check vertical collision (falling onto platform)
            if (this.player.x + this.player.width > plat.x &&
                this.player.x < plat.x + plat.width &&
                this.player.y + this.player.height >= plat.y &&
                this.player.y + this.player.height - this.player.vy <= plat.y + 6 &&
                this.player.vy >= 0) {
                
                this.player.y = plat.y - this.player.height;
                this.player.vy = 0;
                this.player.grounded = true;
            }
        }

        // Ground/Border boundaries
        if (this.player.y > this.height) {
            // Respawn if falls off island (respawns near center island)
            this.player.x = 800;
            this.player.y = 100;
            this.player.vx = 0;
            this.player.vy = 0;
        }

        // Smooth camera follow (Lerp horizontal tracking centered on player)
        const playerCenterX = this.player.x + this.player.width / 2;
        const targetCamX = playerCenterX - this.width / 2;
        this.camera.x += (targetCamX - this.camera.x) * 0.08;
        
        // Clamp camera to map boundaries
        this.camera.x = Math.max(0, Math.min(this.mapWidth - this.width, this.camera.x));

        // Interactive Object Proximity Detection
        this.nearObject = null;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        // Check Oracle (crystal ball) - range expanded to 100 due to 4x size increase
        const distOracle = Math.hypot(this.objects.oracle.x - playerCenterX, this.objects.oracle.y - playerCenterY);
        if (distOracle < 100) {
            this.nearObject = this.objects.oracle;
        }
        
        // Check Chest
        if (!this.nearObject) {
            const chestX = this.objects.chest.x + this.objects.chest.width / 2;
            const chestY = this.objects.chest.y + this.objects.chest.height / 2;
            const distChest = Math.hypot(chestX - playerCenterX, chestY - playerCenterY);
            if (distChest < 45) {
                this.nearObject = this.objects.chest;
            }
        }
        
        // Check Mirror
        if (!this.nearObject) {
            const mirrorX = this.objects.mirror.x + this.objects.mirror.width / 2;
            const mirrorY = this.objects.mirror.y + this.objects.mirror.height / 2;
            const distMirror = Math.hypot(mirrorX - playerCenterX, mirrorY - playerCenterY);
            if (distMirror < 45) {
                this.nearObject = this.objects.mirror;
            }
        }

        // Pulse Oracle
        const oracle = this.objects.oracle;
        oracle.pulse += 0.02 * oracle.pulseDir;
        if (oracle.pulse > 1.15 || oracle.pulse < 0.95) {
            oracle.pulseDir *= -1;
        }

        // Particle updates
        this.createWalkParticles();
        this.createOracleParticles();
        this.updateOracleParticles();

        // Regular particle updates
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.025;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        this.ctx.save();
        this.ctx.scale(0.5, 0.5); // Scale logical 800x400 coordinates to physical 400x200 buffer
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.ctx.save();
        this.ctx.translate(-this.camera.x, 0); // Translate canvas context relative to camera horizontal scroll

        // 1. Draw Platforms
        this.platforms.forEach(plat => {
            this.ctx.save();
            
            // Draw glass platform
            this.ctx.beginPath();
            this.ctx.roundRect(plat.x, plat.y, plat.width, plat.height, plat.rx || 0);
            
            // Gradient fill (Frosted Glass)
            const grad = this.ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
            this.ctx.fillStyle = grad;
            this.ctx.fill();
            
            // Border glow
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            // Cyan/Magenta accent bottom glow line
            this.ctx.beginPath();
            this.ctx.moveTo(plat.x + 10, plat.y + plat.height);
            this.ctx.lineTo(plat.x + plat.width - 10, plat.y + plat.height);
            this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            this.ctx.restore();
        });

        // 2. Draw Interactive Objects
        
        // [Object 1: Chest]
        const chest = this.objects.chest;
        this.ctx.save();
        this.ctx.beginPath();
        // Chest box
        this.ctx.roundRect(chest.x, chest.y, chest.width, chest.height, 4);
        this.ctx.fillStyle = 'rgba(121, 40, 202, 0.45)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(226, 91, 245, 0.7)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        
        // Hinge
        this.ctx.beginPath();
        this.ctx.rect(chest.x + chest.width/2 - 4, chest.y + 4, 8, 4);
        this.ctx.fillStyle = 'rgba(0, 242, 254, 0.8)';
        this.ctx.fill();
        this.ctx.restore();

        // [Object 2: Mirror]
        const mirror = this.objects.mirror;
        this.ctx.save();
        this.ctx.beginPath();
        // Draw stand
        this.ctx.moveTo(mirror.x + mirror.width/2, mirror.y + mirror.height);
        this.ctx.lineTo(mirror.x + mirror.width/2, mirror.y + mirror.height + 4);
        this.ctx.strokeStyle = 'rgba(255, 138, 0, 0.6)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Mirror Glass
        this.ctx.beginPath();
        this.ctx.ellipse(mirror.x + mirror.width/2, mirror.y + mirror.height/2, mirror.width/2, mirror.height/2, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 138, 0, 0.2)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 138, 0, 0.8)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.restore();

        // [Object 3: Oracle (Crystal Ball)]
        const oracle = this.objects.oracle;
        this.ctx.save();
        
        // Glow effect
        this.ctx.shadowBlur = oracle.glowIntensity * oracle.pulse;
        this.ctx.shadowColor = this.oracleState === 'loading' ? '#e25bf5' : '#00f2fe';
        
        // Pedestal (Sitting on the platform at y = 300)
        this.ctx.beginPath();
        this.ctx.moveTo(oracle.x - 25, 300);
        this.ctx.lineTo(oracle.x + 25, 300);
        this.ctx.lineTo(oracle.x + 15, 280);
        this.ctx.lineTo(oracle.x - 15, 280);
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.stroke();
        
        // Glass Sphere
        this.ctx.beginPath();
        this.ctx.arc(oracle.x, oracle.y - 2, oracle.radius, 0, Math.PI * 2);
        
        // Radial Gradient Scaled for 4x Larger Radius
        const sphereGrad = this.ctx.createRadialGradient(
            oracle.x - (4 * 2.25), oracle.y - (6 * 2.25), 2 * 2.25,
            oracle.x, oracle.y - 2, oracle.radius
        );
        
        if (this.oracleState === 'loading') {
            sphereGrad.addColorStop(0, '#ffffff');
            sphereGrad.addColorStop(0.3, '#e25bf5');
            sphereGrad.addColorStop(1, '#7928ca');
        } else {
            sphereGrad.addColorStop(0, '#ffffff');
            sphereGrad.addColorStop(0.4, '#00f2fe');
            sphereGrad.addColorStop(1, 'rgba(121, 40, 202, 0.6)');
        }
        
        this.ctx.fillStyle = sphereGrad;
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        this.ctx.stroke();
        this.ctx.restore();

        // 3. Draw Particles
        
        // Walk/jump particles
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
            this.ctx.restore();
        });

        // Oracle Converging particles
        this.oracleParticles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color === 'cyan' ? '#00f2fe' : '#e25bf5';
            this.ctx.fill();
            this.ctx.restore();
        });

        // 4. Draw Player (Delegated to Player class)
        this.player.draw(this.ctx);

        this.ctx.restore(); // Restore camera translation
        this.ctx.restore(); // Restore downscale transformation

        // 5. Update HTML Interaction Prompt (Crisp & High-Res)
        if (this.promptEl) {
            if (this.nearObject && this.controlsEnabled) {
                const obj = this.nearObject;
                
                // Get the physical size of the canvas container
                const containerWidth = this.canvas.clientWidth;
                const containerHeight = this.canvas.clientHeight;
                
                // scale factor from logical coordinate space (800x400) to actual container size
                const scaleX = containerWidth / this.width;
                const scaleY = containerHeight / this.height;
                
                // Calculate position relative to camera Horizontal Scroll
                const bubbleX = obj.action === 'oracle' ? obj.x : obj.x + obj.width / 2;
                const bubbleY = obj.action === 'oracle' ? obj.y - obj.radius - 8 : obj.y - 12;
                
                const screenX = (bubbleX - this.camera.x) * scaleX;
                const screenY = bubbleY * scaleY;
                
                // Update content & styles
                this.promptEl.textContent = `[E] ${obj.label}`;
                this.promptEl.style.borderColor = obj.color;
                this.promptEl.style.left = `${screenX}px`;
                this.promptEl.style.top = `${screenY}px`;
                this.promptEl.style.display = 'block';
            } else {
                this.promptEl.style.display = 'none';
            }
        }
    }

    animate(timestamp) {
        this.update(timestamp);
        this.draw();
        
        requestAnimationFrame((t) => this.animate(t));
    }
}
