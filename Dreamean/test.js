const fs = require('fs');
const content = fs.readFileSync('./src/components/GameWorld.js', 'utf8');

// Mock browser APIs
global.window = {
    innerWidth: 1600,
    innerHeight: 900,
    addEventListener: () => {}
};
global.document = {
    getElementById: () => ({
        getContext: () => ({
            save: () => {}, restore: () => {}, translate: () => {},
            clearRect: () => {}, fillRect: () => {}, beginPath: () => {},
            moveTo: () => {}, lineTo: () => {}, fill: () => {},
            stroke: () => {}, closePath: () => {}, arc: () => {},
            addColorStop: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
            measureText: () => ({ width: 10 }), fillText: () => {}
        }),
        addEventListener: () => {}
    }),
    querySelector: () => ({ classList: { contains: () => false, add: () => {} } })
};

class Player {
    constructor(x, y) { this.x = x; this.y = y; this.width = 14.4; this.height = 22.8; this.vx = 0; this.vy = 0; }
    update() {}
}

const moduleStr = content.replace(/import \{ Player \} from '\.\/Player\.js';/, '').replace(/export class GameWorld/, 'class GameWorld');
eval(moduleStr);

try {
    const game = new GameWorld('canvasId', {});
    console.log("SUCCESS. Player:", game.player);
} catch (e) {
    console.log("CRASHED:", e.stack);
}
