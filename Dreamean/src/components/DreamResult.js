/**
 * Dreamean - Dream Result Viewer Component
 */

export class DreamResult {
    constructor(callbacks = {}) {
        this.callbacks = callbacks;
        
        // DOM Elements
        this.title = document.getElementById('result-title');
        this.summary = document.getElementById('result-summary');
        this.psychology = document.getElementById('result-psychology');
        this.mystical = document.getElementById('result-mystical');
        this.symbolsContainer = document.getElementById('result-symbols-container');
        this.luckyColor = document.getElementById('lucky-color');
        this.luckyNumber = document.getElementById('lucky-number');
        this.luckyAction = document.getElementById('lucky-action');
        
        this.btnBack = document.getElementById('btn-close-result-overlay');
        this.btnShare = document.getElementById('btn-share');
        this.btnSaveVault = document.getElementById('btn-save-vault');
        
        this.currentDreamData = null; // Store currently loaded dream
        this.typingTimeouts = [];
        
        this.init();
    }

    init() {
        if (this.btnBack) {
            this.btnBack.addEventListener('click', () => {
                this.clearTypingEffects();
                if (this.callbacks.onBack) this.callbacks.onBack();
            });
        }
        
        this.btnShare.addEventListener('click', () => this.shareResult());
        this.btnSaveVault.addEventListener('click', () => this.saveToVault());
    }

    clearTypingEffects() {
        this.typingTimeouts.forEach(t => clearTimeout(t));
        this.typingTimeouts = [];
        
        this.title.classList.remove('typing-active');
        this.summary.classList.remove('typing-active');
        this.psychology.classList.remove('typing-active');
        this.mystical.classList.remove('typing-active');
    }

    /**
     * Render the dream interpretation data.
     * @param {Object} dreamData 
     */
    render(dreamData) {
        this.currentDreamData = dreamData;
        const interpretation = dreamData.interpretation;
        
        this.clearTypingEffects();
        
        // Show title immediately but with a glow fade-in
        this.title.innerText = interpretation.title;
        this.title.style.opacity = 0;
        setTimeout(() => {
            this.title.style.transition = 'opacity 1s ease';
            this.title.style.opacity = 1;
        }, 50);

        // Run sequential or parallel typing effects for analysis text blocks
        this.typeText(this.summary, interpretation.summary, 12, () => {
            this.typeText(this.psychology, interpretation.psychology, 8, () => {
                this.typeText(this.mystical, interpretation.mysticalMeaning, 8);
            });
        });

        // Render Symbols
        this.renderSymbols(interpretation.symbols || []);

        // Render Lucky Elements
        this.luckyColor.innerText = interpretation.luckyElements.color;
        this.luckyNumber.innerText = Array.isArray(interpretation.luckyElements.number)
            ? interpretation.luckyElements.number.join(', ')
            : interpretation.luckyElements.number;
        this.luckyAction.innerText = interpretation.luckyElements.action;
        
        // Reset save button state
        this.btnSaveVault.disabled = false;
        this.btnSaveVault.innerHTML = '<span class="btn-glow"></span><i data-lucide="folder-heart"></i> 보관함에 저장';
        if (window.lucide) window.lucide.createIcons();
    }

    typeText(element, text, speed = 10, callback = null) {
        element.innerText = '';
        element.classList.add('typing-active');
        let index = 0;
        
        const type = () => {
            if (index < text.length) {
                element.innerText += text.charAt(index);
                index++;
                const timeout = setTimeout(type, speed);
                this.typingTimeouts.push(timeout);
            } else {
                element.classList.remove('typing-active');
                if (callback) callback();
            }
        };
        type();
    }

    renderSymbols(symbols) {
        this.symbolsContainer.innerHTML = '';
        
        if (symbols.length === 0) {
            this.symbolsContainer.innerHTML = '<div class="symbol-item"><div class="symbol-desc">특이한 상징물이 검출되지 않았습니다.</div></div>';
            return;
        }

        symbols.forEach((symbol, i) => {
            const item = document.createElement('div');
            item.className = 'symbol-item';
            item.innerHTML = `
                <div class="symbol-header">
                    <span class="symbol-keyword">${symbol.keyword}</span>
                    <i data-lucide="chevron-down" class="symbol-expand-icon"></i>
                </div>
                <span class="symbol-desc">${symbol.meaning}</span>
            `;
            
            // Toggle Symbol Expand/Collapse
            const desc = item.querySelector('.symbol-desc');
            const icon = item.querySelector('.symbol-expand-icon');
            
            item.addEventListener('click', () => {
                const isOpen = desc.style.display !== 'none';
                if (isOpen) {
                    desc.style.display = 'none';
                    icon.style.transform = 'rotate(0deg)';
                } else {
                    desc.style.display = 'block';
                    icon.style.transform = 'rotate(180deg)';
                }
            });
            
            this.symbolsContainer.appendChild(item);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    saveToVault() {
        if (!this.currentDreamData) return;
        
        if (this.callbacks.onSave) {
            this.callbacks.onSave(this.currentDreamData);
            
            this.btnSaveVault.disabled = true;
            this.btnSaveVault.innerHTML = '<i data-lucide="check"></i> 보관함 저장 완료';
            if (window.lucide) window.lucide.createIcons();
        }
    }

    shareResult() {
        if (!this.currentDreamData) return;
        
        const interpretation = this.currentDreamData.interpretation;
        const textToCopy = `✨ Dreamean (드림인) 꿈 해몽 결과 ✨
제목: ${interpretation.title}

[꿈 요약]
${interpretation.summary}

[심리학적 분석]
${interpretation.psychology}

[영적인 의미]
${interpretation.mysticalMeaning}

[오늘의 행운 처방]
- 행운의 색상: ${interpretation.luckyElements.color}
- 행운의 숫자: ${interpretation.luckyElements.number}
- 하루 처방 행동: ${interpretation.luckyElements.action}

꿈풀이 서비스 Dreamean에서 작성되었습니다.`;

        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                alert('해몽 결과가 클립보드에 복사되었습니다! 친구에게 공유해 보세요.');
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                alert('복사에 실패했습니다. 결과를 드래그해서 직접 복사해 주세요.');
            });
    }
}
