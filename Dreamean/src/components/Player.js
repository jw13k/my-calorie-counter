/**
 * Dreamean - Player Character Component (Cute floating wizard)
 */
export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.scale = 0.6; // Scale character down by 40%
        this.width = 24 * this.scale;
        this.height = 38 * this.scale;
        this.speed = 3.5;
        this.jumpStrength = -9.5;
        this.grounded = false;
        this.direction = 'right'; // 'left' or 'right'
        this.bobOffset = 0;
        
        // Animation morph targets for procedural squash & stretch
        this.animW = 12;      // Base width
        this.animH = 22;      // Base height
        this.animTip = 0;     // Bottom tip extension (for tie shape)
        this.animSquash = 0;  // Vertical squash offset
        this.animLean = 0;    // Horizontal lean offset
        this.time = 0;
        
        this.wasGrounded = true;
        this.landTimer = 0;
    }

    /**
     * Update player physics and inputs
     */
    update(keys, controlsEnabled, gravity, friction, screenWidth, timestamp, onJump) {
        // Player bobbing animation
        this.bobOffset = Math.sin(timestamp * 0.006) * 1.5;

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
        this.time += 0.016; // Approx 60fps delta
        ctx.save();
        
        // Scale drawing from center of player's bounding box
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-(this.x + 24 / 2), -(this.y + 38 / 2));
        
        const drawX = this.x;
        const drawY = this.y;
        
        // Shadow beneath player
        ctx.beginPath();
        ctx.ellipse(drawX + 12, this.y + 38, 10 + (this.bobOffset / this.scale), 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(5, 4, 9, 0.45)';
        ctx.fill();

        // Landing detection
        if (this.grounded && !this.wasGrounded) {
            this.landTimer = 10; // Frames to hold squash
        }
        if (this.landTimer > 0) this.landTimer -= 1;
        this.wasGrounded = this.grounded;

        // Procedural Animation State Machine
        let t_w = 12;
        let t_h = 22;
        let t_tip = 0;
        let t_squash = 0;
        let t_lean = -this.vx * 1.5;

        if (!this.grounded) {
            if (this.vy < -0.5) {
                // Jump (Ascending): Tie shape (Stretched)
                t_w = 8;
                t_h = 16;
                t_tip = 12; // Point extends downwards
                t_squash = -4; // Stretch up
            } else if (this.vy > 0.5) {
                // Fall (Descending): Triangle shape (Flared)
                t_w = 14;
                t_h = 24;
                t_tip = 0; // Flat bottom
                t_squash = -1;
            } else {
                // Apex of jump
                t_w = 12;
                t_h = 22;
                t_tip = 4;
            }
        } else if (Math.abs(this.vx) > 0.1) {
            // Walk: Normal triangle with bobbing
            t_w = 12;
            t_h = 22;
            t_tip = 0;
            t_squash = Math.sin(this.time * 20) * 2;
        } else if (this.landTimer > 0) {
            // Landed (Impact): Squashed triangle
            t_w = 16;
            t_h = 18;
            t_tip = 0;
            t_squash = 5;
        } else {
            // Idle: Normal triangle (Middle of middle row)
            t_w = 12;
            t_h = 22;
            t_tip = 0;
            t_squash = Math.sin(this.time * 5) * 1;
        }

        // Smooth Lerp for buttery transitions
        this.animW += (t_w - this.animW) * 0.3;
        this.animH += (t_h - this.animH) * 0.3;
        this.animTip += (t_tip - this.animTip) * 0.3;
        this.animSquash += (t_squash - this.animSquash) * 0.3;
        this.animLean += (t_lean - this.animLean) * 0.3;

        const cx = drawX + 12;
        let cy = drawY + 10 + this.animSquash;
        const headRadius = 7;
        const neckY = cy + headRadius - 2; // slightly overlap head

        // Draw Cloak (Body) - matches the user's tie/triangle sketches
        ctx.beginPath();
        ctx.moveTo(cx, neckY); // Top (Neck)
        ctx.lineTo(cx + this.animW + this.animLean, neckY + this.animH); // Right Base
        if (this.animTip > 0.5) {
            ctx.lineTo(cx + this.animLean, neckY + this.animH + this.animTip); // Bottom Tip for jump
        }
        ctx.lineTo(cx - this.animW + this.animLean, neckY + this.animH); // Left Base
        ctx.closePath();
        
        ctx.fillStyle = 'rgba(121, 40, 202, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(226, 91, 245, 0.5)';
        ctx.lineWidth = 1;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw Head (Hood)
        ctx.beginPath();
        ctx.arc(cx, cy, headRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(19, 16, 34, 0.95)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(226, 91, 245, 0.6)';
        ctx.stroke();

        // Glowing Eyes
        ctx.beginPath();
        if (this.direction === 'right') {
            ctx.arc(cx + 3, cy, 2, 0, Math.PI * 2);
            ctx.arc(cx + 8, cy, 2, 0, Math.PI * 2);
        } else {
            ctx.arc(cx - 8, cy, 2, 0, Math.PI * 2);
            ctx.arc(cx - 3, cy, 2, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#00f2fe';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#00f2fe';
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
        
        // Lantern or light staff
        ctx.beginPath();
        const lanternX = this.direction === 'right' ? cx + 14 : cx - 14;
        const lanternY = cy + 10;
        ctx.arc(lanternX, lanternY, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 138, 0, 0.9)';
        ctx.fill();

        ctx.restore();
    }
}
