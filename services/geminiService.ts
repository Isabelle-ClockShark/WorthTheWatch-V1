
import { GoogleGenAI, Type } from "@google/genai";
import { CombinedMediaProgress, Recommendation, DailyRelease } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function getAiRecommendations(
  userLibrary: CombinedMediaProgress[], 
  declinedTitles: string[] = []
): Promise<Recommendation[]> {
  const ai = getAI();
  
  const historyString = userLibrary.map(item => 
    `${item.title} (${item.type}) - ${item.progressData.status}, Rating: ${item.progressData.userRating || 'N/A'}, Genres: ${item.genre.join(', ')}`
  ).join('\n');

  const declinedString = declinedTitles.length > 0 
    ? `\nIMPORTANT: The user has previously declined or expressed disinterest in the following titles, so DO NOT recommend them and avoid similar patterns if they were poor matches: ${declinedTitles.join(', ')}`
    : '';

  const prompt = `Based on the following user movie and TV watch history, recommend 5 new titles that they haven't watched yet. Provide deep reasoning for each recommendation based on their tastes shown in the history.
  
  User History:
  ${historyString}
  ${declinedString}
  
  Format the output strictly as a JSON array of objects.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING, description: 'movie or tv' },
              reasoning: { type: Type.STRING },
              year: { type: Type.NUMBER },
              genre: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "type", "reasoning", "year", "genre"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Recommendation Error:", error);
    return [];
  }
}

export async function getHolidayRecommendations(holiday: string): Promise<Recommendation[]> {
  const ai = getAI();
  const prompt = `Suggest 4 highly-rated movies or TV shows that are perfect for the ${holiday} holiday or season. For each, explain briefly why it fits the ${holiday} vibe.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              year: { type: Type.NUMBER },
              genre: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "type", "reasoning", "year", "genre"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Holiday Rec Error:", error);
    return [];
  }
}

export async function getDailyReleases(): Promise<{releases: DailyRelease[], sources: any[]}> {
  const ai = getAI();
  const today = new Date().toLocaleDateString();
  const prompt = `Identify major new movie and TV show releases for:
  1. Today: ${today} (label as 'today')
  2. The current week (label as 'this_week')
  3. The remainder of this current month (label as 'this_month')
  
  Include platform (Netflix, HBO Max, Disney+, Hulu, Cinema, etc). Focus on quality and highly anticipated titles.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            releases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  description: { type: Type.STRING },
                  releaseTiming: { type: Type.STRING, enum: ['today', 'this_week', 'this_month'] }
                },
                required: ["title", "type", "platform", "description", "releaseTiming"]
              }
            }
          }
        }
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const data = JSON.parse(response.text || '{"releases": []}');
    return { releases: data.releases, sources };
  } catch (error) {
    console.error("Daily Release Error:", error);
    return { releases: [], sources: [] };
  }
}

export async function getWeatherWatchPlan(weather: string, temp: number): Promise<string> {
    const ai = getAI();
    const prompt = `The current weather is ${weather} with a temperature of ${temp}°F. Give a short, witty, 1-sentence movie-watching recommendation based on this weather (e.g., 'It's rainy, perfect for a long psychological thriller').`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "Perfect day for some entertainment.";
    } catch (e) {
        return "Grab some popcorn and enjoy!";
    }
}

export async function searchNewMedia(query: string): Promise<any[]> {
    const ai = getAI();
    const prompt = `Search for media matching the query: "${query}". Provide a list of 5 movies or TV shows with metadata. Output as JSON.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            type: { type: Type.STRING },
                            year: { type: Type.NUMBER },
                            genre: { type: Type.ARRAY, items: { type: Type.STRING } },
                            description: { type: Type.STRING },
                            posterPath: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error(e);
        return [];
    }
}
