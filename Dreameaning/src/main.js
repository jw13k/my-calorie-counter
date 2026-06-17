import { Renderer } from './engine/Renderer.js';
import { Player } from './engine/Player.js';
import { GameWorld } from './engine/GameWorld.js';
import { DesktopManager } from './os/DesktopManager.js';
import { initApps } from './os/apps/AppRegistry.js';
import { RoomConfig } from './engine/RoomConfig.js';

initApps();

class Game {
    constructor() {
        this.renderer = new Renderer('game-canvas');
        this.player = new Player(RoomConfig.player.spawnX, RoomConfig.player.spawnY);
        this.world = new GameWorld(this.renderer, this.player);
        this.desktop = new DesktopManager();
        
        this.keys = {};
        this.lastTime = performance.now();
        
        // Zoom state
        this.zoomProgress = 0; // 0 to 1
        this.isZoomingIn = false;
        this.isZoomingOut = false;

        this.osOverlay = document.getElementById('os-environment');
        
        this.bindEvents();
        requestAnimationFrame((t) => this.loop(t));
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;

            // Interaction with Computer
            if ((e.key === 'e' || e.key === 'E') && window.canInteractWithComputer && !this.player.interacting) {
                this.startComputerInteraction();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Expose a global method to exit OS
        window.exitComputerInteraction = () => {
            this.exitComputerInteraction();
        };

        // Easter egg
        const easterEggEyes = document.getElementById('easter-egg-eyes');
        if (easterEggEyes) {
            easterEggEyes.addEventListener('click', () => {
                this.desktop.openApp('pong');
            });
        }
    }

    startComputerInteraction() {
        this.player.interacting = true;
        this.isZoomingIn = true;
        this.isZoomingOut = false;
        
        // Fade in OS UI near the end of zoom
        setTimeout(() => {
            this.osOverlay.classList.remove('os-hidden');
            this.osOverlay.classList.add('active');
        }, 800);
    }

    exitComputerInteraction() {
        this.osOverlay.classList.remove('active');
        setTimeout(() => {
            this.osOverlay.classList.add('os-hidden');
            this.isZoomingOut = true;
            this.isZoomingIn = false;
        }, 500); // wait for fade out
    }

    loop(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update();
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update() {
        if (!this.player.interacting) {
            this.player.update(this.keys, true);
        }
        this.world.update();

        if (this.isZoomingIn) {
            this.zoomProgress += 0.02;
            if (this.zoomProgress >= 1) {
                this.zoomProgress = 1;
                this.isZoomingIn = false;
            }
        }
        
        if (this.isZoomingOut) {
            this.zoomProgress -= 0.02;
            if (this.zoomProgress <= 0) {
                this.zoomProgress = 0;
                this.isZoomingOut = false;
                this.player.interacting = false;
            }
        }
    }

    draw() {
        this.renderer.clear();
        
        const ctx = this.renderer.ctx;
        ctx.save();
        
        // Apply Zoom Transform
        // We want to zoom into the computer desk which is at (0, 10) relative to current room center
        if (this.zoomProgress > 0) {
            // Easing function for smooth zoom
            const ease = 1 - Math.pow(1 - this.zoomProgress, 3);
            
            const cx = this.renderer.width / 2;
            const cy = this.renderer.height / 2 + 50;
            
            // The point we want to scale around and center is the desk (targetX, targetY)
            // But we already have camera translation in GameWorld. 
            // So we just scale from center, and translate extra to push desk to center.
            
            const scale = 1 + ease * 4; // Zoom in 5x
            const deskTargetX = 0; 
            const deskTargetY = 10;
            
            // We want the desk (0, 10) to move to screen center.
            // GameWorld translates screen center to (0,0) of room.
            const panX = -deskTargetX * ease;
            const panY = -deskTargetY * ease;

            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.translate(-cx + panX, -cy + panY);
        }

        this.world.draw();
        
        ctx.restore();
    }
}

// Start Game
window.onload = () => {
    new Game();
};
