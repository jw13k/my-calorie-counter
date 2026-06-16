import { RoomConfig } from './RoomConfig.js';

export class GameWorld {
    constructor(renderer, player) {
        this.renderer = renderer;
        this.player = player;
        this.R = RoomConfig.roomRadius; // Room radius from config
        this.W = this.R * Math.sqrt(3) / 2;

        this.transitioning = false;
        this.transitionDir = { x: 0, y: 0 };
        this.transitionProgress = 0;
    }

    update() {
        if (this.transitioning) {
            const dur = RoomConfig.camera.transitionDuration || 0.83;
            this.transitionProgress += 0.016 / dur; // 60fps 기준 1프레임당 진행률 (dt를 안 쓰므로 하드코딩된 초를 근사)
            
            if (this.transitionProgress >= 1) {
                this.transitioning = false;
                this.transitionProgress = 0;
            }
            return;
        } else if (!this.player.interacting) {
            this.handleWallCollisions();
            this.handleDeskCollision();
        }
    }

    draw() {
        const ctx = this.renderer.ctx;
        ctx.save();

        const cx = this.renderer.width / 2;
        const cy = this.renderer.height / 2 + 50;
        ctx.translate(cx, cy);

        let camX = 0;
        let camY = 0;

        if (this.transitioning) {
            // 적용할 easing 함수
            const p = this.transitionProgress;
            const easeType = RoomConfig.camera.easing || 'easeInOutCubic';
            let ease = p; // 기본 linear
            
            if (easeType === 'easeInOutCubic') {
                ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
            } else if (easeType === 'easeOutCubic') {
                ease = 1 - Math.pow(1 - p, 3);
            }
                
            // 정확한 방향으로 방이 슬라이드해 들어오도록 (-) 부호 적용 및 panMultiplier 스케일링
            const pan = RoomConfig.camera.panMultiplier || 1.0;
            camX = -this.transitionDir.x * pan * (1 - ease);
            camY = -this.transitionDir.y * pan * (1 - ease);
        }

        ctx.translate(-camX, -camY);
        // 전체적인 비율을 줄이기 위해 줌 아웃 적용
        ctx.scale(0.8, 0.8);

        // 메인 방 그리기
        this.drawRoom(0, 0);

        // 플레이어
        this.player.draw(this.renderer);

        ctx.restore();

        // HUD
        if (window.canInteractWithComputer && !this.player.interacting && !this.transitioning) {
            const text = '컴퓨터와 상호작용 (E)';
            ctx.font = 'bold 15px "Plus Jakarta Sans"';
            const textWidth = ctx.measureText(text).width;
            
            const textX = this.renderer.width / 2;
            const textY = this.renderer.height / 2 - 10;
            
            const boxW = textWidth + 20;
            const boxH = 28;
            const boxX = textX - boxW / 2;
            const boxY = textY - 19;
            
            // 1. 하얀 배경 박스
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(boxX, boxY, boxW, boxH);
            
            // 2. 검은 테두리
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, boxW, boxH);
            
            // 3. 텍스트
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.fillText(text, textX, textY);
        }
    }

    // 바닥 격자 좌표 (a,b,z)를 화면 픽셀 (x,y)로 변환
    toScreen(a, b, z = 0, rx = 0, ry = 0) {
        const fy = this.R / 2 - RoomConfig.floorCenterYOffset;
        return {
            x: rx - this.W * a + this.W * b,
            y: ry + RoomConfig.floorCenterYOffset + fy * a + fy * b - z
        };
    }

    // 좌표 (a,b)를 중심 (cA,cB) 기준으로 각도(angleDeg)만큼 회전
    rotatePoint(a, b, cA, cB, angleDeg) {
        const rad = (angleDeg * Math.PI) / 180;
        const da = a - cA;
        const db = b - cB;
        // 바닥 격자(a,b) 기반 회전 (투시도 상에서 정확하게 비틀림 유지)
        const rotA = da * Math.cos(rad) - db * Math.sin(rad);
        const rotB = da * Math.sin(rad) + db * Math.cos(rad);
        return { a: cA + rotA, b: cB + rotB };
    }

    // 화면 픽셀 (px,py)를 바닥 격자 좌표 (a,b)로 변환
    getFloorCoords(px, py, rx = 0, ry = 0) {
        const fy = this.R / 2 - RoomConfig.floorCenterYOffset;
        const sumAB = (py - ry - RoomConfig.floorCenterYOffset) / fy;
        const diffBA = (px - rx) / this.W;
        return {
            a: (sumAB - diffBA) / 2,
            b: (sumAB + diffBA) / 2
        };
    }

    drawRoom(rx, ry) {
        const ctx = this.renderer.ctx;

        const top = { x: rx, y: ry - this.R };
        const front = RoomConfig.frontBoundary || { bottomYOffset: 0, cutout: { width: 40, outX: 15, outY: 8 } };
        const bottom = { x: rx, y: ry + this.R + (front.bottomYOffset || 0) };
        const tl = { x: rx - this.W, y: ry - this.R / 2 };
        const tr = { x: rx + this.W, y: ry - this.R / 2 };
        const bl = { x: rx - this.W, y: ry + this.R / 2 };
        const br = { x: rx + this.W, y: ry + this.R / 2 };
        const center = { x: rx, y: ry };

        // 바닥 및 벽면 하얀색으로 채우기 (배경 가리기)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.lineTo(bottom.x, bottom.y);
        ctx.lineTo(br.x, br.y);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.lineTo(tl.x, tl.y);
        ctx.lineTo(top.x, top.y);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(top.x, top.y);
        ctx.fill();

        const wRoom = RoomConfig.lineWeights.room || 2;
        const wDoors = RoomConfig.lineWeights.doors || 3;

        // LEVEL 1: Outer Boundary
        this.renderer.drawLine(bl.x, bl.y, tl.x, tl.y, wRoom);
        this.renderer.drawLine(tl.x, tl.y, top.x, top.y, wRoom);
        this.renderer.drawLine(top.x, top.y, tr.x, tr.y, wRoom);
        this.renderer.drawLine(tr.x, tr.y, br.x, br.y, wRoom);

        // Door Cutouts (Outer frame cuts)
        const doorW = front.cutout.width || 40;
        const midBL = { x: (bl.x + bottom.x) / 2, y: (bl.y + bottom.y) / 2 };
        this.renderer.drawLine(bl.x, bl.y, midBL.x - doorW, midBL.y - doorW / 2, wRoom);
        this.renderer.drawLine(midBL.x + doorW, midBL.y + doorW / 2, bottom.x, bottom.y, wRoom);

        const midBR = { x: (br.x + bottom.x) / 2, y: (br.y + bottom.y) / 2 };
        this.renderer.drawLine(bottom.x, bottom.y, midBR.x - doorW, midBR.y + doorW / 2, wRoom);
        this.renderer.drawLine(midBR.x + doorW, midBR.y - doorW / 2, br.x, br.y, wRoom);

        // LEVEL 3: Door Cutout Steps
        const outX = front.cutout.outX || 15;
        const outY = front.cutout.outY || 8;

        // Left side step (outX needs to be negative on the left)
        const lOutX = -outX;
        this.renderer.drawLine(midBL.x - doorW, midBL.y - doorW / 2, midBL.x - doorW + lOutX, midBL.y - doorW / 2 + outY, wDoors);
        this.renderer.drawLine(midBL.x - doorW + lOutX, midBL.y - doorW / 2 + outY, midBL.x + doorW + lOutX, midBL.y + doorW / 2 + outY, wDoors);
        this.renderer.drawLine(midBL.x + doorW + lOutX, midBL.y + doorW / 2 + outY, midBL.x + doorW, midBL.y + doorW / 2, wDoors);

        // Right side step
        this.renderer.drawLine(midBR.x - doorW, midBR.y + doorW / 2, midBR.x - doorW + outX, midBR.y + doorW / 2 + outY, wDoors);
        this.renderer.drawLine(midBR.x - doorW + outX, midBR.y + doorW / 2 + outY, midBR.x + doorW + outX, midBR.y - doorW / 2 + outY, wDoors);
        this.renderer.drawLine(midBR.x + doorW + outX, midBR.y - doorW / 2 + outY, midBR.x + doorW, midBR.y - doorW / 2, wDoors);

        // LEVEL 2: Inner Structure
        const floorCenter = { x: center.x, y: center.y + RoomConfig.floorCenterYOffset };

        // 중앙 세로선을 바닥 중심점까지 끝까지 그림 (책상이 자연스럽게 가리도록 변경)
        this.renderer.drawLine(center.x, top.y, center.x, floorCenter.y, wRoom);

        // 각도를 눕혀 공간감을 확대한 바닥 선
        this.renderer.drawLine(floorCenter.x, floorCenter.y, bl.x, bl.y, wRoom);
        this.renderer.drawLine(floorCenter.x, floorCenter.y, br.x, br.y, wRoom);

        // LEVEL 3: Back Wall Doors (바닥 각도 및 설정에 따라 동적으로 그려짐)
        const backDoorW = RoomConfig.doors.width;
        const backDoorH = RoomConfig.doors.height;
        const doorY = RoomConfig.doors.yOffset;
        const prog = RoomConfig.doors.positionProgress;

        // Left Door (a = prog, b = 0)
        const len_fL = Math.hypot(-this.W, this.R / 2 - RoomConfig.floorCenterYOffset);
        const lRatio = (backDoorW / 2) / len_fL;

        const dL_b1 = this.toScreen(prog - lRatio, 0, 0, rx, ry); dL_b1.y += doorY;
        const dL_b2 = this.toScreen(prog + lRatio, 0, 0, rx, ry); dL_b2.y += doorY;
        const dL_t1 = { x: dL_b1.x, y: dL_b1.y - backDoorH };
        const dL_t2 = { x: dL_b2.x, y: dL_b2.y - backDoorH };

        this.renderer.drawLine(dL_b1.x, dL_b1.y, dL_t1.x, dL_t1.y, wDoors);
        this.renderer.drawLine(dL_b2.x, dL_b2.y, dL_t2.x, dL_t2.y, wDoors);
        this.renderer.drawLine(dL_t1.x, dL_t1.y, dL_t2.x, dL_t2.y, wDoors);

        // 커스텀 중심점 구조 그리기 헬퍼 함수
        const drawInnerStructure = (TL, TR, BL, BR, config) => {
            if (!config || !config.edgePoints) return;
            const cx = (TL.x + TR.x + BL.x + BR.x) / 4;
            const cy = (TL.y + TR.y + BL.y + BR.y) / 4;
            const C = { x: cx + (config.centerOffsetX || 0), y: cy + (config.centerOffsetY || 0) };

            if (config.edgePoints.top !== null && config.edgePoints.top !== undefined) {
                const r = config.edgePoints.top;
                const pt = { x: TL.x + (TR.x - TL.x) * r, y: TL.y + (TR.y - TL.y) * r };
                this.renderer.drawLine(C.x, C.y, pt.x, pt.y, wDoors);
            }
            if (config.edgePoints.bottom !== null && config.edgePoints.bottom !== undefined) {
                const r = config.edgePoints.bottom;
                const pt = { x: BL.x + (BR.x - BL.x) * r, y: BL.y + (BR.y - BL.y) * r };
                this.renderer.drawLine(C.x, C.y, pt.x, pt.y, wDoors);
            }
            if (config.edgePoints.left !== null && config.edgePoints.left !== undefined) {
                const r = config.edgePoints.left;
                const pt = { x: TL.x + (BL.x - TL.x) * r, y: TL.y + (BL.y - TL.y) * r };
                this.renderer.drawLine(C.x, C.y, pt.x, pt.y, wDoors);
            }
            if (config.edgePoints.right !== null && config.edgePoints.right !== undefined) {
                const r = config.edgePoints.right;
                const pt = { x: TR.x + (BR.x - TR.x) * r, y: TR.y + (BR.y - TR.y) * r };
                this.renderer.drawLine(C.x, C.y, pt.x, pt.y, wDoors);
            }
        };

        // Left Door Inner Structure (TL=dL_t2, TR=dL_t1, BL=dL_b2, BR=dL_b1)
        drawInnerStructure(dL_t2, dL_t1, dL_b2, dL_b1, RoomConfig.doors.leftInner);

        // Right Door (a = 0, b = prog)
        const len_fR = Math.hypot(this.W, this.R / 2 - RoomConfig.floorCenterYOffset);
        const rRatio = (backDoorW / 2) / len_fR;

        const dR_b1 = this.toScreen(0, prog - rRatio, 0, rx, ry); dR_b1.y += doorY;
        const dR_b2 = this.toScreen(0, prog + rRatio, 0, rx, ry); dR_b2.y += doorY;
        const dR_t1 = { x: dR_b1.x, y: dR_b1.y - backDoorH };
        const dR_t2 = { x: dR_b2.x, y: dR_b2.y - backDoorH };

        this.renderer.drawLine(dR_b1.x, dR_b1.y, dR_t1.x, dR_t1.y, wDoors);
        this.renderer.drawLine(dR_b2.x, dR_b2.y, dR_t2.x, dR_t2.y, wDoors);
        this.renderer.drawLine(dR_t1.x, dR_t1.y, dR_t2.x, dR_t2.y, wDoors);

        // Right Door Inner Structure (TL=dR_t1, TR=dR_t2, BL=dR_b1, BR=dR_b2)
        drawInnerStructure(dR_t1, dR_t2, dR_b1, dR_b2, RoomConfig.doors.rightInner);

        // LEVEL 4: Desk & Computer
        this.drawDesk(rx, ry);

        // LEVEL 5: Custom Elements (유저 커스텀 렌더링 루프)
        if (RoomConfig.customElements && RoomConfig.customElements.length > 0) {
            for (const el of RoomConfig.customElements) {
                const w = el.weight || 2;
                if (el.type === 'line') {
                    const p1 = this.toScreen(el.start.a, el.start.b, el.start.z || 0, rx, ry);
                    const p2 = this.toScreen(el.end.a, el.end.b, el.end.z || 0, rx, ry);
                    this.renderer.drawLine(p1.x, p1.y, p2.x, p2.y, w);
                } else if (el.type === 'polygon' && el.points && el.points.length > 0) {
                    ctx.fillStyle = el.fill || '#ffffff';
                    ctx.beginPath();
                    const first = this.toScreen(el.points[0].a, el.points[0].b, el.points[0].z || 0, rx, ry);
                    ctx.moveTo(first.x, first.y);
                    for (let i = 1; i < el.points.length; i++) {
                        const pt = this.toScreen(el.points[i].a, el.points[i].b, el.points[i].z || 0, rx, ry);
                        ctx.lineTo(pt.x, pt.y);
                    }
                    ctx.closePath();
                    if (el.fill) ctx.fill();

                    // Draw outlines
                    for (let i = 0; i < el.points.length; i++) {
                        const nextI = (i + 1) % el.points.length;
                        const p1 = this.toScreen(el.points[i].a, el.points[i].b, el.points[i].z || 0, rx, ry);
                        const p2 = this.toScreen(el.points[nextI].a, el.points[nextI].b, el.points[nextI].z || 0, rx, ry);
                        this.renderer.drawLine(p1.x, p1.y, p2.x, p2.y, w);
                    }
                }
            }
        }
    }

    drawDesk(rx, ry) {
        const { posA, posB, sizeA, sizeB, height } = RoomConfig.desk;
        const wDesk = RoomConfig.lineWeights.desk || 4;

        // 4 corners of the desk on the floor grid
        const bT = this.toScreen(posA - sizeA / 2, posB - sizeB / 2, 0, rx, ry);
        const bL = this.toScreen(posA + sizeA / 2, posB - sizeB / 2, 0, rx, ry);
        const bR = this.toScreen(posA - sizeA / 2, posB + sizeB / 2, 0, rx, ry);
        const bB = this.toScreen(posA + sizeA / 2, posB + sizeB / 2, 0, rx, ry);

        // Extrude up
        const tT = { x: bT.x, y: bT.y - height };
        const tL = { x: bL.x, y: bL.y - height };
        const tR = { x: bR.x, y: bR.y - height };
        const tB = { x: bB.x, y: bB.y - height };

        const ctx = this.renderer.ctx;
        ctx.fillStyle = '#ffffff';

        // Draw Left Visible Panel
        ctx.beginPath();
        ctx.moveTo(tL.x, tL.y);
        ctx.lineTo(tB.x, tB.y);
        ctx.lineTo(bB.x, bB.y);
        ctx.lineTo(bL.x, bL.y);
        ctx.closePath();
        ctx.fill();

        // Draw Right Visible Panel
        ctx.beginPath();
        ctx.moveTo(tR.x, tR.y);
        ctx.lineTo(tB.x, tB.y);
        ctx.lineTo(bB.x, bB.y);
        ctx.lineTo(bR.x, bR.y);
        ctx.closePath();
        ctx.fill();

        // Draw Desktop filled with white
        ctx.beginPath();
        ctx.moveTo(tT.x, tT.y);
        ctx.lineTo(tL.x, tL.y);
        ctx.lineTo(tB.x, tB.y);
        ctx.lineTo(tR.x, tR.y);
        ctx.closePath();
        ctx.fill();

        // Draw outlines
        this.renderer.drawLine(bL.x, bL.y, bB.x, bB.y, wDesk);
        this.renderer.drawLine(bR.x, bR.y, bB.x, bB.y, wDesk);
        this.renderer.drawLine(bL.x, bL.y, tL.x, tL.y, wDesk);
        this.renderer.drawLine(bR.x, bR.y, tR.x, tR.y, wDesk);
        this.renderer.drawLine(bB.x, bB.y, tB.x, tB.y, wDesk);

        // Draw desktop outline
        this.renderer.drawLine(tT.x, tT.y, tL.x, tL.y, wDesk);
        this.renderer.drawLine(tL.x, tL.y, tB.x, tB.y, wDesk);
        this.renderer.drawLine(tB.x, tB.y, tR.x, tR.y, wDesk);
        this.renderer.drawLine(tR.x, tR.y, tT.x, tT.y, wDesk);

        // ----------------------------------------------------
        // Draw Computer Monitor & Keyboard (3D Perspective)
        // ----------------------------------------------------
        const comp = RoomConfig.computer;
        if (comp) {
            // 컴퓨터 중심 (책상 중심 기준 상대 위치)
            const cA = posA + comp.offsetA;
            const cB = posB + comp.offsetB;

            // 회전 적용 헬퍼
            const getCompPoint = (offA, offB, z) => {
                const pt = this.rotatePoint(cA + offA, cB + offB, cA, cB, comp.angle);
                return this.toScreen(pt.a, pt.b, height + z, rx, ry);
            };

            // 1. Keyboard
            const kbA = comp.keyboard.offsetA;
            const kbB = comp.keyboard.offsetB;
            const kw = comp.keyboard.width / 2;
            const kd = comp.keyboard.depth / 2;

            const kb1 = getCompPoint(kbA - kd, kbB - kw, 0);
            const kb2 = getCompPoint(kbA - kd, kbB + kw, 0);
            const kb3 = getCompPoint(kbA + kd, kbB + kw, 0);
            const kb4 = getCompPoint(kbA + kd, kbB - kw, 0);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(kb1.x, kb1.y); ctx.lineTo(kb2.x, kb2.y);
            ctx.lineTo(kb3.x, kb3.y); ctx.lineTo(kb4.x, kb4.y);
            ctx.closePath(); ctx.fill();

            this.renderer.drawLine(kb1.x, kb1.y, kb2.x, kb2.y, wDesk);
            this.renderer.drawLine(kb2.x, kb2.y, kb3.x, kb3.y, wDesk);
            this.renderer.drawLine(kb3.x, kb3.y, kb4.x, kb4.y, wDesk);
            this.renderer.drawLine(kb4.x, kb4.y, kb1.x, kb1.y, wDesk);

            // 2. Monitor Stand
            const standBase = getCompPoint(0, 0, 0);
            const standTop = getCompPoint(0, 0, comp.monitor.standHeight);
            this.renderer.drawLine(standBase.x, standBase.y, standTop.x, standTop.y, wDesk);

            // 3. Monitor Screen (수직 평행사변형)
            const mw = comp.monitor.width / 2;
            const mh = comp.monitor.height;

            const mb1 = getCompPoint(0, -mw, comp.monitor.standHeight);
            const mb2 = getCompPoint(0, mw, comp.monitor.standHeight);
            const mt1 = getCompPoint(0, -mw, comp.monitor.standHeight + mh);
            const mt2 = getCompPoint(0, mw, comp.monitor.standHeight + mh);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(mt1.x, mt1.y); ctx.lineTo(mt2.x, mt2.y);
            ctx.lineTo(mb2.x, mb2.y); ctx.lineTo(mb1.x, mb1.y);
            ctx.closePath(); ctx.fill();

            this.renderer.drawLine(mt1.x, mt1.y, mt2.x, mt2.y, wDesk);
            this.renderer.drawLine(mt2.x, mt2.y, mb2.x, mb2.y, wDesk);
            this.renderer.drawLine(mb2.x, mb2.y, mb1.x, mb1.y, wDesk);
            this.renderer.drawLine(mb1.x, mb1.y, mt1.x, mt1.y, wDesk);
        }
    }

    handleWallCollisions() {
        // Player's coordinates on the floor grid (a, b)
        const { a, b } = this.getFloorCoords(this.player.x, this.player.y);

        // Keep player inside the room bounds
        if (a < 0 || a > 1 || b < 0 || b > 1) {
            const clampedA = Math.max(0, Math.min(1, a));
            const clampedB = Math.max(0, Math.min(1, b));

            const doorSize = RoomConfig.doors.triggerSize || 0.2;
            const prog = RoomConfig.doors.positionProgress;
            let dirX = 0, dirY = 0;
            let jumpedA = a, jumpedB = b;

            // Check if player walked through a door
            if (a < 0 && Math.abs(b - prog) < doorSize) {
                dirX = -this.W; dirY = -this.R / 2; // 좌상단
                jumpedA = 1;
            } else if (b < 0 && Math.abs(a - prog) < doorSize) {
                dirX = this.W; dirY = -this.R / 2;  // 우상단
                jumpedB = 1;
            } else if (a > 1 && Math.abs(b - prog) < doorSize) {
                dirX = this.W; dirY = this.R / 2;   // 우하단
                jumpedA = 0;
            } else if (b > 1 && Math.abs(a - prog) < doorSize) {
                dirX = -this.W; dirY = this.R / 2;  // 좌하단
                jumpedB = 0;
            }

            // Trigger transition if went through door
            if (dirX !== 0 || dirY !== 0) {
                this.transitioning = true;
                this.transitionProgress = 0;
                this.transitionDir = { x: dirX, y: dirY };

                const fixed = this.toScreen(jumpedA, jumpedB);
                const spawnOffset = RoomConfig.player.spawnOffsetAfterDoor || 10;
                this.player.x = fixed.x - (dirX / Math.hypot(dirX, dirY)) * spawnOffset;
                this.player.y = fixed.y - (dirY / Math.hypot(dirX, dirY)) * spawnOffset;
            } else {
                // Otherwise wall block
                const fixed = this.toScreen(clampedA, clampedB);
                this.player.x = fixed.x;
                this.player.y = fixed.y;
            }
        }
    }

    handleDeskCollision() {
        // Player's coordinates on the floor grid
        const { a, b } = this.getFloorCoords(this.player.x, this.player.y);
        const { posA, posB, sizeA, sizeB, interactionPadding } = RoomConfig.desk;

        const minA = posA - sizeA / 2;
        const maxA = posA + sizeA / 2;
        const minB = posB - sizeB / 2;
        const maxB = posB + sizeB / 2;

        // Physical Block (prevent walking through desk)
        if (a > minA && a < maxA && b > minB && b < maxB) {
            this.player.x -= this.player.vx;
            this.player.y -= this.player.vy;
        }

        // Interaction Area (around the desk)
        const pad = interactionPadding || 0.05;
        if (a > minA - pad && a < maxA + pad && b > minB - pad && b < maxB + pad) {
            window.canInteractWithComputer = true;
        } else {
            window.canInteractWithComputer = false;
        }
    }
}
