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
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Game control state
        this.controlsEnabled = true;
        this.keys = {};
        
        // Physics constants
        this.gravity = 0.45;
        this.friction = 0.82;
        
        // Player state (Modularized Player class)
        this.player = new Player(400, 100);
        
        // Platforms definition
        this.platforms = [
            // Main Island (Center)
            { x: 200, y: 300, width: 400, height: 16, rx: 8 },
            // Left Platform
            { x: 50, y: 220, width: 100, height: 12, rx: 6 },
            // Right Platform
            { x: 650, y: 220, width: 100, height: 12, rx: 6 }
        ];
        
        // Interactive Objects
        this.objects = {
            chest: {
                x: 100,
                y: 220 - 24,
                width: 32,
                height: 24,
                label: '기억 상자',
                action: 'vault',
                color: 'var(--accent-magenta)',
                icon: 'archive'
            },
            oracle: {
                x: 400,
                y: 300 - 60, // Positioned slightly higher to fit the 4x larger size
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
                x: 700,
                y: 220 - 32,
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
        // Update Player instance physics, inputs, and boundaries
        this.player.update(
            this.keys,
            this.controlsEnabled,
            this.gravity,
            this.friction,
            this.width,
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
            // Respawn if falls off island
            this.player.x = 400;
            this.player.y = 100;
            this.player.vx = 0;
            this.player.vy = 0;
        }

        // Interactive Object Proximity Detection
        this.nearObject = null;
        const playerCenterX = this.player.x + this.player.width / 2;
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
        this.ctx.clearRect(0, 0, this.width, this.height);

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

        // 5. Draw Interaction Prompts
        if (this.nearObject && this.controlsEnabled) {
            this.ctx.save();
            const obj = this.nearObject;
            
            // Draw interactive bubble dynamically above the target object's top edge
            const bubbleY = obj.action === 'oracle' ? obj.y - obj.radius - 15 : obj.y - 18;
            const bubbleX = obj.action === 'oracle' ? obj.x : obj.x + obj.width / 2;
            
            // Glass Bubble border
            this.ctx.beginPath();
            this.ctx.roundRect(bubbleX - 42, bubbleY - 22, 84, 18, 4);
            this.ctx.fillStyle = 'rgba(11, 9, 20, 0.85)';
            this.ctx.fill();
            this.ctx.strokeStyle = obj.color;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            // Triangle pin
            this.ctx.beginPath();
            this.ctx.moveTo(bubbleX - 4, bubbleY - 4);
            this.ctx.lineTo(bubbleX + 4, bubbleY - 4);
            this.ctx.lineTo(bubbleX, bubbleY);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(11, 9, 20, 0.85)';
            this.ctx.fill();
            
            // Prompt Text
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 9px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('[E] ' + obj.label, bubbleX, bubbleY - 10);
            this.ctx.restore();
        }
    }

    animate(timestamp) {
        this.update(timestamp);
        this.draw();
        
        requestAnimationFrame((t) => this.animate(t));
    }
}
