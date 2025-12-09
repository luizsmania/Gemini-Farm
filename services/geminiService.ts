
import { MarketTrend, Quest, MerchantOffer, CropId } from "../types";
import { CROPS, PRODUCTS } from "../constants";

// Market trend reasons
const MARKET_TREND_REASONS: Record<string, string[]> = {
  [CROPS[CropId.WHEAT].name]: [
    "Bakery chain needs bulk wheat!",
    "Bread shortage in the city!",
    "Wheat festival coming up!",
    "Millers are buying everything!",
    "Grain prices skyrocketing!"
  ],
  [CROPS[CropId.CORN].name]: [
    "Popcorn demand is booming!",
    "Corn maze season is here!",
    "Livestock farmers need feed!",
    "Corn syrup production spike!",
    "Harvest festival approaching!"
  ],
  [CROPS[CropId.CARROT].name]: [
    "Rabbit convention in town!",
    "Health food trend rising!",
    "Carrot cake competition!",
    "Vitamin A supplements needed!",
    "Gardeners buying in bulk!"
  ],
  [CROPS[CropId.TOMATO].name]: [
    "Pizza place expanding!",
    "Ketchup factory needs supply!",
    "Tomato sauce shortage!",
    "Italian restaurant opening!",
    "Summer salad season!"
  ],
  [CROPS[CropId.PUMPKIN].name]: [
    "Halloween is approaching!",
    "Pumpkin spice everything!",
    "Pie season is here!",
    "Carving contest coming up!",
    "Autumn festival needs pumpkins!"
  ],
  [CROPS[CropId.GEMINI_FRUIT].name]: [
    "Rare fruit collectors paying premium!",
    "Exotic fruit market booming!",
    "Luxury restaurant needs supply!",
    "Fruit auction happening soon!",
    "Celebrity chef wants these!"
  ]
};

export const fetchMarketTrend = async (currentCoins: number): Promise<MarketTrend | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const allCrops = Object.values(CROPS);
    const randomCrop = allCrops[Math.floor(Math.random() * allCrops.length)];
    const reasons = MARKET_TREND_REASONS[randomCrop.name] || ["High demand in the market!"];
    const randomReason = reasons[Math.floor(Math.random() * reasons.length)];
    
    // Multiplier between 1.5 and 4.0, with higher chance of moderate multipliers
    const rand = Math.random();
    let multiplier: number;
    if (rand < 0.3) {
      multiplier = 1.5 + Math.random() * 0.5; // 1.5-2.0 (30%)
    } else if (rand < 0.7) {
      multiplier = 2.0 + Math.random() * 1.0; // 2.0-3.0 (40%)
    } else {
      multiplier = 3.0 + Math.random() * 1.0; // 3.0-4.0 (30%)
    }
    multiplier = Math.round(multiplier * 10) / 10; // Round to 1 decimal

    return {
      cropId: randomCrop.id,
      multiplier,
      description: randomReason,
      expiresAt: Date.now() + 60000 * 2 // 2 minutes
    };
  } catch (error) {
    console.error("Failed to fetch market trend:", error);
    return null;
  }
};

// Quest titles and descriptions
const QUEST_TITLES: string[] = [
  "Local Order",
  "Town Request",
  "Market Demand",
  "Special Delivery",
  "Urgent Need",
  "Community Request",
  "Bulk Order",
  "Festival Supply"
];

const QUEST_DESCRIPTIONS: string[] = [
  "The town needs these crops quickly!",
  "A local merchant is looking for supplies.",
  "Market vendors are running low.",
  "A special event requires these items.",
  "Help the community with this request!",
  "A customer placed a large order.",
  "The bakery needs ingredients.",
  "Restaurant supply shortage!"
];

export const fetchQuest = async (level: number): Promise<Quest> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const availableCrops = Object.values(CROPS).filter(c => c.unlockLevel <= level);
  if (availableCrops.length === 0) {
    // Fallback if no crops available
    const defaultCrop = Object.values(CROPS)[0];
    return {
      id: Math.random().toString(36).substr(2, 9),
      title: "First Order",
      description: `Start by growing ${defaultCrop.name}!`,
      cropId: defaultCrop.id,
      targetAmount: 5,
      currentAmount: 0,
      rewardCoins: Math.floor(defaultCrop.baseSellPrice * 5 * 2.5),
      rewardXp: Math.floor(defaultCrop.xpReward * 5 * 1.5),
      expiresAt: Date.now() + 1000 * 60 * 3
    };
  }

  const targetCrop = availableCrops[Math.floor(Math.random() * availableCrops.length)];
  const amount = Math.floor(Math.random() * 15) + 5; // 5-20
  const title = QUEST_TITLES[Math.floor(Math.random() * QUEST_TITLES.length)];
  const description = QUEST_DESCRIPTIONS[Math.floor(Math.random() * QUEST_DESCRIPTIONS.length)];
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    title,
    description: `${description} They need ${amount} ${targetCrop.name}s.`,
    cropId: targetCrop.id,
    targetAmount: amount,
    currentAmount: 0,
    rewardCoins: Math.floor(targetCrop.baseSellPrice * amount * 2.5),
    rewardXp: Math.floor(targetCrop.xpReward * amount * 1.5),
    expiresAt: Date.now() + 1000 * 60 * 3 // 3 minutes
  };
};

