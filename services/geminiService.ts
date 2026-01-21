
import { GoogleGenAI, Type } from "@google/genai";
import { MedicineOrigin } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const fetchMedicineOrigin = async (medicineName: string): Promise<MedicineOrigin> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Provide detailed historical and geographical origin information for the medicine: ${medicineName}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          country: { type: Type.STRING },
          countryCode: { type: Type.STRING, description: "ISO 3166-1 alpha-3 code (e.g., GBR, USA, DEU)" },
          city: { type: Type.STRING },
          discoveryYear: { type: Type.STRING },
          discoverer: { type: Type.STRING },
          briefHistory: { type: Type.STRING },
          coordinates: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["lat", "lng"]
          },
          classification: { type: Type.STRING },
          funFact: { type: Type.STRING }
        },
        required: ["name", "country", "countryCode", "discoveryYear", "discoverer", "briefHistory", "coordinates", "classification", "funFact"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as MedicineOrigin;
};
