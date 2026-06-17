import { getSetting, saveSetting, saveDream, getDreams, deleteDream, updateDream } from '../../utils/Storage.js';
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
                ${data.quote ? `<div style="margin-top: 15px; padding: 15px; border-left: 4px solid #333; background: #f9f9f9; font-style: italic; color: #555; text-align: center;">"${data.quote}"</div>` : ''}
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

        container.innerHTML = dreams.reverse().map((d, index) => {
            const shortText = d.text.length > 10 ? d.text.substring(0, 10) + '...' : d.text;
            return `
                <div class="archive-item" style="border: 2px solid #000; margin-bottom: 10px; background: #fff; cursor: pointer; position: relative;">
                    <div class="archive-summary" style="padding: 10px; display: flex; flex-direction: column; gap: 5px;" data-index="${index}">
                        <div style="font-size: 0.8em; color: #555;">${new Date(d.date).toLocaleString()}</div>
                        <div style="font-weight: bold; font-size: 1.05em; padding-right: 30px;">${d.title || '무제'}</div>
                        <div style="font-style: italic; color: #333;">"${shortText}"</div>
                    </div>

                    <!-- 3-dot Menu Button -->
                    <div class="dream-menu-btn" data-id="${d.id}" style="position: absolute; top: 10px; right: 10px; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; border-radius: 4px; background: #eee; font-weight: bold;">⋮</div>
                    
                    <!-- Dropdown Menu -->
                    <div class="dream-menu-dropdown" id="dropdown-${d.id}" style="display: none; position: absolute; top: 36px; right: 10px; background: #fff; border: 2px solid #000; z-index: 100; flex-direction: column; box-shadow: 2px 2px 0px rgba(0,0,0,0.2);">
                        <button class="menu-action-btn" data-action="edit" data-id="${d.id}" style="padding: 8px 12px; border: none; background: none; cursor: pointer; text-align: left; border-bottom: 1px solid #ddd; font-family: inherit;">수정 및 재해석</button>
                        <button class="menu-action-btn" data-action="copy" data-id="${d.id}" style="padding: 8px 12px; border: none; background: none; cursor: pointer; text-align: left; border-bottom: 1px solid #ddd; font-family: inherit;">복사하기</button>
                        <button class="menu-action-btn" data-action="delete" data-id="${d.id}" style="padding: 8px 12px; border: none; background: none; cursor: pointer; text-align: left; color: red; font-family: inherit;">삭제하기</button>
                    </div>

                    <div class="archive-details" id="archive-details-${index}" style="display: none; border-top: 2px dashed #000; padding: 10px; background: #fafafa;">
                        <div style="margin-bottom: 10px; font-style: italic; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
                            <strong>전체 꿈 내용:</strong><br>${d.text}
                        </div>
                        <div>
                            ${d.interpretationHtml || `<strong>해석:</strong> ${d.interpretation}`}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 이벤트 바인딩
        const summaries = container.querySelectorAll('.archive-summary');
        summaries.forEach(summary => {
            summary.addEventListener('mouseenter', () => { summary.style.background = '#f0f0f0'; });
            summary.addEventListener('mouseleave', () => { summary.style.background = 'transparent'; });
            
            summary.addEventListener('click', (e) => {
                const idx = summary.getAttribute('data-index');
                const details = container.querySelector(`#archive-details-${idx}`);
                if (details.style.display === 'none') {
                    details.style.display = 'block';
                } else {
                    details.style.display = 'none';
                }
            });
        });

        // 3-dot Menu Event
        const menuBtns = container.querySelectorAll('.dream-menu-btn');
        menuBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // 부모(아코디언 토글) 방지
                const id = btn.getAttribute('data-id');
                const dropdown = container.querySelector(`#dropdown-${id}`);
                const isHidden = dropdown.style.display === 'none';
                
                // Close all others
                container.querySelectorAll('.dream-menu-dropdown').forEach(dd => dd.style.display = 'none');
                if (isHidden) dropdown.style.display = 'flex';
            });
        });

        // Dropdown auto-close
        document.addEventListener('click', () => {
            const dropdowns = container.querySelectorAll('.dream-menu-dropdown');
            if (dropdowns) dropdowns.forEach(dd => dd.style.display = 'none');
        }, { once: false });

        // Action Events
        const actionBtns = container.querySelectorAll('.menu-action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('mouseenter', () => { btn.style.background = '#f0f0f0'; });
            btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                const id = Number(btn.getAttribute('data-id'));
                const dreamObj = dreams.find(d => d.id === id);
                const idx = dreams.findIndex(d => d.id === id);
                
                if (action === 'delete') {
                    if (window.desktopManager) {
                        window.desktopManager.showDialog('기록 삭제', '정말 이 꿈 기록을 삭제하시겠습니까?', 'confirm', (isYes) => {
                            if (isYes) {
                                deleteDream(id);
                                render();
                            }
                        });
                    } else {
                        if (confirm('정말 이 꿈 기록을 삭제하시겠습니까?')) {
                            deleteDream(id);
                            render();
                        }
                    }
                } else if (action === 'copy') {
                    let copyText = `[${dreamObj.title || '무제'}]\\n\\n나의 꿈: ${dreamObj.text}\\n\\n`;
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = dreamObj.interpretationHtml || dreamObj.interpretation || '';
                    copyText += tempDiv.innerText;
                    
                    navigator.clipboard.writeText(copyText).then(() => {
                        if (window.desktopManager) {
                            window.desktopManager.showDialog('복사 완료', '클립보드에 복사되었습니다!<br>원하는 곳에 붙여넣기 하세요.', 'alert');
                        } else {
                            alert('클립보드에 복사되었습니다! 원하는 곳에 붙여넣기 하세요.');
                        }
                    }).catch(err => {
                        if (window.desktopManager) window.desktopManager.showDialog('오류', '복사 실패: ' + err, 'alert');
                    });
                } else if (action === 'edit') {
                    const detailsContainer = container.querySelector(`#archive-details-${idx}`);
                    
                    // 펼쳐져 있지 않다면 펼치기
                    detailsContainer.style.display = 'block';
                    
                    // 편집용 UI 주입
                    detailsContainer.innerHTML = `
                        <div style="margin-bottom: 10px;">
                            <strong>꿈 내용 수정:</strong><br>
                            <textarea id="edit-text-${id}" class="text-input" rows="4" style="margin-top: 5px; font-family: inherit;">${dreamObj.text}</textarea>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button id="btn-update-${id}" class="btn" style="flex: 1;">재해석하기 (Update)</button>
                            <button id="btn-cancel-${id}" class="btn" style="flex: 1; background: #eee;">취소 (Cancel)</button>
                        </div>
                        <div id="edit-msg-${id}" style="margin-top: 10px; font-weight: bold; color: #555;"></div>
                    `;

                    // 취소 이벤트
                    detailsContainer.querySelector(`#btn-cancel-${id}`).addEventListener('click', () => {
                        render(); // 다시 원래대로 렌더링
                    });

                    // 재해석(Update) 이벤트
                    detailsContainer.querySelector(`#btn-update-${id}`).addEventListener('click', async () => {
                        const newText = detailsContainer.querySelector(`#edit-text-${id}`).value;
                        if (!newText.trim()) return;

                        const msgDiv = detailsContainer.querySelector(`#edit-msg-${id}`);
                        msgDiv.innerText = 'AI가 다시 분석 중입니다... 잠시만 기다려주세요.';
                        
                        try {
                            const data = await interpretDream(newText);
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
                                ${data.quote ? `<div style="margin-top: 15px; padding: 15px; border-left: 4px solid #333; background: #f9f9f9; font-style: italic; color: #555; text-align: center;">"${data.quote}"</div>` : ''}
                            `;
                            
                            updateDream(id, { text: newText, title: data.title, interpretationHtml: html });
                            render(); // 다시 원래대로 (변경된 내용으로) 렌더링
                            
                            // 변경 후 해당 아이템 열어두기
                            setTimeout(() => {
                                const newDetails = container.querySelector(`#archive-details-${idx}`);
                                if (newDetails) newDetails.style.display = 'block';
                            }, 50);

                        } catch (err) {
                            msgDiv.innerText = '오류: ' + err.message;
                        }
                    });
                }
                
                container.querySelectorAll('.dream-menu-dropdown').forEach(dd => dd.style.display = 'none');
            });
        });
    };
    render();
}

