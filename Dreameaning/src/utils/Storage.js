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

export function deleteDream(id) {
    let dreams = getSetting('dreams', []);
    dreams = dreams.filter(d => d.id !== id);
    saveSetting('dreams', dreams);
}

export function updateDream(id, newData) {
    let dreams = getSetting('dreams', []);
    const idx = dreams.findIndex(d => d.id === id);
    if (idx !== -1) {
        dreams[idx] = { ...dreams[idx], ...newData };
        saveSetting('dreams', dreams);
    }
}

export function getDreams() {
    return getSetting('dreams', []);
}
