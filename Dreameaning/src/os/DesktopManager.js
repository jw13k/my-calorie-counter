export class DesktopManager {
    constructor() {
        this.container = document.getElementById('os-window-container');
        this.btnStart = document.getElementById('btn-start-menu');
        this.startMenu = document.getElementById('start-menu');
        this.btnShutdown = document.getElementById('btn-shutdown');
        this.trayTime = document.getElementById('tray-time');
        
        this.windows = [];
        this.zIndexCounter = 100;
        
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
        if (appId === 'dream') { title = '꿈 기록 (Dream Input)'; content = '<div id="app-dream"></div>'; }
        if (appId === 'archive') { title = '보관소 (Archive)'; content = '<div id="app-archive"></div>'; }
        if (appId === 'settings') { title = '설정 (Settings)'; content = '<div id="app-settings"></div>'; }

        this.createWindow(appId, title, content);
        
        window.dispatchEvent(new CustomEvent('os-app-opened', { detail: { appId } }));
    }

    createWindow(id, title, innerHTML) {
        const win = document.createElement('div');
        win.className = 'os-window';
        win.id = `win-${id}`;
        win.style.left = `${50 + this.windows.length * 20}px`;
        win.style.top = `${50 + this.windows.length * 20}px`;
        win.style.zIndex = this.zIndexCounter++;

        win.innerHTML = `
            <div class="window-header">
                <div class="window-title">${title}</div>
                <div class="window-controls">
                    <button class="win-btn win-close">&times;</button>
                </div>
            </div>
            <div class="window-content" id="content-${id}">
                ${innerHTML}
            </div>
        `;

        this.container.appendChild(win);
        this.windows.push({ id, el: win });

        const header = win.querySelector('.window-header');
        this.makeDraggable(win, header);

        win.querySelector('.win-close').addEventListener('click', () => {
            this.closeWindow(id);
        });

        win.addEventListener('mousedown', () => this.focusWindow(id));
    }

    closeWindow(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (winObj) {
            this.container.removeChild(winObj.el);
            this.windows = this.windows.filter(w => w.id !== id);
            window.dispatchEvent(new CustomEvent('os-app-closed', { detail: { appId: id } }));
        }
    }

    focusWindow(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (winObj) {
            winObj.el.style.zIndex = this.zIndexCounter++;
        }
    }

    makeDraggable(el, handle) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = el.offsetLeft;
            initialY = el.offsetTop;
            document.body.style.cursor = 'move';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = `${initialX + dx}px`;
            el.style.top = `${initialY + dy}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        });
    }
}