function initSettingsApp(container) {
    const config = getSetting('ai_config', { provider: 'gemini', apiKey: '', customBaseUrl: '', customModel: '' });
    
    container.innerHTML = `
        <div class="form-group">
            <label>AI Provider 선택</label>
            <select id="api-provider-select" class="text-input">
                <option value="gemini" ${config.provider === 'gemini' ? 'selected' : ''}>Google Gemini (기본 내장 AI)</option>
                <option value="openai" ${config.provider === 'openai' ? 'selected' : ''}>OpenAI (gpt-4o-mini)</option>
                <option value="anthropic" ${config.provider === 'anthropic' ? 'selected' : ''}>Anthropic Claude (3-haiku)</option>
                <option value="custom" ${config.provider === 'custom' ? 'selected' : ''}>Custom (개인 서버/로컬 등)</option>
                <option value="developer" ${config.provider === 'developer' ? 'selected' : ''}>개발자 모드 (테스트용 가짜 데이터)</option>
            </select>
        </div>
        
        <div id="group-api-key" class="form-group" style="${config.provider === 'developer' ? 'display: none;' : ''}">
            <label id="api-key-label">API Key (비워두면 기본 시스템 키 사용)</label>
            <input type="password" id="input-api-key" class="text-input" value="${config.apiKey === 'SERVER_DEFAULT' ? '' : (config.apiKey || '')}" placeholder="직접 발급받은 키가 있다면 입력하세요">
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
