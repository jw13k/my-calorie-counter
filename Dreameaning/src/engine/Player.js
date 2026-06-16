export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.tx = 0;
        this.ty = 0;
        this.speed = 4;
        this.interacting = false;
        this.walkCycle = 0;
    }

    update(keys, canMove) {
        if (!canMove) return;

        this.tx = 0;
        this.ty = 0;
        
        if (keys['w'] || keys['ArrowUp']) this.ty -= 1;
        if (keys['s'] || keys['ArrowDown']) this.ty += 1;
        if (keys['a'] || keys['ArrowLeft']) this.tx -= 1;
        if (keys['d'] || keys['ArrowRight']) this.tx += 1;

        const len = Math.hypot(this.tx, this.ty);
        if (len > 0) {
            this.tx = (this.tx / len) * this.speed;
            this.ty = (this.ty / len) * this.speed;
            this.walkCycle += 0.2;
        } else {
            this.walkCycle = 0;
        }

        this.vx += (this.tx - this.vx) * 0.2;
        this.vy += (this.ty - this.vy) * 0.2;

        this.x += this.vx;
        this.y += this.vy;
    }

    draw(renderer) {
        const px = this.x;
        const py = this.y + Math.abs(Math.sin(this.walkCycle)) * 4;
        
        renderer.setWeight(3);
        const ctx = renderer.ctx;
        ctx.strokeStyle = '#000000';
        
        ctx.beginPath();
        ctx.arc(px, py - 30, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        renderer.drawJaggedLine(px - 4, py - 22, px - 12, py + 5, 3);
        renderer.drawJaggedLine(px + 4, py - 22, px + 12, py + 5, 3);
        renderer.drawJaggedLine(px - 12, py + 5, px + 12, py + 5, 3);
    }
}
