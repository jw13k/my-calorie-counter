import { getSetting, saveSetting, saveDream, getDreams } from '../../utils/Storage.js';
import { interpretDream } from '../../utils/AIProvider.js';

export function initApps() {
    window.addEventListener('os-app-opened', (e) => {
        const appId = e.detail.appId;
        const container = document.getElementById(`content-${appId}`);
        if (!container) return;

        if (appId === 'dream') initDreamApp(container);
        if (appId === 'archive') initArchiveApp(container);
        if (appId === 'settings') initSettingsApp(container);
    });
}

function initDreamApp(container) {
    container.innerHTML = `
        <div class="form-group">
            <label>어떤 꿈을 꾸셨나요?</label>
            <textarea id="dream-input" class="text-input" rows="5"></textarea>
        </div>
        <button id="btn-interpret" class="btn">해석하기 (Interpret)</button>
        <div id="dream-result" style="margin-top: 15px; white-space: pre-wrap; font-weight: bold; padding: 10px; border: 2px dashed #000; display: none;"></div>
    `;

    container.querySelector('#btn-interpret').addEventListener('click', async () => {
        const text = container.querySelector('#dream-input').value;
        if (!text.trim()) return;
        
        const resultDiv = container.querySelector('#dream-result');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = 'AI가 꿈을 분석 중입니다... 잠시만 기다려주세요.';
        
        try {
            const data = await interpretDream(text);
            const html = `
                <h3 style="margin-top:0; margin-bottom:10px; border-bottom:1px solid #000; padding-bottom:5px;">${data.title}</h3>
                <p><strong>[요약]</strong><br>${data.summary}</p>
                <p><strong>[심리 분석]</strong><br>${data.psychology}</p>
                <p><strong>[신비학적 해몽]</strong><br>${data.mysticalMeaning}</p>
                <p><strong>[주요 상징]</strong></p>
                <ul style="margin:0; padding-left:20px;">
                    ${data.symbols.map(s => `<li><strong>${s.keyword}:</strong> ${s.meaning}</li>`).join('')}
                </ul>
                <div style="margin-top: 15px; padding: 10px; border: 1px dashed #000; background: rgba(0,0,0,0.05);">
                    <strong style="display:block; margin-bottom:5px;">🍀 오늘의 행운 요소</strong>
                    🎨 색상: ${data.luckyElements.color}<br>
                    🔢 숫자: ${data.luckyElements.number}<br>
                    ✨ 추천 행동: ${data.luckyElements.action}
                </div>
            `;
            resultDiv.innerHTML = html;
            saveDream({ text, title: data.title, interpretationHtml: html, date: new Date().toISOString() });
        } catch (err) {
            resultDiv.innerText = '오류: ' + err.message;
        }
    });
}

function initArchiveApp(container) {
    const render = () => {
        const dreams = getDreams();
        if (dreams.length === 0) {
            container.innerHTML = '<p>저장된 꿈이 없습니다.</p>';
            return;
        }
        container.innerHTML = dreams.reverse().map(d => `
            <div style="border: 2px solid #000; padding: 10px; margin-bottom: 15px; background: #fff;">
                <div style="font-size: 0.8em; margin-bottom: 5px; color: #555;">${new Date(d.date).toLocaleString()}</div>
                <div style="margin-bottom: 10px; font-style: italic;"><strong>나의 꿈:</strong> "${d.text}"</div>
                <div style="border-top: 1px dashed #000; padding-top: 10px;">
                    ${d.interpretationHtml || `<strong>해석:</strong> ${d.interpretation}`}
                </div>
            </div>
        `).join('');
    };
    render();
}

function initSettingsApp(container) {
    const config = getSetting('ai_config', { provider: 'developer', apiKey: '', customBaseUrl: '', customModel: '' });
    
    container.innerHTML = `
        <div class="form-group">
            <label>AI Provider 선택</label>
            <select id="api-provider-select" class="text-input">
                <option value="developer" ${config.provider === 'developer' ? 'selected' : ''}>개발자 모드 (기본 내장, Key 필요 없음)</option>
                <option value="openai" ${config.provider === 'openai' ? 'selected' : ''}>OpenAI (gpt-4o-mini)</option>
                <option value="gemini" ${config.provider === 'gemini' ? 'selected' : ''}>Google Gemini (1.5-flash)</option>
                <option value="anthropic" ${config.provider === 'anthropic' ? 'selected' : ''}>Anthropic Claude (3-haiku)</option>
                <option value="custom" ${config.provider === 'custom' ? 'selected' : ''}>Custom (개인 서버/로컬 등)</option>
            </select>
        </div>
        
        <div id="group-api-key" class="form-group" style="${config.provider === 'developer' ? 'display: none;' : ''}">
            <label id="api-key-label">API Key</label>
            <input type="password" id="input-api-key" class="text-input" value="${config.apiKey || ''}">
        </div>

        <div id="group-custom-url" class="form-group" style="${config.provider === 'custom' ? '' : 'display: none;'}">
            <label>Base URL (예: http://localhost:8000/v1)</label>
            <input type="text" id="api-custom-url" class="text-input" value="${config.customBaseUrl || ''}">
        </div>

        <div id="group-custom-model" class="form-group" style="${config.provider === 'custom' ? '' : 'display: none;'}">
            <label>Custom Model Name</label>
            <input type="text" id="api-custom-model" class="text-input" value="${config.customModel || ''}" placeholder="gpt-4o-mini">
        </div>

        <button id="btn-save-settings" class="btn">저장</button>
        <div id="settings-msg" style="margin-top: 10px; font-weight: bold;"></div>
    `;

    const selectProvider = container.querySelector('#api-provider-select');
    const groupKey = container.querySelector('#group-api-key');
    const groupCustomUrl = container.querySelector('#group-custom-url');
    const groupCustomModel = container.querySelector('#group-custom-model');
    const apiKeyLabel = container.querySelector('#api-key-label');

    selectProvider.addEventListener('change', () => {
        const provider = selectProvider.value;
        if (provider === 'developer') {
            groupKey.style.display = 'none';
        } else {
            groupKey.style.display = 'block';
            if (provider === 'gemini') apiKeyLabel.innerText = 'Gemini API Key';
            else if (provider === 'anthropic') apiKeyLabel.innerText = 'Anthropic API Key';
            else apiKeyLabel.innerText = 'API Key';
        }

        if (provider === 'custom') {
            groupCustomUrl.style.display = 'block';
            groupCustomModel.style.display = 'block';
        } else {
            groupCustomUrl.style.display = 'none';
            groupCustomModel.style.display = 'none';
        }
    });

    container.querySelector('#btn-save-settings').addEventListener('click', () => {
        const newConfig = {
            provider: selectProvider.value,
            apiKey: container.querySelector('#input-api-key').value.trim(),
            customBaseUrl: container.querySelector('#api-custom-url').value.trim(),
            customModel: container.querySelector('#api-custom-model').value.trim()
        };
        saveSetting('ai_config', newConfig);
        container.querySelector('#settings-msg').innerText = '저장되었습니다.';
    });
}
