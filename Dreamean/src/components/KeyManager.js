/**
 * Dreamean - API Key Manager Component
 */
import { getAiConfig, saveAiConfig } from '../utils/storage.js';

export class KeyManager {
    constructor(callbacks = {}) {
        this.callbacks = callbacks;
        
        // DOM Elements
        this.modal = document.getElementById('modal-settings');
        this.btnOpen = document.getElementById('btn-settings');
        this.btnClose = document.getElementById('btn-close-settings');
        this.btnCancel = document.getElementById('btn-cancel-settings');
        this.btnSave = document.getElementById('btn-save-settings');
        this.inputKey = document.getElementById('api-key-input');
        this.btnToggleVisibility = document.getElementById('btn-toggle-key-visibility');
        this.eyeIcon = document.getElementById('eye-icon');
        
        // Dynamic Provider Elements
        this.selectProvider = document.getElementById('api-provider-select');
        this.groupCustomUrl = document.getElementById('group-custom-url');
        this.groupCustomModel = document.getElementById('group-custom-model');
        this.inputCustomUrl = document.getElementById('api-custom-url');
        this.inputCustomModel = document.getElementById('api-custom-model');
        this.apiKeyLabel = document.getElementById('api-key-label');
        
        this.init();
    }

    init() {
        // Load initial key if exists
        const config = getAiConfig();
        if (config && config.apiKey) {
            this.inputKey.value = config.apiKey;
            this.selectProvider.value = config.provider;
            this.inputCustomUrl.value = config.customBaseUrl || '';
            this.inputCustomModel.value = config.customModel || '';
            this.updateHeaderKeyIndicator(true);
        } else {
            this.updateHeaderKeyIndicator(false);
        }

        // Event Listeners
        this.btnOpen.addEventListener('click', () => this.openModal());
        this.btnClose.addEventListener('click', () => this.closeModal());
        this.btnCancel.addEventListener('click', () => this.closeModal());
        this.btnSave.addEventListener('click', () => this.saveKey());
        
        this.btnToggleVisibility.addEventListener('click', () => this.toggleKeyVisibility());
        
        this.selectProvider.addEventListener('change', () => this.handleProviderChange());
        
        // Close modal on outer click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Run initial provider toggle
        this.handleProviderChange();
    }

    handleProviderChange() {
        const provider = this.selectProvider.value;
        
        // Update label
        if (provider === 'gemini') {
            this.apiKeyLabel.innerText = 'Gemini API Key';
        } else if (provider === 'anthropic') {
            this.apiKeyLabel.innerText = 'Anthropic API Key';
        } else {
            this.apiKeyLabel.innerText = 'API Key';
        }
        
        // Toggle custom inputs
        if (provider === 'custom') {
            this.groupCustomUrl.style.display = 'block';
            this.groupCustomModel.style.display = 'block';
        } else {
            this.groupCustomUrl.style.display = 'none';
            this.groupCustomModel.style.display = 'none';
        }
        
        // Toggle help sheets
        const guides = ['openai', 'gemini', 'anthropic', 'custom'];
        guides.forEach(g => {
            const el = document.getElementById(`help-${g}`);
            if (el) el.style.display = g === provider ? 'block' : 'none';
        });
    }

    openModal() {
        // Refresh inputs from storage when opening
        const config = getAiConfig();
        this.selectProvider.value = config.provider;
        this.inputKey.value = config.apiKey || '';
        this.inputCustomUrl.value = config.customBaseUrl || '';
        this.inputCustomModel.value = config.customModel || '';
        
        this.handleProviderChange();
        
        this.modal.classList.add('open');
        this.inputKey.focus();
    }

    closeModal() {
        this.modal.classList.remove('open');
    }

    toggleKeyVisibility() {
        const isPassword = this.inputKey.type === 'password';
        this.inputKey.type = isPassword ? 'text' : 'password';
        
        if (isPassword) {
            this.eyeIcon.setAttribute('data-lucide', 'eye-off');
        } else {
            this.eyeIcon.setAttribute('data-lucide', 'eye');
        }
        
        // Re-render the icon
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    saveKey() {
        const provider = this.selectProvider.value;
        const apiKey = this.inputKey.value.trim();
        const customBaseUrl = this.inputCustomUrl.value.trim();
        const customModel = this.inputCustomModel.value.trim();
        
        if (!apiKey) {
            alert('API Key를 입력해 주세요. (연동 해제를 원할 시 창을 그냥 닫으시면 됩니다)');
            return;
        }

        if (provider === 'custom' && !customBaseUrl) {
            alert('Custom API의 Base URL을 입력해 주세요.');
            return;
        }

        const config = {
            provider,
            apiKey,
            customBaseUrl,
            customModel
        };

        saveAiConfig(config);
        this.updateHeaderKeyIndicator(true);
        this.closeModal();
        
        if (this.callbacks.onSave) {
            this.callbacks.onSave(config);
        }
        
        this.showToast('AI API 연동 설정이 성공적으로 저장되었습니다.');
    }

    updateHeaderKeyIndicator(hasKey) {
        if (hasKey) {
            this.btnOpen.style.borderColor = 'rgba(0, 242, 254, 0.4)';
            this.btnOpen.style.background = 'rgba(0, 242, 254, 0.05)';
            const icon = this.btnOpen.querySelector('i');
            if (icon) icon.style.color = 'var(--accent-cyan)';
        } else {
            this.btnOpen.style.borderColor = '';
            this.btnOpen.style.background = '';
            const icon = this.btnOpen.querySelector('i');
            if (icon) icon.style.color = '';
        }
    }

    showToast(message) {
        // Build a temporary toast
        const toast = document.createElement('div');
        toast.className = 'glass-panel';
        toast.style.position = 'fixed';
        toast.style.bottom = '30px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.opacity = '0';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '30px';
        toast.style.zIndex = '999';
        toast.style.borderColor = 'var(--accent-cyan)';
        toast.style.fontSize = '0.9rem';
        toast.style.boxShadow = '0 10px 25px rgba(0, 242, 254, 0.2)';
        toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        toast.innerText = message;
        
        document.body.appendChild(toast);
        
        // Trigger reflow
        toast.offsetHeight;
        
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
        
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 400);
        }, 2500);
    }
}
