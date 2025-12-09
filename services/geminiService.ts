
import { GoogleGenAI, Type } from "@google/genai";
import { CropId, MarketTrend, Quest, MerchantOffer } from "../types";
import { CROPS, PRODUCTS } from "../constants";

const cropNames = Object.values(CROPS).map(c => c.name).join(', ');

export const fetchMarketTrend = async (currentCoins: number): Promise<MarketTrend | null> => {
  if (!process.env.API_KEY) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Pick ONE crop from: ${cropNames}. Invent a short funny 10-word reason why it's trending. Multiplier between 1.5 and 4.0. Output JSON only.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cropName: { type: Type.STRING },
            reason: { type: Type.STRING },
            multiplier: { type: Type.NUMBER },
          },
          required: ["cropName", "reason", "multiplier"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const targetCrop = Object.values(CROPS).find(c => c.name.toLowerCase() === data.cropName?.toLowerCase());
    if (!targetCrop) return null;

    return {
      cropId: targetCrop.id,
      multiplier: data.multiplier || 1.5,
      description: data.reason || "High demand!",
      expiresAt: Date.now() + 60000 * 2
    };
  } catch (error) {
    console.error("Failed to fetch market trend:", error);
    return null;
  }
};

// Fallback generator if AI fails
const generateFallbackQuest = (level: number): Quest => {
    const availableCrops = Object.values(CROPS).filter(c => c.unlockLevel <= level);
    const targetCrop = availableCrops[Math.floor(Math.random() * availableCrops.length)];
    const amount = Math.floor(Math.random() * 15) + 5;
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      title: "Local Order",
      description: `The town needs ${amount} ${targetCrop.name}s quickly!`,
      cropId: targetCrop.id,
      targetAmount: amount,
      currentAmount: 0,
      rewardCoins: Math.floor(targetCrop.baseSellPrice * amount * 2.5),
      rewardXp: Math.floor(targetCrop.xpReward * amount * 1.5),
      expiresAt: Date.now() + 1000 * 60 * 3
    };
};

export const fetchQuest = async (level: number): Promise<Quest> => {
  // If no API key, immediately return fallback
  if (!process.env.API_KEY) return generateFallbackQuest(level);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const availableCrops = Object.values(CROPS).filter(c => c.unlockLevel <= level);
    const availableCropNames = availableCrops.map(c => c.name).join(', ');

    const prompt = `Generate a farming quest. Crops: ${availableCropNames}. Pick one, amount 5-20. Short title. Output JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            cropName: { type: Type.STRING },
            amount: { type: Type.NUMBER },
          },
          required: ["title", "description", "cropName", "amount"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const targetCrop = availableCrops.find(c => c.name.toLowerCase() === data.cropName?.toLowerCase()) || availableCrops[0];
    const coinReward = Math.floor(targetCrop.baseSellPrice * data.amount * 2.5);
    const xpReward = Math.floor(targetCrop.xpReward * data.amount * 1.5);

    return {
      id: Math.random().toString(36).substr(2, 9),
      title: data.title || "Order",
      description: data.description || "Need crops.",
      cropId: targetCrop.id,
      targetAmount: data.amount || 5,
      currentAmount: 0,
      rewardCoins: coinReward,
      rewardXp: xpReward,
      expiresAt: Date.now() + 1000 * 60 * 3
    };
  } catch (e) {
    console.warn("AI Quest failed, using fallback", e);
    return generateFallbackQuest(level);
  }
};

export const negotiateTrade = async (
  offer: MerchantOffer, 
  userMessage: string, 
  chatHistory: string[]
): Promise<{ accepted: boolean; finalPrice: number; reply: string; mood: string }> => {
  if (!process.env.API_KEY) return { accepted: false, finalPrice: 0, reply: "I lost my voice...", mood: "neutral" };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const itemName = Object.values(CROPS).find(c => c.id === offer.wantedItem)?.name || 
                     Object.values(PRODUCTS).find(p => p.id === offer.wantedItem)?.name || "Item";

    const prompt = `
      You are ${offer.merchantName}, a ${offer.personality} merchant.
      You want to buy ${offer.amount} ${itemName}s from the player.
      Base value total: ${offer.baseValue}.
      
      Conversation history:
      ${chatHistory.join('\n')}
      Player says: "${userMessage}"

      Decide if you accept the deal. 
      If player asks for > 2x value, reject angrily.
      If player is polite or persuasive, be nicer.
      
      Output JSON only.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            dealAccepted: { type: Type.BOOLEAN },
            finalAgreedPrice: { type: Type.NUMBER },
            mood: { type: Type.STRING }
          },
          required: ["reply", "dealAccepted", "finalAgreedPrice", "mood"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    return {
      accepted: data.dealAccepted,
      finalPrice: data.finalAgreedPrice || offer.baseValue,
      reply: data.reply,
      mood: data.mood
    };

  } catch (e) {
    return { accepted: false, finalPrice: 0, reply: "Let's stick to the original price.", mood: "neutral" };
  }
};
