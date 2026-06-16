export function saveSetting(key, value) {
    localStorage.setItem(`dreamean_${key}`, JSON.stringify(value));
}

export function getSetting(key, defaultValue = null) {
    const val = localStorage.getItem(`dreamean_${key}`);
    return val ? JSON.parse(val) : defaultValue;
}

export function saveDream(dreamData) {
    const dreams = getSetting('dreams', []);
    dreams.push({ id: Date.now(), ...dreamData });
    saveSetting('dreams', dreams);
}

export function getDreams() {
    return getSetting('dreams', []);
}
