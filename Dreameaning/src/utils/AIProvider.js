import { getSetting } from './Storage.js';

const SYSTEM_PROMPT = `당신은 20년 경력의 무의식 연구원이자 깊이 있는 심리 치료사, 그리고 신비주의 꿈 해석가입니다.
사용자가 입력한 꿈의 묘사와 감정 톤을 토대로, 시적이며 통찰력 가득한 해몽 결과를 작성해 주세요. 
사용자에게 위로와 성찰, 그리고 기분 좋은 신비감을 주어야 합니다.

[중요 지침]
1. 언어 및 어조: 모든 답변은 반드시 자연스러운 한국어(Korean)로 작성하며, 방문자를 존중하는 부드럽고 다정한 경어체(~해요, ~습니다)를 일관되게 사용하세요.
2. 예외 처리: 사용자의 입력이 너무 짧거나(예: "ㅋㅋ", "없음") 무의미한 단어일 경우, 무시하거나 거절하지 말고 '무의식의 문턱에서 기억이 흐려진 상태'나 '내면이 깊은 휴식을 취한 상태' 등으로 자연스럽고 시적으로 포장해 해석해 주세요.
3. 악몽/트라우마 대응: 꿈의 내용이 폭력적, 부정적, 혹은 무서운 내용이더라도 절대 공포감을 조장하지 마세요. 대신 낡은 자아가 허물어지고 새로운 자아로 탈바꿈하는 '치유와 성장의 과정'으로 긍정적이고 따뜻하게 승화시켜 해석하세요.

반드시 다음 JSON 형식을 엄격히 지켜 응답해 주세요. 키 이름과 구조를 정확히 일치시켜야 합니다:
{
  "title": "꿈의 내용과 상징을 아우르는 시적이고 아름다운 제목 (예: 푸른 고래가 그린 은하수 길)",
  "summary": "꿈의 전체적인 흐름과 감정, 분위기를 요약하고 그 안에 담긴 중심 의미를 은유적으로 해석 (3~4줄 내외)",
  "psychology": "꿈속 상황과 선택한 감정을 바탕으로 한 깊이 있는 심층 심리학적 분석. 사용자의 최근 내면 상태, 억눌린 욕망, 혹은 심리적 성장을 짚어줍니다. (4~5줄 내외)",
  "mysticalMeaning": "영적이고 직관적인 관점에서의 길흉화복 및 동양/서양 고전 해몽학적 의미. 긍정적이고 희망적인 에너지를 줄 수 있는 해석이어야 합니다. (4~5줄 내외)",
  "symbols": [
    {
      "keyword": "꿈에서 중요하게 등장한 상징물1 (예: 푸른 고래, 바다, 하늘 등)",
      "meaning": "그 상징물이 뜻하는 심리학적/상징적 의미 설명"
    },
    {
      "keyword": "꿈에서 중요하게 등장한 상징물2",
      "meaning": "그 상징물이 뜻하는 심리학적/상징적 의미 설명"
    }
  ],
  "luckyElements": {
    "color": "오늘의 운세를 터뜨릴 수 있는 행운의 색상과 그 간단한 이유",
    "number": "행운의 숫자 (1~45 사이에서 1~3개 제안)",
    "action": "오늘 하루 무의식의 긍정적인 힘을 현실로 이끌어내기 위해 실천해볼 가벼운 추천 행동"
  },
  "quote": "꿈의 의미를 함축하여 유저에게 깊은 여운을 주는 짧은 치유의 시구절이나 한 줄 명언 (직접 창작)"
}

대답은 오직 상기 JSON 규격을 만족하는 순수한 JSON 텍스트여야 합니다.`;

export async function interpretDream(dreamContent, mood = 'peaceful') {
    const config = getSetting('ai_config', { provider: 'gemini', apiKey: '' });
    const userPrompt = `꿈 내용: "${dreamContent}"\n선택한 감정 분위기: "${translateMood(mood)}"`;

    if (config.provider === 'developer') {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    title: "개발자 모드: 잃어버린 세계의 조각들",
                    summary: "이 꿈은 일상에서 놓치고 있던 작은 조각들이 무의식 속에서 재조립되는 과정을 보여줍니다.",
                    psychology: "현재 약간의 피로감이 있으나, 내면의 창조적 에너지가 솟아나고 있는 긍정적인 신호입니다.",
                    mysticalMeaning: "당신의 잠재력이 깨어나는 시기입니다. 예상치 못한 귀인의 도움이 있을 수 있습니다.",
                    symbols: [{ keyword: "꿈", meaning: "무한한 가능성" }],
                    luckyElements: {
                        color: "에메랄드 그린",
                        number: "7, 14",
                        action: "오늘 하루, 평소 가지 않던 길로 산책해보기"
                    },
                    quote: "\"깨어난 뒤에도 마음속에 남은 작은 조각들은, 당신이 아직 가보지 않은 내일의 지도입니다.\""
                });
            }, 1500);
        });
    }

    try {
        // 서버 프록시로 우선 요청 (API 키 보호 및 CORS 방지)
        const response = await fetch('/api/interpret', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: config.provider,
                dreamContent: dreamContent,
                mood: mood,
                apiKey: config.apiKey || '',
                customBaseUrl: config.customBaseUrl || '',
                customModel: config.customModel || ''
            })
        });

        if (response.status === 404) {
            console.warn('프록시 서버가 없습니다. 클라이언트에서 직접 호출합니다.');
            return await executeDirectClientSide(config, userPrompt);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errMsg = errorData.error || `Proxy Error: ${response.status}`;
            if (response.status === 401 || response.status === 403) throw new Error('API_KEY_INVALID: API 키가 잘못되었습니다.');
            else if (response.status === 429) throw new Error('RATE_LIMIT_EXCEEDED: 요청 한도를 초과했습니다.');
            else throw new Error(errMsg);
        }

        return await response.json();
    } catch (err) {
        if (err.message.includes('API_KEY_INVALID') || err.message.includes('RATE_LIMIT_EXCEEDED')) {
            throw err;
        }
        console.warn('프록시 서버 통신 실패. 클라이언트에서 직접 호출합니다:', err);
        return await executeDirectClientSide(config, userPrompt);
    }
}

