const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;

const SYSTEM_PROMPT = `당신은 20년 경력의 무의식 연구원이자 깊이 있는 심리 치료사, 그리고 신비주의 꿈 해석가입니다.
사용자가 입력한 꿈의 묘사와 감정 톤을 토대로, 시적이며 통찰력 가득한 해몽 결과를 작성해 주세요. 
사용자에게 위로와 성찰, 그리고 기분 좋은 신비감을 주어야 합니다.

[중요 지침]
1. 언어 및 어조: 모든 답변은 반드시 자연스러운 한국어(Korean)로 작성하며, 방문자를 존중하는 경어체(~합니다, ~습니다)를 일관되게 사용하세요.
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
  "quote": "꿈의 의미를 함축하여 유저에게 깊은 여운을 주는 짧은 시구절이나 한 줄 격언 (어울리는 것이 없다면 직접 창작)"
}

대답은 오직 상기 JSON 규격을 만족하는 순수한 JSON 텍스트여야 합니다.`;

// MIME types mapping
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

// Simple in-memory rate limiter to protect API quota
const rateLimitMap = new Map();

const server = http.createServer((req, res) => {
    // 1. API Route: POST /api/interpret
    if (req.url === '/api/interpret') {
        // Only allow POST requests
        if (req.method !== 'POST') {
            res.writeHead(405);
            res.end('Method Not Allowed');
            return;
        }

        // 0. CORS / Origin, Referer 방어 (타 도메인 접근 금지)
        const origin = req.headers['origin'] || req.headers['referer'] || '';
        if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.includes('aiweb2026.site') && !origin.includes('134.185.101.1')) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: '비정상적인 접근입니다. (Forbidden)' } }));
            return;
        }

        // 1. IP Rate Limiting (Max 5 requests per minute per IP)
        // CF-Connecting-IP 우선 확인, X-Forwarded-For는 여러 개일 수 있으므로 첫 번째 IP만 정확히 추출
        const xForwardedFor = req.headers['x-forwarded-for'] || '';
        const ip = req.headers['cf-connecting-ip'] || xForwardedFor.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        if (rateLimitMap.has(ip)) {
            const data = rateLimitMap.get(ip);
            if (now - data.time < 60000) { // Within 1 minute
                if (data.count >= 5) {
                    res.writeHead(429, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: { message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요. (Too many requests)' } }));
                    return;
                }
                data.count++;
            } else {
                rateLimitMap.set(ip, { time: now, count: 1 }); // Reset counter
            }
        } else {
            rateLimitMap.set(ip, { time: now, count: 1 });
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk;
            // Payload Size Limit (1MB) - 10GB 등 대용량 데이터로 인한 메모리 OOM 공격 방어
            if (body.length > 1e6) {
                req.connection.destroy(); // 1MB 초과 시 즉시 연결 강제 종료
            }
        });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                const { provider, dreamContent, mood, customBaseUrl, customModel } = payload;
                let apiKey = payload.apiKey;

                // Fallback to environment variables if no user key is provided or is placeholder
                if (!apiKey || apiKey === 'SERVER_DEFAULT') {
                    if (provider === 'openai') apiKey = process.env.OPENAI_API_KEY;
                    else if (provider === 'gemini') apiKey = process.env.GEMINI_API_KEY;
                    else if (provider === 'anthropic') apiKey = process.env.ANTHROPIC_API_KEY;
                    else if (provider === 'custom') apiKey = process.env.CUSTOM_API_KEY;
                }

                if (!apiKey) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'API_KEY_MISSING' }));
                    return;
                }

                const userPrompt = `꿈 내용: "${dreamContent}"\n선택한 감정 분위기: "${translateMood(mood)}"`;
                let result;

                if (provider === 'openai') {
                    result = await callOpenAI(apiKey, userPrompt);
                } else if (provider === 'gemini') {
                    result = await callGemini(apiKey, userPrompt);
                } else if (provider === 'anthropic') {
                    result = await callAnthropic(apiKey, userPrompt);
                } else if (provider === 'custom') {
                    result = await callCustom(apiKey, customBaseUrl, customModel, userPrompt);
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'UNSUPPORTED_PROVIDER' }));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));

            } catch (err) {
                console.error('Proxy Error:', err);
                let statusCode = 500;
                let errMsg = err.message || 'Internal Server Error';

                if (err.message === 'API_KEY_INVALID') statusCode = 401;
                else if (err.message === 'RATE_LIMIT_EXCEEDED') statusCode = 429;

                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: errMsg }));
            }
        });
        return;
    }

    // 2. Serve Static Files
    // 쿼리 스트링(?v=1.2 등)이 붙어있을 경우 제거하여 순수 파일 경로만 추출 (캐시 버스팅 방해 금지)
    const cleanUrl = req.url.split('?')[0];
    let filePath = path.join(__dirname, cleanUrl === '/' ? 'index.html' : cleanUrl);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Helper calling OpenAI
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

// Helper calling Gemini
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

// Helper calling Anthropic
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
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1500,
            system: SYSTEM_PROMPT + '\n중요: 오직 지정된 규격의 JSON 객체만 텍스트로 응답해야 하며 다른 서론이나 마크다운 백틱 코드블록(```json)을 붙이지 마세요.',
            messages: [{ role: 'user', content: userPrompt }],
            temperature: 0.75
        })
    });
    return handleResponse(response, 'anthropic');
}

// Helper calling Custom
async function callCustom(apiKey, customBaseUrl, customModel, userPrompt) {
    const baseUrl = customBaseUrl.endsWith('/') ? customBaseUrl.slice(0, -1) : customBaseUrl;
    const url = `${baseUrl}/chat/completions`;
    const model = customModel || 'gpt-4o-mini';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
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

// Response Parser
async function handleResponse(response, provider) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errMsg = '';
        if (provider === 'gemini') errMsg = errorData.error?.message || `Gemini API Error: ${response.status}`;
        else if (provider === 'anthropic') errMsg = errorData.error?.message || `Claude API Error: ${response.status}`;
        else errMsg = errorData.error?.message || `API Error: ${response.status}`;

        if (response.status === 401 || response.status === 403) throw new Error('API_KEY_INVALID');
        else if (response.status === 429) throw new Error('RATE_LIMIT_EXCEEDED');
        else throw new Error(errMsg);
    }

    const data = await response.json();
    let text = '';
    if (provider === 'openai' || provider === 'custom') text = data.choices[0].message.content;
    else if (provider === 'gemini') text = data.candidates[0].content.parts[0].text;
    else if (provider === 'anthropic') text = data.content[0].text;

    text = text.trim();
    if (text.startsWith('```')) {
        text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
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

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
