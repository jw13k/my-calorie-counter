/**
 * Dreamean - Dream Vault History Component
 */
import { getDreamHistory, deleteDreamFromHistory, clearAllHistory } from '../utils/storage.js';

export class DreamVault {
    constructor(callbacks = {}) {
        this.callbacks = callbacks;
        
        // DOM Elements
        this.modal = document.getElementById('modal-vault');
        this.btnOpen = document.getElementById('btn-vault');
        this.btnClose = document.getElementById('btn-close-vault');
        this.btnClear = document.getElementById('btn-clear-vault');
        this.searchInput = document.getElementById('vault-search');
        this.grid = document.getElementById('vault-grid');
        this.emptyState = document.getElementById('vault-empty-state');
        this.countBadge = document.getElementById('vault-count');
        
        this.historyData = [];
        this.searchTerm = '';
        
        this.init();
    }

    init() {
        this.btnOpen.addEventListener('click', () => this.openVault());
        this.btnClose.addEventListener('click', () => this.closeVault());
        this.btnClear.addEventListener('click', () => this.clearVault());
        
        this.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase().trim();
            this.renderGrid();
        });

        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeVault();
            }
        });
        
        // Update header count initially
        this.updateHeaderBadge();
    }

    openVault() {
        this.modal.classList.add('open');
        this.historyData = getDreamHistory();
        this.searchTerm = '';
        this.searchInput.value = '';
        this.renderGrid();
        this.updateHeaderBadge();
    }

    closeVault() {
        this.modal.classList.remove('open');
    }

    updateHeaderBadge() {
        const count = getDreamHistory().length;
        this.countBadge.innerText = `${count}개의 기억`;
        
        // Update navbar button badge color or highlight if history exists
        const btnVault = document.getElementById('btn-vault');
        if (count > 0) {
            btnVault.style.borderColor = 'rgba(226, 91, 245, 0.4)';
            btnVault.style.background = 'rgba(226, 91, 245, 0.05)';
            const icon = btnVault.querySelector('i');
            if (icon) icon.style.color = 'var(--accent-magenta)';
        } else {
            btnVault.style.borderColor = '';
            btnVault.style.background = '';
            const icon = btnVault.querySelector('i');
            if (icon) icon.style.color = '';
        }
    }

    renderGrid() {
        this.grid.innerHTML = '';
        
        // Filter history based on search query
        const filtered = this.historyData.filter(item => {
            const titleMatch = item.interpretation.title.toLowerCase().includes(this.searchTerm);
            const contentMatch = item.content.toLowerCase().includes(this.searchTerm);
            const symbolMatch = (item.interpretation.symbols || []).some(s => 
                s.keyword.toLowerCase().includes(this.searchTerm) || 
                s.meaning.toLowerCase().includes(this.searchTerm)
            );
            return titleMatch || contentMatch || symbolMatch;
        });

        if (filtered.length === 0) {
            this.emptyState.style.display = 'flex';
            this.grid.style.display = 'none';
            return;
        }

        this.emptyState.style.display = 'none';
        this.grid.style.display = 'grid';

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'vault-card glass-panel';
            
            const dateStr = this.formatDate(item.date);
            const moodLabel = this.getMoodLabel(item.mood);
            
            card.innerHTML = `
                <span class="vault-card-date">${dateStr}</span>
                <h4 class="vault-card-title">${item.interpretation.title}</h4>
                <p class="vault-card-desc">${item.content}</p>
                <div class="vault-card-footer">
                    <span class="vault-card-mood">${moodLabel}</span>
                    <button class="vault-card-delete" title="삭제" data-id="${item.id}">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;
            
            // Delete record logic
            const deleteBtn = card.querySelector('.vault-card-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent opening card
                if (confirm('이 꿈 기록을 보관소에서 정말 삭제하시겠습니까?')) {
                    this.historyData = deleteDreamFromHistory(item.id);
                    this.renderGrid();
                    this.updateHeaderBadge();
                }
            });

            // Open card in main result view
            card.addEventListener('click', () => {
                if (this.callbacks.onSelectDream) {
                    this.callbacks.onSelectDream(item);
                }
                this.closeVault();
            });

            this.grid.appendChild(card);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    clearVault() {
        if (this.historyData.length === 0) return;
        
        if (confirm('보관소에 저장된 모든 꿈 기록을 지우시겠습니까? 복구할 수 없습니다.')) {
            clearAllHistory();
            this.historyData = [];
            this.renderGrid();
            this.updateHeaderBadge();
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        
        return `${y}.${m}.${d} ${h}:${min}`;
    }

    getMoodLabel(mood) {
        const moods = {
            'peaceful': '☀️ 평화로움',
            'weird': '🌀 기묘함',
            'scary': '🌙 두려움',
            'excited': '⚡ 신남',
            'sad': '🌧️ 슬픔'
        };
        return moods[mood] || mood;
    }
}
