export class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    clear() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    setWeight(level) {
        const weights = { 1: 8, 2: 5, 3: 3, 4: 1.5 };
        this.ctx.lineWidth = weights[level] || 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#000000';
    }

    drawLine(x1, y1, x2, y2, lineWeightLevel = 3) {
        this.setWeight(lineWeightLevel);
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    drawJaggedLine(x1, y1, x2, y2, lineWeightLevel = 3) {
        this.setWeight(lineWeightLevel);
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        
        if (len < 5) {
            ctx.lineTo(x2, y2);
            ctx.stroke();
            return;
        }
        
        const segments = Math.floor(len / 15) + 2;
        const nx = -dy / len;
        const ny = dx / len;
        
        // Pseudo-random hash for animated jitter
        const timeOffset = Math.floor(Date.now() / 150); // ~6.6 FPS for hand-drawn look
        const hash = Math.abs(Math.sin(x1 * 12.9898 + y1 * 78.233 + timeOffset * 4.123) * 43758.5453);
        
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const px = x1 + dx * t;
            const py = y1 + dy * t;
            // Jitter amplitude
            const jitterAmp = 2.0; 
            const offset = (Math.sin(hash + i * 1.5) * 2 - 1) * jitterAmp; 
            ctx.lineTo(px + nx * offset, py + ny * offset);
        }
        
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}
