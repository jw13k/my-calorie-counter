/**
 * Dreamean - LocalStorage Utility Module
 */

const STORAGE_KEYS = {
    LEGACY_API_KEY: 'dreamean_openai_api_key', // For migration
    AI_CONFIG: 'dreamean_ai_config',
    HISTORY: 'dreamean_dream_history'
};

// Default AI configuration structure
const DEFAULT_CONFIG = {
    provider: 'openai',
    apiKey: '',
    customBaseUrl: '',
    customModel: ''
};

/**
 * Get the AI configuration, migrating legacy key if present.
 * @returns {Object} AI configuration
 */
export function getAiConfig() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.AI_CONFIG);
        if (data) {
            return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
        }
        
        // Try migration from legacy key
        const legacyKey = localStorage.getItem(STORAGE_KEYS.LEGACY_API_KEY);
        if (legacyKey) {
            const config = { ...DEFAULT_CONFIG, apiKey: legacyKey };
            saveAiConfig(config);
            localStorage.removeItem(STORAGE_KEYS.LEGACY_API_KEY); // Clean up
            return config;
        }
    } catch (e) {
        console.error('Error reading AI configuration:', e);
    }
    return { ...DEFAULT_CONFIG };
}

/**
 * Save the AI configuration.
 * @param {Object} config 
 */
export function saveAiConfig(config) {
    try {
        if (!config) {
            localStorage.removeItem(STORAGE_KEYS.AI_CONFIG);
        } else {
            localStorage.setItem(STORAGE_KEYS.AI_CONFIG, JSON.stringify(config));
        }
    } catch (e) {
        console.error('Error saving AI configuration:', e);
    }
}

/**
 * Get all saved dream interpretations.
 * @returns {Array<Object>}
 */
export function getDreamHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading dream history from localStorage:', e);
        return [];
    }
}

/**
 * Save a new dream interpretation to history.
 * @param {Object} dreamData 
 * @returns {Array<Object>} Updated history
 */
export function saveDreamToHistory(dreamData) {
    try {
        const history = getDreamHistory();
        
        const newRecord = {
            id: dreamData.id || `dream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: dreamData.date || new Date().toISOString(),
            content: dreamData.content,
            mood: dreamData.mood,
            interpretation: dreamData.interpretation
        };
        
        history.unshift(newRecord);
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
        return history;
    } catch (e) {
        console.error('Error saving dream to localStorage:', e);
        return getDreamHistory();
    }
}

/**
 * Delete a specific dream from history by ID.
 * @param {string} id 
 * @returns {Array<Object>} Updated history
 */
export function deleteDreamFromHistory(id) {
    try {
        let history = getDreamHistory();
        history = history.filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
        return history;
    } catch (e) {
        console.error('Error deleting dream from localStorage:', e);
        return getDreamHistory();
    }
}

/**
 * Clear all dream history.
 */
export function clearAllHistory() {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
}
