/**
 * Dreamean - Starry Background Particle Canvas Component
 */

export class StarryBackground {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.shootingStars = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetMouseX = 0;
        this.targetMouseY = 0;
        
        this.init();
    }

    init() {
        this.resize();
        this.createStars(120);
        
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    createStars(count) {
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 1.5 + 0.5,
                // Twinlking parameters
                alpha: Math.random(),
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinkleDir: Math.random() > 0.5 ? 1 : -1,
                // Subtle parallax factor
                depth: Math.random() * 0.5 + 0.1
            });
        }
    }

    handleMouseMove(e) {
        // Normalize coordinates from -0.5 to 0.5
        this.targetMouseX = (e.clientX / this.width) - 0.5;
        this.targetMouseY = (e.clientY / this.height) - 0.5;
    }

    createShootingStar() {
        const side = Math.random() > 0.5 ? 'top' : 'left';
        let x, y;
        
        if (side === 'top') {
            x = Math.random() * this.width * 0.7;
            y = 0;
        } else {
            x = 0;
            y = Math.random() * this.height * 0.5;
        }

        const angle = Math.PI / 6 + Math.random() * (Math.PI / 12); // ~30 degrees
        const speed = Math.random() * 8 + 6;

        this.shootingStars.push({
            x,
            y,
            length: Math.random() * 80 + 40,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            opacity: 1,
            fadeSpeed: Math.random() * 0.015 + 0.01
        });
    }

    animate() {
        // Smoothly interpolate mouse parallax offsets
        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

        // Clear canvas with a very transparent fill for slight trail effects on shooting stars
        this.ctx.fillStyle = 'rgba(5, 4, 9, 0.2)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Clear strictly when rendering stars so we don't build trails on static stars
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw regular stars
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            
            // Adjust alpha for twinkling
            star.alpha += star.twinkleSpeed * star.twinkleDir;
            if (star.alpha >= 1) {
                star.alpha = 1;
                star.twinkleDir = -1;
            } else if (star.alpha <= 0.1) {
                star.alpha = 0.1;
                star.twinkleDir = 1;
            }

            // Apply parallax offset based on depth and mouse position
            const offsetX = this.mouseX * 30 * star.depth;
            const offsetY = this.mouseY * 30 * star.depth;
            
            let drawX = star.x + offsetX;
            let drawY = star.y + offsetY;

            // Keep within bounds
            if (drawX < 0) drawX += this.width;
            if (drawX > this.width) drawX -= this.width;
            if (drawY < 0) drawY += this.height;
            if (drawY > this.height) drawY -= this.height;

            this.ctx.beginPath();
            this.ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            this.ctx.shadowBlur = star.size * 2;
            this.ctx.shadowColor = '#ffffff';
            this.ctx.fill();
        }

        // Remove shadow settings for speed
        this.ctx.shadowBlur = 0;

        // Trigger shooting star occasionally
        if (Math.random() < 0.003 && this.shootingStars.length < 2) {
            this.createShootingStar();
        }

        // Draw and update shooting stars
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const ss = this.shootingStars[i];
            
            this.ctx.beginPath();
            const grad = this.ctx.createLinearGradient(
                ss.x, ss.y, 
                ss.x - ss.dx * 3, ss.y - ss.dy * 3
            );
            grad.addColorStop(0, `rgba(0, 242, 254, ${ss.opacity})`);
            grad.addColorStop(0.3, `rgba(226, 91, 245, ${ss.opacity * 0.7})`);
            grad.addColorStop(1, 'rgba(121, 40, 202, 0)');
            
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 1.5;
            this.ctx.moveTo(ss.x, ss.y);
            this.ctx.lineTo(ss.x - ss.dx * 2, ss.y - ss.dy * 2);
            this.ctx.stroke();

            // Move
            ss.x += ss.dx;
            ss.y += ss.dy;
            ss.opacity -= ss.fadeSpeed;

            // Remove when faded or out of screen
            if (ss.opacity <= 0 || ss.x > this.width || ss.y > this.height) {
                this.shootingStars.splice(i, 1);
            }
        }

        requestAnimationFrame(() => this.animate());
    }
}
