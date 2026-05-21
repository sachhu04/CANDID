export type URLStatus = 'VALID' | 'INVALID' | 'PENDING' | 'WAKING_UP' | 'UNKNOWN';

export interface ValidationResult {
  status: URLStatus;
  lastChecked: number;
}

// In-memory cache for validation results
export const urlCache = new Map<string, ValidationResult>();

const COLD_START_DOMAINS = [
  'streamlit.app',
  'streamlit.io',
  'onrender.com',
  'hf.space',
  'up.railway.app'
];

export function isColdStartDomain(hostname: string): boolean {
  return COLD_START_DOMAINS.some(domain => hostname.endsWith(domain));
}

// Regex to validate mailto: links — no network check possible for these
const MAILTO_REGEX = /^mailto:[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function isMailto(url: string): boolean {
  return MAILTO_REGEX.test(url.trim());
}

export function isValidSyntax(url: string): boolean {
  // mailto: links are valid by regex — no HTTP fetch is possible
  if (isMailto(url)) return true;
  try {
    const parsed = new URL(url);
    if (['javascript:', 'file:', 'data:', 'vbs:', 'mailto:'].includes(parsed.protocol)) return false;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]') return false;
    return true;
  } catch {
    return false;
  }
}

async function performRequest(url: string, method: string, timeoutMs: number): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      signal: controller.signal,
      redirect: "follow",
    });
    return res;
  } catch (error: any) {
    if (error?.cause?.message?.includes("redirect") || error?.message?.includes("redirect")) {
       // Server is alive and actively redirecting (likely an auth wall)
       return new Response(null, { status: 200 });
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function validateUrl(urlString: string): Promise<URLStatus> {
  // mailto: links cannot be validated via HTTP — skip network check entirely
  if (isMailto(urlString)) {
    urlCache.set(urlString, { status: 'VALID', lastChecked: Date.now() });
    return 'VALID';
  }

  if (!isValidSyntax(urlString)) return 'INVALID';
  
  if (urlCache.has(urlString)) {
    const cached = urlCache.get(urlString)!;
    // Cache for 10 minutes
    if (Date.now() - cached.lastChecked < 10 * 60 * 1000) {
      if (cached.status !== 'PENDING') return cached.status;
    }
  }

  // Fast path for known bot-hostile domains
  if (urlString.includes("linkedin.com") || urlString.includes("github.com")) {
    const result: ValidationResult = { status: 'VALID', lastChecked: Date.now() };
    urlCache.set(urlString, result);
    return 'VALID';
  }

  try {
    const parsed = new URL(urlString);
    const isColdStart = isColdStartDomain(parsed.hostname);
    const timeout = isColdStart ? 6000 : 3000;
    
    // First attempt: HEAD
    let res = await performRequest(urlString, 'HEAD', timeout);
    
    // If HEAD fails or method not allowed, try lightweight GET
    if (!res || res.status === 405 || res.status === 501) {
       res = await performRequest(urlString, 'GET', timeout);
    }
    
    let status: URLStatus = 'UNKNOWN';
    if (!res) {
      status = isColdStart ? 'WAKING_UP' : 'INVALID';
    } else if (res.status >= 200 && res.status < 400) {
      status = 'VALID';
    } else if (res.status >= 500) {
      status = 'WAKING_UP';
    } else if (res.status === 403 || res.status === 401 || res.status === 999) {
      status = 'VALID'; // Behind auth/bot wall, but URL exists
    } else {
      status = 'INVALID';
    }
    
    urlCache.set(urlString, { status, lastChecked: Date.now() });
    return status;
  } catch {
    urlCache.set(urlString, { status: 'INVALID', lastChecked: Date.now() });
    return 'INVALID';
  }
}

export function startBackgroundValidation(url: string) {
  // mailto: links are always valid — no background fetch needed
  if (isMailto(url)) {
    urlCache.set(url, { status: 'VALID', lastChecked: Date.now() });
    return;
  }

  if (!isValidSyntax(url)) {
    urlCache.set(url, { status: 'INVALID', lastChecked: Date.now() });
    return;
  }
  
  if (!urlCache.has(url)) {
    urlCache.set(url, { status: 'PENDING', lastChecked: Date.now() });
  } else {
    const cached = urlCache.get(url)!;
    if (cached.status !== 'PENDING' && Date.now() - cached.lastChecked < 10 * 60 * 1000) {
      return; // Already validated recently
    }
  }
  
  // Fire and forget, runs asynchronously
  validateUrl(url).catch(console.error);
}
