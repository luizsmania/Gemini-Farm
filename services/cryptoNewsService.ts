import { CryptoId } from '../types';
import { CRYPTOS } from '../cryptoConstants';

export interface NewsEvent {
  id: string;
  cryptoId: CryptoId;
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  priceImpact: number; // Percentage impact on price (-100 to +100)
  timestamp: number;
  expiresAt: number;
}

// News templates for different scenarios
const NEWS_TEMPLATES = {
  positive: [
    { title: "Major Partnership Announced", desc: "{name} announces strategic partnership with leading tech company" },
    { title: "Mainnet Launch Successful", desc: "{name} mainnet launch exceeds expectations with high transaction volume" },
    { title: "New Exchange Listing", desc: "{name} gets listed on major exchange, increasing accessibility" },
    { title: "Regulatory Approval", desc: "{name} receives regulatory approval in major market" },
    { title: "Institutional Adoption", desc: "Large institution announces {name} investment" },
    { title: "Technology Breakthrough", desc: "{name} announces breakthrough in scalability technology" },
    { title: "Celebrity Endorsement", desc: "Major celebrity endorses {name} on social media" },
  ],
  negative: [
    { title: "Security Breach Reported", desc: "{name} network reports potential security vulnerability" },
    { title: "Regulatory Concerns", desc: "Regulators express concerns about {name} operations" },
    { title: "Technical Issues", desc: "{name} experiences network congestion and slow transactions" },
    { title: "Major Sell-Off", desc: "Large holders of {name} begin selling positions" },
    { title: "Partnership Dissolved", desc: "{name} partnership with major company ends unexpectedly" },
    { title: "Competition Threat", desc: "New competitor emerges with superior technology to {name}" },
    { title: "Market Manipulation", desc: "Whales suspected of manipulating {name} prices" },
  ],
  neutral: [
    { title: "Network Update", desc: "{name} releases routine network maintenance update" },
    { title: "Community Growth", desc: "{name} community reaches new milestone in user count" },
    { title: "Development Progress", desc: "{name} development team releases progress report" },
    { title: "Market Analysis", desc: "Analysts debate {name} long-term potential" },
  ]
};

// Active news events
let activeNews: NewsEvent[] = [];

// Generate random news event
export const generateNewsEvent = (cryptoId: CryptoId): NewsEvent | null => {
  const crypto = CRYPTOS[cryptoId];
  
  // Random chance to generate news (5% per minute)
  if (Math.random() > 0.05) {
    return null;
  }

  // Determine news type (weighted: 40% positive, 40% negative, 20% neutral)
  const rand = Math.random();
  let type: 'positive' | 'negative' | 'neutral';
  if (rand < 0.4) {
    type = 'positive';
  } else if (rand < 0.8) {
    type = 'negative';
  } else {
    type = 'neutral';
  }

  // Select random template
  const templates = NEWS_TEMPLATES[type];
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Generate price impact based on type
  let priceImpact: number;
  if (type === 'positive') {
    priceImpact = 5 + Math.random() * 25; // +5% to +30%
  } else if (type === 'negative') {
    priceImpact = -(5 + Math.random() * 25); // -5% to -30%
  } else {
    priceImpact = (Math.random() - 0.5) * 10; // -5% to +5%
  }

  // Create news event
  const news: NewsEvent = {
    id: `news_${cryptoId}_${Date.now()}`,
    cryptoId,
    title: template.title,
    description: template.desc.replace('{name}', crypto.name),
    type,
    priceImpact,
    timestamp: Date.now(),
    expiresAt: Date.now() + 60000 * (2 + Math.random() * 3) // 2-5 minutes
  };

  // Add to active news
  activeNews.push(news);

  // Remove expired news
  activeNews = activeNews.filter(n => n.expiresAt > Date.now());

  return news;
};

// Get active news for a crypto
export const getActiveNews = (cryptoId?: CryptoId): NewsEvent[] => {
  const now = Date.now();
  activeNews = activeNews.filter(n => n.expiresAt > now);
  
  if (cryptoId) {
    return activeNews.filter(n => n.cryptoId === cryptoId);
  }
  return [...activeNews];
};

// Calculate price impact from all active news
export const getPriceImpact = (cryptoId: CryptoId): number => {
  const now = Date.now();
  activeNews = activeNews.filter(n => n.expiresAt > now);
  
  const relevantNews = activeNews.filter(n => n.cryptoId === cryptoId);
  if (relevantNews.length === 0) return 0;

  // Sum all price impacts (capped at ±50%)
  const totalImpact = relevantNews.reduce((sum, news) => sum + news.priceImpact, 0);
  return Math.max(-50, Math.min(50, totalImpact));
};

// Check for news events periodically (called from market service)
export const checkForNews = (): NewsEvent[] => {
  const newEvents: NewsEvent[] = [];
  
  Object.values(CryptoId).forEach(cryptoId => {
    const news = generateNewsEvent(cryptoId);
    if (news) {
      newEvents.push(news);
    }
  });

  return newEvents;
};
