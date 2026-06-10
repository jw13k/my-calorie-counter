/**
 * Dreamean - Player Character Component (Cute floating wizard)
 */
export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 24;
        this.height = 38;
        this.speed = 3.5;
        this.jumpStrength = -9.5;
        this.grounded = false;
        this.direction = 'right'; // 'left' or 'right'
        this.bobOffset = 0;
    }

    /**
     * Update player physics and inputs
     */
    update(keys, controlsEnabled, gravity, friction, screenWidth, timestamp, onJump) {
        // Player bobbing animation
        this.bobOffset = Math.sin(timestamp * 0.006) * 2.5;

        if (controlsEnabled) {
            // Apply movement keys
            if (keys['ArrowLeft'] || keys['KeyA'] || keys['a']) {
                this.vx = -this.speed;
                this.direction = 'left';
            } else if (keys['ArrowRight'] || keys['KeyD'] || keys['d']) {
                this.vx = this.speed;
                this.direction = 'right';
            } else {
                this.vx *= friction;
            }

            // Jump
            if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space'] || keys['w']) && this.grounded) {
                this.vy = this.jumpStrength;
                this.grounded = false;
                if (onJump) {
                    onJump();
                }
            }
        } else {
            this.vx *= friction;
        }

        // Apply gravity
        this.vy += gravity;

        // Update positions
        this.x += this.vx;
        this.y += this.vy;

        // Keep character inside screen horizontally
        if (this.x < 0) {
            this.x = 0;
            this.vx = 0;
        } else if (this.x + this.width > screenWidth) {
            this.x = screenWidth - this.width;
            this.vx = 0;
        }
    }

    /**
     * Draw player on the 2D canvas context
     */
    draw(ctx) {
        ctx.save();
        const drawX = this.x;
        const drawY = this.y + this.bobOffset;
        
        // Shadow beneath player
        ctx.beginPath();
        ctx.ellipse(drawX + this.width / 2, this.y + this.height, 10 + this.bobOffset, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(5, 4, 9, 0.45)';
        ctx.fill();

        // Player Outer Cloak
        ctx.beginPath();
        ctx.roundRect(drawX, drawY + 8, this.width, this.height - 8, [10, 10, 2, 2]);
        ctx.fillStyle = 'rgba(121, 40, 202, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(226, 91, 245, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Cloak Hood
        ctx.beginPath();
        ctx.arc(drawX + this.width / 2, drawY + 12, 11, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(19, 16, 34, 0.95)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(226, 91, 245, 0.6)';
        ctx.stroke();
        
        // Glowing Eyes
        ctx.beginPath();
        if (this.direction === 'right') {
            ctx.arc(drawX + this.width / 2 + 3, drawY + 12, 2, 0, Math.PI * 2);
            ctx.arc(drawX + this.width / 2 + 8, drawY + 12, 2, 0, Math.PI * 2);
        } else {
            ctx.arc(drawX + this.width / 2 - 8, drawY + 12, 2, 0, Math.PI * 2);
            ctx.arc(drawX + this.width / 2 - 3, drawY + 12, 2, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#00f2fe';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#00f2fe';
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
        
        // Lantern or light staff
        ctx.beginPath();
        const lanternX = this.direction === 'right' ? drawX + this.width + 2 : drawX - 2;
        const lanternY = drawY + 20;
        ctx.arc(lanternX, lanternY, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 138, 0, 0.9)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff8a00';
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.restore();
    }
}
