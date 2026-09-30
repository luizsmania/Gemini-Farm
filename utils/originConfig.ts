const normalizeOrigin = (origin: string): string => {
  if (!origin) return '';
  return origin.trim().replace(/\/+$/, '');
};

export const getAllowedOrigins = (): string[] => {
  const configured = new Set<string>();

  const envOrigins = [
    process.env.ALLOWED_ORIGINS,
    process.env.CLIENT_URL,
  ];

  for (const raw of envOrigins) {
    if (!raw) continue;
    for (const item of raw.split(',')) {
      const normalized = normalizeOrigin(item);
      if (normalized) configured.add(normalized);
    }
  }

  const localhostOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://localhost:3000',
    'https://localhost:5173',
    'https://127.0.0.1:3000',
    'https://127.0.0.1:5173',
  ];

  for (const origin of localhostOrigins) {
    configured.add(origin);
  }

  return Array.from(configured).filter(Boolean);
};

export const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return false;

  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(normalized)) {
    return true;
  }

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    if (hostname.endsWith('.vercel.app') || hostname.endsWith('.vercel.dev')) {
      return true;
    }

    if (hostname.endsWith('.onrender.com') || hostname === 'onrender.com') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};
