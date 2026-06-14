/**
 * Dreamean - Main Application Orchestrator
 */
import { StarryBackground } from './components/Background.js';
import { KeyManager } from './components/KeyManager.js';
import { DreamResult } from './components/DreamResult.js';
import { DreamVault } from './components/DreamVault.js';
import { GameWorld } from './components/GameWorld.js';

import { getAiConfig, saveDreamToHistory } from './utils/storage.js';
import { interpretDreamAPI } from './api/ai.js';

class App {
    constructor() {
        // Game and dialogue states
        this.currentDialogueState = 'idle';
        this.loadingInterval = null;
        this.loadingMessages = [
            '기억의 우주에서 별자리를 맞추고 있습니다...',
            '무의식의 흩어진 조각들을 수집하는 중...',
            '꿈속의 상징들을 심리학적으로 분석하고 있습니다...',
            '오늘 밤 당신의 내면이 보내온 메시지를 해석하는 중...',
            '영적인 기운과 오늘의 운세 행운을 엮어내는 중...',
            '조금만 기다려주세요, 해몽가와 연결되고 있습니다...'
        ];
        
        this.selectedMood = 'peaceful';
        this.dreamContent = '';
        
        this.init();
    }

    init() {
        // 1. Initialize Background Stars Canvas
        new StarryBackground('starry-canvas');

        // 2. Initialize Game World Engine
        this.gameWorld = new GameWorld('game-canvas', {
            onInteract: (action) => this.handleGameInteraction(action),
            onClickBackground: () => {
                if (this.currentDialogueState !== 'idle') {
                    this.setDialogueState('idle');
                }
            },
            isDialogueActive: () => this.currentDialogueState !== 'idle'
        });

        // 3. Dialogue DOM Bindings
        this.dialogueBox = document.getElementById('dialogue-box');
        this.dialogueText = document.getElementById('dialogue-text');
        this.dialogueSpeaker = this.dialogueBox.querySelector('.dialogue-speaker');
        this.dialogueInputArea = document.getElementById('dialogue-input-area');
        this.dialogueTextarea = document.getElementById('dialogue-textarea');
        this.dialogueCharCount = document.getElementById('dialogue-char-count');
        this.dialogueMoodArea = document.getElementById('dialogue-mood-area');
        this.dialogueOptions = document.getElementById('dialogue-options');
        
        this.btnDialogueNext = document.getElementById('btn-dialogue-next');
        this.btnDialogueInterpret = document.getElementById('btn-dialogue-interpret');
        this.resultOverlay = document.getElementById('game-result-overlay');
        
        // 4. Initialize Modals & Results Components
        this.keyManager = new KeyManager({
            onSave: (key) => console.log('API Key configured.')
        });

        this.dreamResult = new DreamResult({
            onBack: () => this.closeResultOverlay(),
            onSave: (dreamData) => this.handleSaveToVault(dreamData)
        });

        this.dreamVault = new DreamVault({
            onSelectDream: (dreamRecord) => this.handleSelectSavedDream(dreamRecord)
        });

        // Setup Dialogue event listeners
        this.setupDialogueListeners();

        // Initial State
        this.setDialogueState('idle');

        // Initialize Lucide SVG Icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    setupDialogueListeners() {
        // Character count in dialogue
        this.dialogueTextarea.addEventListener('input', () => {
            const length = this.dialogueTextarea.value.length;
            this.dialogueCharCount.innerText = length;
            if (length >= 900) {
                this.dialogueCharCount.style.color = 'var(--accent-orange)';
            } else {
                this.dialogueCharCount.style.color = '';
            }
        });

        // Click next on text input
        this.btnDialogueNext.addEventListener('click', () => {
            const text = this.dialogueTextarea.value.trim();
            if (!text) {
                alert('꿈 내용을 간략하게라도 적어주셔야 해몽을 들여다볼 수 있습니다.');
                this.dialogueTextarea.focus();
                return;
            }
            if (text.length < 10) {
                alert('무의식의 나침반을 움직이기에는 꿈 단서가 너무 짧습니다 (최소 10자 입력 필요).');
                this.dialogueTextarea.focus();
                return;
            }
            this.dreamContent = text;
            this.setDialogueState('mood_input');
        });

        // Select mood pills
        const moodPills = this.dialogueMoodArea.querySelectorAll('.dialogue-mood-pill');
        moodPills.forEach((pill, idx) => {
            pill.addEventListener('click', (e) => {
                moodPills.forEach(p => {
                    p.classList.remove('active');
                    p.classList.remove('focused');
                });
                const target = e.currentTarget;
                target.classList.add('active');
                target.classList.add('focused');
                this.selectedMood = target.getAttribute('data-mood');
                this.activeOptionIndex = idx;
            });
        });

        // Click interpret
        this.btnDialogueInterpret.addEventListener('click', () => {
            this.handleInterpret();
        });

        // Close result overlay click
        const btnCloseOverlay = document.getElementById('btn-close-result-overlay');
        if (btnCloseOverlay) {
            btnCloseOverlay.addEventListener('click', () => this.closeResultOverlay());
        }

        // Global dialogue keydown listener for keyboard navigation
        window.addEventListener('keydown', (e) => {
            if (this.currentDialogueState === 'idle' || this.currentDialogueState === 'loading') {
                return;
            }

            // In dream input state, we are typing. Intercept Ctrl+Enter only.
            if (this.currentDialogueState === 'dream_input') {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.btnDialogueNext.click();
                }
                return;
            }

            // Greet or Tablet menu state navigation: W/S or ArrowUp/ArrowDown, Enter/E to select
            if (this.currentDialogueState === 'greet' || this.currentDialogueState === 'tablet_menu') {
                const buttons = this.dialogueOptions.querySelectorAll('.dialogue-opt-btn');
                if (buttons.length === 0) return;

                if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                    e.preventDefault();
                    this.activeOptionIndex = (this.activeOptionIndex - 1 + buttons.length) % buttons.length;
                    this.highlightActiveOption(buttons);
                } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                    e.preventDefault();
                    this.activeOptionIndex = (this.activeOptionIndex + 1) % buttons.length;
                    this.highlightActiveOption(buttons);
                } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                    buttons[this.activeOptionIndex].click();
                }
            }
            // Mood input state navigation: A/D or ArrowLeft/ArrowRight, Enter/E to select & interpret
            else if (this.currentDialogueState === 'mood_input') {
                const pills = this.dialogueMoodArea.querySelectorAll('.dialogue-mood-pill');
                if (pills.length === 0) return;

                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                    e.preventDefault();
                    this.activeOptionIndex = (this.activeOptionIndex - 1 + pills.length) % pills.length;
                    this.highlightActiveMood(pills);
                } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                    e.preventDefault();
                    this.activeOptionIndex = (this.activeOptionIndex + 1) % pills.length;
                    this.highlightActiveMood(pills);
                } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                    pills[this.activeOptionIndex].click();
                    this.btnDialogueInterpret.click();
                }
            }
        });
    }

    setDialogueState(state) {
        this.currentDialogueState = state;
        
        // Reset sub-areas visibility
        this.dialogueInputArea.style.display = 'none';
        this.dialogueMoodArea.style.display = 'none';
        this.dialogueOptions.innerHTML = '';
        
        // Hide dialogue box in idle state, show as flex otherwise
        this.dialogueBox.style.display = state === 'idle' ? 'none' : 'flex';
        
        switch (state) {
            case 'idle':
                this.gameWorld.enableControls(true);
                break;
                
            case 'greet':
                this.gameWorld.enableControls(false);
                this.dialogueSpeaker.innerText = '해몽의 수정구슬';
                this.dialogueText.innerText = '어서오세요, 몽상가여. 오늘 밤 당신의 무의식이 나침반이 될 것입니다. 당신의 꿈 조각을 내게 보여주시겠습니까?';
                
                // Add choice buttons
                this.appendOption('대화하기', () => {
                    this.setDialogueState('dream_input');
                });
                this.appendOption('뒤로가기', () => {
                    this.setDialogueState('idle');
                });
                
                this.activeOptionIndex = 0;
                const buttons = this.dialogueOptions.querySelectorAll('.dialogue-opt-btn');
                this.highlightActiveOption(buttons);
                break;
                
            case 'dream_input':
                this.gameWorld.enableControls(false);
                this.dialogueSpeaker.innerText = '해몽의 수정구슬';
                this.dialogueText.innerText = '어젯밤 꿈속에서 어떤 신비롭거나 이상한 일이 일어났는지 내게 자세히 들려주시겠습니까?';
                this.dialogueInputArea.style.display = 'flex';
                this.dialogueTextarea.value = this.dreamContent || '';
                this.dialogueCharCount.innerText = this.dreamContent ? this.dreamContent.length : '0';
                this.dialogueTextarea.focus();
                
                // Add back button for dream_input
                this.appendOption('뒤로가기', () => {
                    this.setDialogueState('greet');
                });
                break;
                
            case 'mood_input':
                this.gameWorld.enableControls(false);
                this.dialogueSpeaker.innerText = '해몽의 수정구슬';
                this.dialogueText.innerText = '그 꿈속에서 당신의 의식을 가득 채웠던 분위기와 가장 지배적인 감정은 무엇이었나요?';
                this.dialogueMoodArea.style.display = 'block';
                
                // Auto-select first mood as active & focus
                this.activeOptionIndex = 0;
                const pills = this.dialogueMoodArea.querySelectorAll('.dialogue-mood-pill');
                this.highlightActiveMood(pills);
                break;
                
            case 'loading':
                this.gameWorld.enableControls(false);
                this.gameWorld.setOracleState('loading');
                this.dialogueSpeaker.innerText = '무의식 탐색 중';
                this.startLoadingMessages();
                break;
                
            case 'tablet_menu':
                this.gameWorld.enableControls(false);
                this.dialogueSpeaker.innerText = '고대의 비석';
                this.dialogueText.innerText = '비석에 새겨진 고대 문자 무늬가 푸른 빛으로 일렁입니다. 무엇을 확인하시겠습니까?';
                
                // Add choice buttons
                this.appendOption('📁 기억 보관소 열기', () => {
                    this.setDialogueState('idle');
                    this.dreamVault.openVault();
                });
                this.appendOption('⚙️ AI API 설정 관리', () => {
                    this.setDialogueState('idle');
                    this.keyManager.openModal();
                });
                this.appendOption('🌌 그냥 지나가기', () => {
                    this.setDialogueState('idle');
                });
                
                this.activeOptionIndex = 0;
                const optButtons = this.dialogueOptions.querySelectorAll('.dialogue-opt-btn');
                this.highlightActiveOption(optButtons);
                break;
        }
        
        if (window.lucide) window.lucide.createIcons();
    }

    appendOption(label, callback) {
        const btn = document.createElement('button');
        btn.className = 'dialogue-opt-btn';
        btn.innerText = label;
        btn.addEventListener('click', callback);
        btn.addEventListener('mouseenter', () => {
            const buttons = this.dialogueOptions.querySelectorAll('.dialogue-opt-btn');
            const idx = Array.from(buttons).indexOf(btn);
            if (idx !== -1) {
                this.activeOptionIndex = idx;
                this.highlightActiveOption(buttons);
            }
        });
        this.dialogueOptions.appendChild(btn);
    }

    highlightActiveOption(buttons) {
        buttons.forEach((btn, idx) => {
            if (idx === this.activeOptionIndex) {
                btn.classList.add('focused');
            } else {
                btn.classList.remove('focused');
            }
        });
    }

    highlightActiveMood(pills) {
        pills.forEach((pill, idx) => {
            if (idx === this.activeOptionIndex) {
                pills.forEach(p => {
                    p.classList.remove('active');
                    p.classList.remove('focused');
                });
                pill.classList.add('active');
                pill.classList.add('focused');
                this.selectedMood = pill.getAttribute('data-mood');
            } else {
                pill.classList.remove('focused');
            }
        });
    }

    /**
     * Proximity event hook from GameWorld
     */
    handleGameInteraction(action) {
        // If result overlay is currently open, don't allow interactions
        if (this.resultOverlay.style.display === 'flex' || this.resultOverlay.style.display === 'block') {
            return;
        }

        if (action === 'oracle') {
            const config = getAiConfig();
            if (!config || !config.apiKey) {
                alert('해몽 수정구슬이 빛을 잃었습니다. 먼저 API 설정을 통해 API Key를 등록해 주세요.');
                this.keyManager.openModal();
                this.setDialogueState('idle');
                return;
            }
            if (this.currentDialogueState === 'idle') {
                this.setDialogueState('greet');
            }
        } else if (action === 'tablet') {
            this.setDialogueState('tablet_menu');
        }
    }

    async handleInterpret() {
        const config = getAiConfig();
        if (!config || !config.apiKey) {
            alert('연동 설정된 API Key가 없습니다. API 설정을 확인해 주세요.');
            this.keyManager.openModal();
            this.setDialogueState('idle');
            return;
        }

        this.setDialogueState('loading');

        try {
            const interpretation = await interpretDreamAPI(config, this.dreamContent, this.selectedMood);
            
            const dreamRecord = {
                id: `dream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                date: new Date().toISOString(),
                content: this.dreamContent,
                mood: this.selectedMood,
                interpretation
            };

            this.stopLoadingMessages();
            this.gameWorld.setOracleState('idle');
            
            // Show result as absolute scroll overlay inside the game container
            this.resultOverlay.style.display = 'block';
            this.dreamResult.render(dreamRecord);
            
            this.dialogueSpeaker.innerText = '해몽 예언서 강림';
            this.dialogueText.innerText = '수정구슬 위에 나타난 예언서를 찬찬히 읽어보세요. [닫기]를 누르면 언제든지 자유롭게 움직일 수 있습니다.';

        } catch (error) {
            this.stopLoadingMessages();
            this.gameWorld.setOracleState('idle');
            this.setDialogueState('idle');
            
            if (error.message === 'API_KEY_INVALID') {
                alert('입력된 API Key가 만료되었거나 올바르지 않습니다. API 설정을 다시 확인해 주세요.');
                this.keyManager.openModal();
            } else if (error.message === 'RATE_LIMIT_EXCEEDED') {
                alert('OpenAI API 요청 제한 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.');
            } else {
                alert(`해몽 도중 에러가 발생했습니다: ${error.message || '알 수 없는 오류'}\nAPI 키 잔액이나 네트워크 연결 상태를 확인해 보세요.`);
            }
        }
    }

    startLoadingMessages() {
        let index = 0;
        this.dialogueText.innerText = this.loadingMessages[0];
        
        this.loadingInterval = setInterval(() => {
            index = (index + 1) % this.loadingMessages.length;
            this.dialogueText.style.opacity = 0;
            
            setTimeout(() => {
                this.dialogueText.innerText = this.loadingMessages[index];
                this.dialogueText.style.opacity = 1;
            }, 300);
            
        }, 3000);
    }

    stopLoadingMessages() {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
        this.dialogueText.style.opacity = 1;
    }

    closeResultOverlay() {
        this.resultOverlay.style.display = 'none';
        this.setDialogueState('idle');
    }

    handleSaveToVault(dreamRecord) {
        saveDreamToHistory(dreamRecord);
        this.dreamVault.updateHeaderBadge();
    }

    handleSelectSavedDream(dreamRecord) {
        // Render saved dream into the result scroll overlay
        this.resultOverlay.style.display = 'block';
        this.dreamResult.render(dreamRecord);
        
        // Saved state adjustments
        this.dreamResult.btnSaveVault.disabled = true;
        this.dreamResult.btnSaveVault.innerHTML = '<i data-lucide="check"></i> 보관함에 저장됨';
        if (window.lucide) window.lucide.createIcons();
        
        this.dialogueSpeaker.innerText = '과거 꿈 예언서';
        this.dialogueText.innerText = '수정구슬 위에 나타난 예언서를 찬찬히 읽어보세요. [닫기]를 누르면 언제든지 자유롭게 움직일 수 있습니다.';
    }
}

// Instantiate App
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