// Merchant response templates
const MERCHANT_RESPONSES = {
  greedy: {
    accept: [
      "Fine, fine... I'll take it. But you're pushing it!",
      "Alright, you drive a hard bargain. Deal.",
      "Hmph. I suppose that works. Just this once.",
      "You're lucky I'm in a good mood. Accepted."
    ],
    reject: [
      "Absolutely not! That's way too much!",
      "You're out of your mind! No deal!",
      "I'd rather walk away than pay that!",
      "That's robbery! Get out of here!"
    ],
    counter: [
      "How about we meet in the middle?",
      "I can do a bit better, but not that much.",
      "Let's be reasonable here.",
      "I'll add a little more, but that's my limit."
    ]
  },
  desperate: {
    accept: [
      "Yes! Yes! I'll take anything!",
      "Please, I need this! Deal!",
      "Thank you so much! Accepted!",
      "You're a lifesaver! I accept!"
    ],
    reject: [
      "I... I can't afford that. Sorry.",
      "That's too much for me right now.",
      "I wish I could, but I can't.",
      "Maybe next time..."
    ],
    counter: [
      "Can you help me out a bit more?",
      "I'm really struggling here...",
      "Please, I need this badly!",
      "Any chance you could lower it?"
    ]
  },
  fancy: {
    accept: [
      "Splendid! A fair arrangement indeed.",
      "Excellent. I accept your terms.",
      "Very well, we have an agreement.",
      "Perfect. Let's proceed with the transaction."
    ],
    reject: [
      "I'm afraid that's quite unacceptable.",
      "That simply won't do, my dear.",
      "I must decline such an offer.",
      "That's far too extravagant, I'm afraid."
    ],
    counter: [
      "Perhaps we could find a middle ground?",
      "I'd be willing to negotiate slightly.",
      "Let's discuss a more reasonable price.",
      "I could offer a modest increase."
    ]
  }
};

// Extract price from user message
const extractPrice = (message: string, baseValue: number): number | null => {
  const numbers = message.match(/\d+/g);
  if (!numbers) return null;
  
  const num = parseInt(numbers[0]);
  // If number is reasonable (between 50% and 300% of base), use it
  if (num >= baseValue * 0.5 && num <= baseValue * 3) {
    return num;
  }
  return null;
};

// Check if message is polite
const isPolite = (message: string): boolean => {
  const politeWords = ['please', 'thank', 'appreciate', 'kind', 'help', 'sir', 'ma\'am'];
  const lower = message.toLowerCase();
  return politeWords.some(word => lower.includes(word));
};

export const negotiateTrade = async (
  offer: MerchantOffer, 
  userMessage: string, 
  chatHistory: string[]
): Promise<{ accepted: boolean; finalPrice: number; reply: string; mood: string }> => {
  // Simulate thinking time
  await new Promise(resolve => setTimeout(resolve, 800));

  const itemName = Object.values(CROPS).find(c => c.id === offer.wantedItem)?.name || 
                   Object.values(PRODUCTS).find(p => p.id === offer.wantedItem)?.name || "Item";
  
  const responses = MERCHANT_RESPONSES[offer.personality as keyof typeof MERCHANT_RESPONSES] || MERCHANT_RESPONSES.greedy;
  const userPrice = extractPrice(userMessage, offer.baseValue);
  const polite = isPolite(userMessage);
  
  // Check for accept keywords
  const acceptKeywords = ['accept', 'deal', 'yes', 'ok', 'sure', 'agreed'];
  const lowerMessage = userMessage.toLowerCase();
  if (acceptKeywords.some(keyword => lowerMessage.includes(keyword)) && !userPrice) {
    return {
      accepted: true,
      finalPrice: offer.baseValue,
      reply: responses.accept[Math.floor(Math.random() * responses.accept.length)],
      mood: "happy"
    };
  }

  // If user specified a price
  if (userPrice) {
    const ratio = userPrice / offer.baseValue;
    
    // If asking for more than 2x, reject
    if (ratio > 2.0) {
      return {
        accepted: false,
        finalPrice: offer.baseValue,
        reply: responses.reject[Math.floor(Math.random() * responses.reject.length)],
        mood: "angry"
      };
    }
    
    // If asking for 1.5x-2x, counter offer
    if (ratio > 1.5) {
      const counterPrice = Math.floor(offer.baseValue * 1.2);
      return {
        accepted: false,
        finalPrice: counterPrice,
        reply: `${responses.counter[Math.floor(Math.random() * responses.counter.length)]} I can offer ${counterPrice} coins.`,
        mood: "neutral"
      };
    }
    
    // If reasonable (1.0-1.5x), accept
    if (ratio >= 1.0) {
      return {
        accepted: true,
        finalPrice: userPrice,
        reply: responses.accept[Math.floor(Math.random() * responses.accept.length)],
        mood: polite ? "happy" : "neutral"
      };
    }
    
    // If less than base, accept immediately (good deal for merchant)
    return {
      accepted: true,
      finalPrice: userPrice,
      reply: responses.accept[Math.floor(Math.random() * responses.accept.length)],
      mood: "happy"
    };
  }

  // Default: counter offer if polite, reject if not
  if (polite) {
    const counterPrice = Math.floor(offer.baseValue * 1.15);
    return {
      accepted: false,
      finalPrice: counterPrice,
      reply: `${responses.counter[Math.floor(Math.random() * responses.counter.length)]} How about ${counterPrice} coins?`,
      mood: "neutral"
    };
  }

  // Default response
  return {
    accepted: false,
    finalPrice: offer.baseValue,
    reply: `I'm offering ${offer.baseValue} coins for ${offer.amount} ${itemName}s. Take it or leave it.`,
    mood: "neutral"
  };
};
