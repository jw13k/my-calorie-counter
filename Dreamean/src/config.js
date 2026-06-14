/**
 * Dreamean - Default Developer Configuration
 * 
 * SECURITY WARNING: Since this is a pure client-side application, any API key written here 
 * will be exposed in the browser's source code. 
 * 
 * If you deploy this with a backend proxy (Option 3), set 'useServerDefaultKey' to true.
 * The client will use 'SERVER_DEFAULT' as a placeholder to safely route requests to the proxy,
 * which reads the real keys from server environment variables.
 */
export const DEVELOPER_CONFIG = {
    provider: 'gemini', // Default provider: 'openai', 'gemini', 'anthropic', or 'custom'
    useServerDefaultKey: true, // Set to true to utilize backend proxy's environment variables
    apiKey: '', // Developer's default API key (Leave empty if using server environment variables)
    customBaseUrl: '',
    customModel: ''
};
