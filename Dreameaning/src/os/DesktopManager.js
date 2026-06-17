export class DesktopManager {
    constructor() {
        this.container = document.getElementById('os-window-container');
        this.btnStart = document.getElementById('btn-start-menu');
        this.startMenu = document.getElementById('start-menu');
        this.btnShutdown = document.getElementById('btn-shutdown');
        this.trayTime = document.getElementById('tray-time');
        this.taskbarApps = document.getElementById('taskbar-apps');
        
        this.windows = [];
        this.zIndexCounter = 100;
        
        window.desktopManager = this;
        
        this.bindEvents();
        this.startClock();
    }

    bindEvents() {
        this.btnStart.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startMenu.classList.toggle('hidden');
            this.btnStart.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            this.startMenu.classList.add('hidden');
            this.btnStart.classList.remove('active');
        });

        this.startMenu.addEventListener('click', (e) => {
            e.stopPropagation(); // Keep menu open if clicking inside empty area
            const item = e.target.closest('.menu-item');
            if (item) {
                if (item.id === 'btn-shutdown') {
                    if (window.exitComputerInteraction) window.exitComputerInteraction();
                } else if (item.dataset.app) {
                    this.openApp(item.dataset.app);
                }
                this.startMenu.classList.add('hidden');
                this.btnStart.classList.remove('active');
            }
        });

        // 브라우저 크기 변경 시 창들이 컨테이너 밖으로 나가지 않도록 묶어두기
        window.addEventListener('resize', () => {
            const maxX = this.container.offsetWidth;
            const maxY = this.container.offsetHeight;
            this.windows.forEach(w => {
                if (w.state === 'maximized') return;
                const el = w.el;
                let curLeft = el.offsetLeft;
                let curTop = el.offsetTop;
                let curW = el.offsetWidth;
                let curH = el.offsetHeight;
                
                if (curLeft + curW > maxX) el.style.left = Math.max(0, maxX - curW) + 'px';
                if (curTop + curH > maxY) el.style.top = Math.max(0, maxY - curH) + 'px';
                if (curLeft < 0) el.style.left = '0px';
                if (curTop < 0) el.style.top = '0px';
            });
        });
    }

    startClock() {
        setInterval(() => {
            const now = new Date();
            let hours = now.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; 
            const minutes = now.getMinutes().toString().padStart(2, '0');
            this.trayTime.innerText = `${hours}:${minutes} ${ampm}`;
        }, 1000);
    }

    openApp(appId) {
        if (this.windows.find(w => w.id === appId)) {
            this.focusWindow(appId);
            return;
        }
        
        let title = 'App';
        let content = '';
        let icon = 'app-window';
        if (appId === 'dream') { title = '꿈 기록 (Dream Input)'; content = '<div id="app-dream"></div>'; icon = 'cloud'; }
        if (appId === 'archive') { title = '보관소 (Archive)'; content = '<div id="app-archive"></div>'; icon = 'folder-open'; }
        if (appId === 'settings') { title = '설정 (Settings)'; content = '<div id="app-settings"></div>'; icon = 'settings'; }
        if (appId === 'pong') { title = 'Ping Pong (Easter Egg)'; content = '<div id="app-pong" style="width:100%; height:100%; display:flex; flex-direction:column; overflow:hidden; background:#000;"></div>'; icon = 'gamepad-2'; }

        this.createWindow(appId, title, content, icon);
        
        window.dispatchEvent(new CustomEvent('os-app-opened', { detail: { appId } }));
    }

    createWindow(id, title, innerHTML, icon) {
        const win = document.createElement('div');
        win.className = 'os-window';
        win.id = `win-${id}`;
        
        // 정중앙을 기준으로 살짝씩 우측 하단으로 겹치도록 계산
        const offset = this.windows.length * 30;
        win.style.width = '600px';
        win.style.height = '450px';
        win.style.left = `calc(50% - 300px + ${offset}px)`;
        win.style.top = `calc(50% - 225px + ${offset}px)`;
        win.style.zIndex = this.zIndexCounter++;

        win.innerHTML = `
            <div class="window-header">
                <div class="window-title"><i data-lucide="${icon}" style="width: 14px; height: 14px; margin-right: 5px;"></i>${title}</div>
                <div class="window-controls">
                    <button class="win-btn win-min">-</button>
                    <button class="win-btn win-max">□</button>
                    <button class="win-btn win-close">&times;</button>
                </div>
            </div>
            <div class="window-content" id="content-${id}">
                ${innerHTML}
            </div>
            <div class="resize-handle"></div>
        `;

        this.container.appendChild(win);
        this.windows.push({ id, el: win, state: 'normal', title, icon });
        lucide.createIcons({ root: win });

        const header = win.querySelector('.window-header');
        this.makeDraggable(win, header);
        this.makeResizable(win, win.querySelector('.resize-handle'));

        win.querySelector('.win-min').addEventListener('click', (e) => {
            e.stopPropagation();
            this.minimizeWindow(id);
        });

        win.querySelector('.win-max').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMaximize(id);
        });

        header.addEventListener('dblclick', () => {
            this.toggleMaximize(id);
        });

        win.querySelector('.win-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeWindow(id);
        });

        win.addEventListener('mousedown', () => {
            if (this.windows.find(w => w.id === id).state !== 'minimized') {
                this.focusWindow(id);
            }
        });

        this.updateTaskbar();
    }

    closeWindow(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (winObj) {
            this.container.removeChild(winObj.el);
            this.windows = this.windows.filter(w => w.id !== id);
            window.dispatchEvent(new CustomEvent('os-app-closed', { detail: { appId: id } }));
            this.updateTaskbar();
        }
    }

    minimizeWindow(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (winObj) {
            winObj.state = 'minimized';
            winObj.el.style.display = 'none';
            this.updateTaskbar();
        }
    }

    restoreWindow(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (winObj) {
            if (winObj.state === 'minimized') {
                winObj.state = winObj.el.classList.contains('maximized') ? 'maximized' : 'normal';
                winObj.el.style.display = 'flex';
            }
            this.focusWindow(id);
            this.updateTaskbar();
        }
    }

    toggleMaximize(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (winObj) {
            if (winObj.state === 'maximized') {
                winObj.state = 'normal';
                winObj.el.classList.remove('maximized');
            } else {
                winObj.state = 'maximized';
                winObj.el.classList.add('maximized');
            }
            this.updateTaskbar();
        }
    }

    focusWindow(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (winObj && winObj.state !== 'minimized') {
            winObj.el.style.zIndex = this.zIndexCounter++;
            this.updateTaskbar();
        }
    }

    makeDraggable(el, handle) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        handle.addEventListener('mousedown', (e) => {
            if (el.classList.contains('maximized')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = el.offsetLeft;
            initialY = el.offsetTop;
            document.body.style.cursor = 'move';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let newX = initialX + (e.clientX - startX);
            let newY = initialY + (e.clientY - startY);
            
            // 컨테이너 경계선 밖으로 나가지 못하도록 제한
            const maxX = this.container.offsetWidth - el.offsetWidth;
            const maxY = this.container.offsetHeight - el.offsetHeight;
            
            if (newX < 0) newX = 0;
            if (newY < 0) newY = 0;
            if (newX > maxX) newX = maxX;
            if (newY > maxY) newY = maxY;

            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = 'default';
            }
        });
    }

    makeResizable(el, handle) {
        let isResizing = false;
        let startX, startY, initialWidth, initialHeight;

        handle.addEventListener('mousedown', (e) => {
            if (el.classList.contains('maximized')) return;
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            initialWidth = el.offsetWidth;
            initialHeight = el.offsetHeight;
            document.body.style.cursor = 'nwse-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const width = initialWidth + (e.clientX - startX);
            const height = initialHeight + (e.clientY - startY);
            
            if (width > 300) el.style.width = `${width}px`;
            if (height > 200) el.style.height = `${height}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
            }
        });
    }

    updateTaskbar() {
        this.taskbarApps.innerHTML = '';
        
        // Find highest zIndex to determine active window
        let activeWin = null;
        let maxZ = -1;
        this.windows.forEach(w => {
            if (w.state !== 'minimized' && parseInt(w.el.style.zIndex || 0) > maxZ) {
                maxZ = parseInt(w.el.style.zIndex);
                activeWin = w.id;
            }
        });

        this.windows.forEach(w => {
            const btn = document.createElement('div');
            btn.className = `taskbar-app-btn ${w.state === 'minimized' ? 'minimized' : ''} ${activeWin === w.id ? 'active' : ''}`;
            btn.innerHTML = `<i data-lucide="${w.icon}" style="width: 16px; height: 16px; margin-right: 6px;"></i> ${w.title.split(' ')[0]}`;
            
            btn.addEventListener('click', () => {
                if (w.state === 'minimized') {
                    this.restoreWindow(w.id);
                } else if (activeWin === w.id) {
                    this.minimizeWindow(w.id);
                } else {
                    this.focusWindow(w.id);
                }
            });
            
            const closeBtn = document.createElement('div');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.marginLeft = '8px';
            closeBtn.style.fontSize = '16px';
            closeBtn.style.lineHeight = '1';
            closeBtn.style.opacity = '0.6';
            closeBtn.style.cursor = 'pointer';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeWindow(w.id);
            });
            
            btn.appendChild(closeBtn);
            
            this.taskbarApps.appendChild(btn);
        });
        
        lucide.createIcons({ root: this.taskbarApps });
    }

    showDialog(title, message, type = 'alert', callback = null) {
        const overlay = document.createElement('div');
        overlay.className = 'os-dialog-overlay';

        let buttonsHtml = '';
        if (type === 'confirm') {
            buttonsHtml = `
                <button class="btn btn-yes" style="min-width: 80px;">예(Yes)</button>
                <button class="btn btn-no" style="min-width: 80px;">아니오(No)</button>
            `;
        } else {
            buttonsHtml = `<button class="btn btn-ok" style="min-width: 80px;">확인(OK)</button>`;
        }

        overlay.innerHTML = `
            <div class="os-dialog">
                <div class="window-header">
                    <div class="window-title"><i data-lucide="bell" style="width: 14px; height: 14px; margin-right: 5px;"></i>${title}</div>
                </div>
                <div class="os-dialog-content">
                    ${message}
                </div>
                <div class="os-dialog-buttons">
                    ${buttonsHtml}
                </div>
            </div>
        `;

        this.container.appendChild(overlay);
        lucide.createIcons({ root: overlay });

        const closeDialog = (result) => {
            this.container.removeChild(overlay);
            if (callback) callback(result);
        };

        if (type === 'confirm') {
            overlay.querySelector('.btn-yes').addEventListener('click', () => closeDialog(true));
            overlay.querySelector('.btn-no').addEventListener('click', () => closeDialog(false));
        } else {
            overlay.querySelector('.btn-ok').addEventListener('click', () => closeDialog(true));
        }
    }
}
