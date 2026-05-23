const _cache = {}
export const getCache = (key) => _cache[key] ?? null
export const setCache = (key, val) => { _cache[key] = val }