async function executeDirectClientSide(config, userPrompt) {
    if (!config || !config.apiKey) {
        throw new Error('API_KEY_MISSING: 설정 앱에서 API 키를 입력해주세요.');
    }

    switch (config.provider) {
        case 'openai':
            return callOpenAI(config.apiKey, userPrompt);
        case 'gemini':
            return callGemini(config.apiKey, userPrompt);
        case 'anthropic':
            return callAnthropic(config.apiKey, userPrompt);
        case 'custom':
            return callCustom(config, userPrompt);
        default:
            throw new Error('UNSUPPORTED_PROVIDER');
    }
}

async function callOpenAI(apiKey, userPrompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.75,
            max_tokens: 1500
        })
    });
    return handleResponse(response, 'openai');
}

async function callGemini(apiKey, userPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    const geminiSchema = {
        type: 'OBJECT',
        properties: {
            title: { type: 'STRING' },
            summary: { type: 'STRING' },
            psychology: { type: 'STRING' },
            mysticalMeaning: { type: 'STRING' },
            symbols: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        keyword: { type: 'STRING' },
                        meaning: { type: 'STRING' }
                    },
                    required: ['keyword', 'meaning']
                }
            },
            luckyElements: {
                type: 'OBJECT',
                properties: {
                    color: { type: 'STRING' },
                    number: { type: 'STRING' },
                    action: { type: 'STRING' }
                },
                required: ['color', 'number', 'action']
            },
            quote: { type: 'STRING' }
        },
        required: ['title', 'summary', 'psychology', 'mysticalMeaning', 'symbols', 'luckyElements', 'quote']
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: geminiSchema,
                temperature: 0.75,
                maxOutputTokens: 1500
            },
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
        })
    });
    return handleResponse(response, 'gemini');
}

async function callAnthropic(apiKey, userPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1500,
            system: SYSTEM_PROMPT + '\n중요: 오직 지정된 규격의 JSON 객체만 텍스트로 응답해야 하며 다른 서론이나 마크다운 백틱 코드블록(```json)을 붙이지 마세요.',
            messages: [{ role: 'user', content: userPrompt }],
            temperature: 0.75
        })
    });
    return handleResponse(response, 'anthropic');
}

async function callCustom(config, userPrompt) {
    const baseUrl = config.customBaseUrl.endsWith('/') ? config.customBaseUrl.slice(0, -1) : config.customBaseUrl;
    const url = `${baseUrl}/chat/completions`;
    const model = config.customModel || 'gpt-4o-mini';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: model,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.75,
            max_tokens: 1500
        })
    });
    return handleResponse(response, 'custom');
}

async function handleResponse(response, provider) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errMsg = '';
        if (provider === 'gemini') errMsg = errorData.error?.message || `Gemini API Error: ${response.status}`;
        else if (provider === 'anthropic') errMsg = errorData.error?.message || `Claude API Error: ${response.status}`;
        else errMsg = errorData.error?.message || `API Error: ${response.status}`;

        if (response.status === 401 || response.status === 403) throw new Error('API_KEY_INVALID: API 키가 잘못되었습니다.');
        else if (response.status === 429) throw new Error('RATE_LIMIT_EXCEEDED: 요청 한도를 초과했습니다.');
        else throw new Error(errMsg);
    }

    const data = await response.json();
    let text = '';
    if (provider === 'openai' || provider === 'custom') text = data.choices[0].message.content;
    else if (provider === 'gemini') text = data.candidates[0].content.parts[0].text;
    else if (provider === 'anthropic') text = data.content[0].text;

    text = text.trim();
    if (text.startsWith('\`\`\`')) {
        text = text.replace(/^\`\`\`json\s*/i, '').replace(/\`\`\`$/, '').trim();
    }
    return JSON.parse(text);
}

function translateMood(mood) {
    const map = {
        'peaceful': '평화롭고 고요한 상태',
        'weird': '기묘하고 신비롭거나 이해하기 어려운 상태',
        'scary': '두렵고 불안하거나 압박감을 느낀 상태',
        'excited': '짜릿하고 신나거나 강한 쾌감을 느낀 상태',
        'sad': '슬프고 우울하거나 마음이 시린 상태'
    };
    return map[mood] || mood;
}
