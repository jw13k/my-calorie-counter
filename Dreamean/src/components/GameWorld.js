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

        // ==========================================================
        // [1] 게임 화면 크기 및 확대/축소 설정 (Zoom & Dimensions)
        // ==========================================================
        this.zoom = 0.5;               // 화면 줌 비율 (0.5로 설정 시 기존 화면의 0.5배 축소되어 맵이 넓어 보임)
        this.width = 800;              // 논리적 캔버스 가로 너비 (handleResize에서 브라우저 비율에 맞게 자동 갱신됨)
        this.height = 400;             // 논리적 캔버스 세로 높이 (handleResize에서 자동 계산됨)
        this.mapWidth = 1000;          // 게임 전체 맵의 실제 한계 범위 (가로 너비)
        this.camera = { x: 0, y: 0 };  // 플레이어 이동 시 따라다니는 스크롤용 카메라 좌표
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // 게임 컨트롤 입력 관리 변수
        this.controlsEnabled = true;
        this.keys = {};

        // ==========================================================
        // [2] 게임 내 물리 변수 설정 (중력 및 마찰력)
        // ==========================================================
        this.gravity = 0.4;           // 플레이어가 떨어지는 중력 가속도 (수치가 높을수록 묵직하고 빠르게 낙하)
        this.friction = 0.82;          // 바닥 미끄러짐 마찰력 (1에 가까울수록 멈추지 않고 미끄러지며, 낮을수록 즉각 정지)

        // ==========================================================
        // [3] 플레이어(Wizard 캐릭터) 스폰 위치 좌표 지정
        // ==========================================================
        // x: 플레이어의 가로 스폰 좌표, y: 세로 스폰 좌표
        this.player = new Player(150, 650);

        // ==========================================================
        // [4] 물리 충돌 지형 정의 (Line Segments 기반 지층 정의)
        // ==========================================================
        this.platforms = [
            { isGround: true, points: [] }, // 1번 (Floor)
            { isGround: false, points: [] }, // 2번 (Mid)
            { isGround: false, points: [] }  // 3번 (Peak)
        ];

        // ==========================================================
        // [5] 상호작용 가능한 오브젝트(비석, 수정구슬) 좌표 정의
        // ==========================================================
        this.objects = {
            tablet: {
                x: 250,
                y: 710, // 플레이어보다 약간 낮은 단차
                width: 30,
                height: 40,
                label: '고대의 비석',
                action: 'tablet',
                color: 'var(--accent-cyan)',
                icon: 'scroll'
            },
            oracle: {
                x: 550,
                y: 270, // 3번 층 꼭대기 (플레이어 기준 약 7명 높이)
                radius: 20,
                label: '해몽 수정구',
                action: 'oracle',
                color: 'var(--accent-cyan)',
                icon: 'sparkles',
                pulse: 1,
                pulseDir: 1,
                glowIntensity: 20
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
        this.generateLevel();
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleCanvasClick(e), { passive: true });

        window.addEventListener('keydown', (e) => {
            if (!this.controlsEnabled) return;

            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.code)) {
                e.preventDefault();
            }

            this.keys[e.code] = true;
            this.keys[e.key] = true;

            if (e.code === 'KeyE' && this.nearObject) {
                this.triggerInteraction(this.nearObject);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keys[e.key] = false;
        });

        this.animate(0);
    }

    generateOrganicPath(anchors, roughness) {
        let pts = [];
        for (let i = 0; i < anchors.length - 1; i++) {
            let p1 = anchors[i];
            let p2 = anchors[i + 1];
            let dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            let segments = Math.max(1, Math.floor(dist / 12)); // Higher detail smooth points

            if (i === 0) pts.push({ x: p1.x, y: p1.y });

            for (let j = 1; j <= segments; j++) {
                let t = j / segments;
                let px = p1.x + (p2.x - p1.x) * t;
                let py = p1.y + (p2.y - p1.y) * t;

                if (j === segments) {
                    pts.push({ x: p2.x, y: p2.y });
                } else {
                    // Smooth pseudo-Perlin noise using overlapping sine waves
                    let wave1 = Math.sin(px * 0.012) * 18; // Large rolling shapes
                    let wave2 = Math.sin(px * 0.045 + 10) * 8; // Medium bumps
                    let wave3 = Math.sin(px * 0.15 + 20) * 2.5; // Fine rock details

                    // Smoothly blend the noise out at the anchor points so segments connect seamlessly
                    let edgeBlend = Math.sin(t * Math.PI);

                    let totalNoise = (wave1 + wave2 + wave3) * (roughness / 18) * edgeBlend;

                    // Apply displacement only vertically to prevent backward x-coordinates
                    pts.push({
                        x: px,
                        y: py + totalNoise
                    });
                }
            }
        }
        return pts;
    }

    generateLevel() {
        this.mapWidth = 1500; // Fixed logical world width
        this.height = 400 / this.zoom; // 800

        const w = this.mapWidth;
        const h = this.height;
        const roughness = 18; // Increased for more natural look

        // 1. Layer 3 (Far Background Peak)
        let l3_anchors = [
            { x: w * 0.25, y: h },
            { x: w * 0.40, y: 350 },
            { x: w * 0.45, y: 280 }, // Peak
            { x: w * 0.55, y: 280 }, // Peak plateau
            { x: w * 0.60, y: 350 },
            { x: w * 0.75, y: h }
        ];
        this.L3_pts = this.generateOrganicPath(l3_anchors, roughness);

        // 2. Layer 2 (Mid Background Mountain Range)
        let l2_anchors = [
            { x: -100, y: h },
            { x: w * 0.1, y: 600 },
            { x: w * 0.2, y: 550 },
            { x: w * 0.35, y: 500 },
            { x: w * 0.5, y: 530 },
            { x: w * 0.65, y: 480 },
            { x: w * 0.8, y: 550 },
            { x: w * 0.9, y: 620 },
            { x: w + 100, y: h }
        ];
        this.L2_pts = this.generateOrganicPath(l2_anchors, roughness);

        // 3. Layer 1 (Foreground Floor)
        let l1_anchors = [
            { x: -100, y: 700 },
            { x: w * 0.1, y: 720 },
            { x: w * 0.3, y: 690 },
            { x: w * 0.5, y: 710 },
            { x: w * 0.7, y: 680 },
            { x: w * 0.9, y: 710 },
            { x: w + 100, y: 700 }
        ];
        this.L1_floor_pts = this.generateOrganicPath(l1_anchors, roughness);

        // Right Wall
        let rightWall_anchors = [
            { x: w + 100, y: 700 },
            { x: w - 50, y: 500 },
            { x: w - 80, y: 300 },
            { x: w - 120, y: 150 }
        ];
        this.rightWall_pts = this.generateOrganicPath(rightWall_anchors, roughness);

        // Ceiling
        let ceiling_anchors = [
            { x: w - 120, y: 150 },
            { x: w * 0.8, y: 100 },
            { x: w * 0.5, y: 130 },
            { x: w * 0.2, y: 90 },
            { x: -100, y: 120 }
        ];
        this.ceiling_pts = this.generateOrganicPath(ceiling_anchors, roughness);

        // 시각 - 물리 동기화
        this.platforms[0].points = this.L1_floor_pts;
        this.platforms[1].points = this.L2_pts;
        this.platforms[2].points = this.L3_pts;

        // 동적 위치 재계산
        if (this.player.y > h || this.player.x < 0) {
            this.player.x = w * 0.1;
            let floorPt = this.L1_floor_pts.find(p => p.x >= this.player.x) || this.L1_floor_pts[0];
            this.player.y = floorPt.y - this.player.height - 5;
            this.player.vx = 0;
            this.player.vy = 0;
        }

        this.objects.tablet.x = w * 0.15;
        let tabFloorPt = this.L1_floor_pts.find(p => p.x >= this.objects.tablet.x) || this.L1_floor_pts[0];
        this.objects.tablet.y = tabFloorPt.y - this.objects.tablet.height + 5;

        let highest = this.L3_pts[0];
        for (let pt of this.L3_pts) {
            if (pt.y < highest.y) highest = pt;
        }
        this.objects.oracle.x = highest.x;
        this.objects.oracle.y = highest.y - this.objects.oracle.radius - 20;

        // Visual arrays
        this.L3_full = [
            ...this.L3_pts,
            { x: this.L3_pts[this.L3_pts.length - 1].x, y: h + 100 },
            { x: this.L3_pts[0].x, y: h + 100 }
        ];
        this.L2_full = [
            ...this.L2_pts,
            { x: this.L2_pts[this.L2_pts.length - 1].x, y: h + 100 },
            { x: this.L2_pts[0].x, y: h + 100 }
        ];
        this.Layer0_full = [
            ...this.L1_floor_pts,
            ...this.rightWall_pts,
            ...this.ceiling_pts,
            { x: -100, y: -100 },
            { x: w + 150, y: -100 },
            { x: w + 150, y: h + 100 },
            { x: -100, y: h + 100 }
        ];
    }

    handleResize() {
        this.height = 400 / this.zoom; // 800
        this.width = (window.innerWidth / window.innerHeight) * this.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    handleCanvasClick(e) {
        if (!this.controlsEnabled) {
            if (this.callbacks.onClickBackground) this.callbacks.onClickBackground();
            return;
        }

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = this.canvas.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const clickY = clientY - rect.top;

        // Scale to logical dimensions
        const logicalX = clickX * (this.width / rect.width);
        const logicalY = clickY * (this.height / rect.height);

        // Translate to world space using camera offset (horizontal and vertical)
        const worldX = logicalX + this.camera.x;
        const worldY = logicalY + (this.camera.y || 0);

        let isAnyObjectClicked = false;

        // Check if any interactive object is clicked/tapped
        for (const key in this.objects) {
            const obj = this.objects[key];
            let isClicked = false;

            if (obj.action === 'oracle') {
                const dist = Math.hypot(obj.x - worldX, obj.y - worldY);
                if (dist < obj.radius + 60) {
                    isClicked = true;
                }
            } else {
                const padding = 50;
                if (worldX >= obj.x - padding &&
                    worldX <= obj.x + obj.width + padding &&
                    worldY >= obj.y - padding &&
                    worldY <= obj.y + obj.height + padding) {
                    isClicked = true;
                }
            }

            if (isClicked) {
                isAnyObjectClicked = true;
                this.triggerInteraction(obj);
                break;
            }
        }

        if (!isAnyObjectClicked && this.callbacks.onClickBackground) {
            this.callbacks.onClickBackground();
        }
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

        // Platform & Slope Collision (B방향 선분 경사면 물리 물리 처리)
        this.player.grounded = false;

        const isDownPressed = this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s'] || this.keys['S'];

        // 플레이어의 가로축 중심점을 기준으로 바닥 높이를 확인합니다.
        const px = this.player.x + this.player.width / 2;

        for (let plat of this.platforms) {
            // S키 입력 시 일방통행 플랫폼(isGround가 아닌 발판)은 통과 처리
            if (!plat.isGround && isDownPressed) {
                continue;
            }

            const pts = plat.points;
            // 플레이어가 속해 있는 X축 영역의 선분(Line segment)을 찾습니다.
            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i];
                const p2 = pts[i + 1];

                if (px >= p1.x && px <= p2.x) {
                    // 선분 기울기에 따라 비스듬한 높이(Y)를 선형 보간으로 구합니다.
                    const t = (px - p1.x) / (p2.x - p1.x);
                    const targetY = p1.y + t * (p2.y - p1.y);

                    // 플레이어 발밑의 높이(Y)에 근접해 오거나 충돌했을 때 착지 처리합니다.
                    if (this.player.y + this.player.height >= targetY &&
                        this.player.y + this.player.height - this.player.vy <= targetY + 8 &&
                        this.player.vy >= 0) {

                        this.player.y = targetY - this.player.height;
                        this.player.vy = 0;
                        this.player.grounded = true;
                    }
                    break; // 해당 플랫폼 내의 영역을 찾았으므로 더 이상의 선분 비교는 중지합니다.
                }
            }
        }

        // Ground/Border boundaries
        if (this.player.y > this.height + 50) {
            // 낭떠러지로 떨어졌을 때 리스폰
            this.player.x = 150;
            this.player.y = 650;
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

        // Check Tablet
        if (!this.nearObject) {
            const tabletX = this.objects.tablet.x + this.objects.tablet.width / 2;
            const tabletY = this.objects.tablet.y + this.objects.tablet.height / 2;
            const distTablet = Math.hypot(tabletX - playerCenterX, tabletY - playerCenterY);
            if (distTablet < 50) {
                this.nearObject = this.objects.tablet;
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

        // Update horizontal camera position to follow the player or center map
        if (this.width > this.mapWidth) {
            this.camera.x = (this.mapWidth - this.width) / 2;
        } else {
            this.camera.x = (this.player.x + this.player.width / 2) - (this.width / 2);
            const maxCameraX = Math.max(0, this.mapWidth - this.width);
            this.camera.x = Math.max(0, Math.min(this.camera.x, maxCameraX));
        }

        // Vertically slide camera
        if (this.camera.y === undefined) this.camera.y = 0;
        let targetCameraY = 0;

        if (this.callbacks.isDialogueActive && this.callbacks.isDialogueActive()) {
            targetCameraY += 60; // shift level upward by 60 logical pixels to make space for dialogue
        }
        this.camera.y += (targetCameraY - this.camera.y) * 0.1;

        // Fade out intro-section when player first moves
        if (Math.abs(this.player.vx) > 0.1 || this.player.vy !== 0) {
            const intro = document.querySelector('.intro-section');
            if (intro && !intro.classList.contains('fade-out')) {
                intro.classList.add('fade-out');
            }
        }
    }

    draw(timestamp = 0) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        const drawStrataSlab = (pts, fillStyle, strokeStyle, glowColor, glowBlur = 0) => {
            this.ctx.save();
            this.ctx.fillStyle = fillStyle;
            if (glowBlur > 0) {
                this.ctx.shadowColor = glowColor;
                this.ctx.shadowBlur = glowBlur;
            }
            this.ctx.beginPath();
            this.ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                this.ctx.lineTo(pts[i].x, pts[i].y);
            }
            this.ctx.closePath();
            this.ctx.fill();

            if (strokeStyle) {
                this.ctx.shadowBlur = 0; // Disable blur for solid stroke
                this.ctx.strokeStyle = strokeStyle;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            this.ctx.restore();
        };

        const mWidth = this.mapWidth;

        // Draw Starry Night Sky Background
        this.ctx.save();
        this.ctx.fillStyle = '#0a0a1a'; // Deep night blue
        this.ctx.fillRect(0, 0, mWidth, this.height);

        // Stars
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 30; i++) {
            let sx = (Math.sin(i * 123) * 0.5 + 0.5) * mWidth;
            let sy = (Math.cos(i * 321) * 0.5 + 0.5) * 200; // top half mostly
            this.ctx.globalAlpha = Math.sin(timestamp * 0.001 + i) * 0.5 + 0.5;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, Math.random() * 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();

        // Draw glowing surface highlight lines
        const drawSurfaceHighlight = (pts) => {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                this.ctx.lineTo(pts[i].x, pts[i].y);
            }
            this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.55)'; // glowing cyan line
            this.ctx.shadowColor = '#00f2fe';
            this.ctx.shadowBlur = 5;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            this.ctx.restore();
        };

        const fgStroke = '#181232'; // Organic dark divider line
        const glowColor = 'rgba(0, 242, 254, 0.4)';

        // --- DRAW FAR-BACKGROUND (Layer 3) ---
        const L3_grad = this.ctx.createLinearGradient(0, 200, 0, 800);
        L3_grad.addColorStop(0, '#1c123d');
        L3_grad.addColorStop(1, '#05030b');
        drawStrataSlab(this.L3_full, L3_grad, fgStroke, glowColor, 4);
        drawSurfaceHighlight(this.L3_pts);

        // --- DRAW MID-BACKGROUND (Layer 2) ---
        const L2_grad = this.ctx.createLinearGradient(0, 400, 0, 800);
        L2_grad.addColorStop(0, '#150d32');
        L2_grad.addColorStop(1, '#030208');
        drawStrataSlab(this.L2_full, L2_grad, fgStroke, glowColor, 4);
        drawSurfaceHighlight(this.L2_pts);

        // --- DRAW FOREGROUND (Layer 0: 1번 암석층 + 천장 + 우측 벽) ---
        const L1_grad = this.ctx.createLinearGradient(0, 100, 0, 800);
        L1_grad.addColorStop(0, '#0a0618');
        L1_grad.addColorStop(1, '#010003');
        drawStrataSlab(this.Layer0_full, L1_grad, fgStroke, glowColor, 4);

        // Highlights for Foreground
        drawSurfaceHighlight(this.L1_floor_pts);
        drawSurfaceHighlight(this.rightWall_pts);
        drawSurfaceHighlight(this.ceiling_pts);

        // Draw magical hanging vines / cyan moss on random edges
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 242, 254, 0.65)'; // cyan magical moss
        const drawMossNode = (x, y, size) => {
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        };
        // Add moss organically at some peaks
        const addMossToPath = (pts) => {
            for (let i = 5; i < pts.length - 5; i += 10) {
                if (Math.random() > 0.6 && pts[i].y < pts[i - 2].y && pts[i].y < pts[i + 2].y) {
                    drawMossNode(pts[i].x, pts[i].y + 3, Math.random() * 2 + 1.5);
                    drawMossNode(pts[i].x - 3, pts[i].y + 5, Math.random() * 1.5 + 1);
                }
            }
        };
        addMossToPath(this.L3_pts);
        addMossToPath(this.L2_pts);
        addMossToPath(this.ceiling_pts);
        this.ctx.restore();

        // Draw organic rock cracks & fissures inside the slabs
        this.ctx.save();
        this.ctx.strokeStyle = '#05030b'; // dark shadow cracks
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        // Layer 1 cracks
        this.ctx.moveTo(100, 720); this.ctx.lineTo(105, 745); this.ctx.lineTo(98, 770);
        // Layer 2 cracks
        this.ctx.moveTo(400, 540); this.ctx.lineTo(405, 555); this.ctx.lineTo(395, 570);
        this.ctx.moveTo(800, 540); this.ctx.lineTo(795, 555); this.ctx.lineTo(805, 570);
        // Layer 3 cracks
        this.ctx.moveTo(550, 340); this.ctx.lineTo(545, 355); this.ctx.lineTo(555, 370);
        this.ctx.stroke();
        this.ctx.restore();

        // Draw magical hanging vines / cyan moss on edges
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 242, 254, 0.65)'; // cyan magical moss
        // Moss at cliffs
        drawMossNode(300, 503, 2.5); drawMossNode(298, 506, 1.5); // L2 left
        drawMossNode(900, 503, 2.5); drawMossNode(902, 506, 1.5); // L2 right
        drawMossNode(500, 303, 2.5); drawMossNode(498, 306, 1.5); // L3 left
        drawMossNode(600, 303, 2.5); drawMossNode(602, 306, 1.5); // L3 right
        // Ceiling moss
        drawMossNode(100, 153, 3.0); drawMossNode(103, 158, 2.0); drawMossNode(97, 160, 1.5);
        drawMossNode(400, 153, 2.5); drawMossNode(398, 156, 1.5);
        this.ctx.restore();

        // 2. Draw Interactive Objects

        // [Object 1: Ancient Tablet (Tombstone)]
        const tablet = this.objects.tablet;
        this.ctx.save();

        // Scale by 0.6 from center of tablet
        this.ctx.translate(tablet.x + tablet.width / 2, tablet.y + tablet.height / 2);
        this.ctx.scale(0.6, 0.6);
        this.ctx.translate(-(tablet.x + tablet.width / 2), -(tablet.y + tablet.height / 2));

        // Draw stone tablet body (Arch shape)
        this.ctx.beginPath();
        this.ctx.moveTo(tablet.x, tablet.y + tablet.height);
        this.ctx.lineTo(tablet.x, tablet.y + 12);
        this.ctx.arcTo(tablet.x, tablet.y, tablet.x + tablet.width / 2, tablet.y, 12);
        this.ctx.arcTo(tablet.x + tablet.width, tablet.y, tablet.x + tablet.width, tablet.y + 12, 12);
        this.ctx.lineTo(tablet.x + tablet.width, tablet.y + tablet.height);
        this.ctx.closePath();

        // Dark stone gradient
        const stoneGrad = this.ctx.createLinearGradient(tablet.x, tablet.y, tablet.x, tablet.y + tablet.height);
        stoneGrad.addColorStop(0, 'rgba(40, 36, 58, 0.9)');
        stoneGrad.addColorStop(1, 'rgba(19, 16, 34, 0.95)');
        this.ctx.fillStyle = stoneGrad;
        this.ctx.fill();

        // Glow border
        this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.45)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // Draw ancient runic markings (glowing cyan horizontal dashes/marks)
        this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.85)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = '#00f2fe';
        this.ctx.lineWidth = 2;

        // Line 1
        this.ctx.beginPath();
        this.ctx.moveTo(tablet.x + 6, tablet.y + 16);
        this.ctx.lineTo(tablet.x + tablet.width - 6, tablet.y + 16);
        this.ctx.stroke();

        // Line 2 (dashed runic look)
        this.ctx.beginPath();
        this.ctx.moveTo(tablet.x + 8, tablet.y + 24);
        this.ctx.lineTo(tablet.x + 14, tablet.y + 24);
        this.ctx.moveTo(tablet.x + 18, tablet.y + 24);
        this.ctx.lineTo(tablet.x + tablet.width - 8, tablet.y + 24);
        this.ctx.stroke();

        // Line 3
        this.ctx.beginPath();
        this.ctx.moveTo(tablet.x + 6, tablet.y + 32);
        this.ctx.lineTo(tablet.x + tablet.width - 6, tablet.y + 32);
        this.ctx.stroke();

        this.ctx.restore();

        // [Object 3: Oracle (Crystal Ball)]
        const oracle = this.objects.oracle;
        this.ctx.save();

        // Glow effect
        this.ctx.shadowBlur = oracle.glowIntensity * oracle.pulse;
        this.ctx.shadowColor = this.oracleState === 'loading' ? '#e25bf5' : '#00f2fe';

        // Pedestal (Sitting on the terrain right under the oracle)
        const pedestalY = oracle.y + oracle.radius + 20;
        this.ctx.beginPath();
        this.ctx.moveTo(oracle.x - 14, pedestalY);
        this.ctx.lineTo(oracle.x + 14, pedestalY);
        this.ctx.lineTo(oracle.x + 8, pedestalY - 10);
        this.ctx.lineTo(oracle.x - 8, pedestalY - 10);
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.stroke();

        // Glass Sphere
        this.ctx.beginPath();
        this.ctx.arc(oracle.x, oracle.y, oracle.radius, 0, Math.PI * 2);

        // Radial Gradient proportional to oracle.radius
        const sphereGrad = this.ctx.createRadialGradient(
            oracle.x - (oracle.radius * 0.2), oracle.y - (oracle.radius * 0.3), oracle.radius * 0.05,
            oracle.x, oracle.y, oracle.radius
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

        this.ctx.restore(); // Restore camera translation context
    }

    animate(timestamp) {
        this.update(timestamp);
        this.draw(timestamp);

        requestAnimationFrame((t) => this.animate(t));
    }
}
