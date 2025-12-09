import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";
import { AnalysisResult, SecuritySeverity, FireSensitivity } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the response schema for structured output
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    detectedEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Category: 'Fire', 'Drone', 'Human', 'Object', or 'Other'" },
          description: { type: Type.STRING, description: "Short, tactical description of the event" },
          severity: { 
            type: Type.STRING, 
            enum: [SecuritySeverity.SAFE, SecuritySeverity.LOW, SecuritySeverity.MEDIUM, SecuritySeverity.HIGH, SecuritySeverity.CRITICAL],
            description: "Threat level"
          },
          box_2d: {
            type: Type.ARRAY,
            description: "Bounding box [ymin, xmin, ymax, xmax] using 0-1000 scale.",
            items: { type: Type.INTEGER }
          }
        },
        required: ["category", "description", "severity"],
      },
    },
    summary: { type: Type.STRING, description: "Tactical summary of the frame." },
  },
  required: ["detectedEvents", "summary"],
};

export const analyzeFrame = async (base64Image: string, fireSensitivity: FireSensitivity = 'MEDIUM'): Promise<AnalysisResult> => {
  try {
    // Construct dynamic prompt based on sensitivity
    let sensitivityInstruction = `Current Fire/Smoke Detection Sensitivity: ${fireSensitivity}.\n`;
    
    if (fireSensitivity === 'CRITICAL') {
      sensitivityInstruction += "CRITICAL MODE: Report ANY haze, smoke, spark, or orange glow immediately as a high-threat event. Better false positive than missed detection.";
    } else if (fireSensitivity === 'HIGH') {
      sensitivityInstruction += "HIGH MODE: Detect early signs of fire, smoke, or electrical sparks.";
    } else if (fireSensitivity === 'MEDIUM') {
      sensitivityInstruction += "STANDARD MODE: Report confirmed fire or distinct smoke.";
    } else {
      sensitivityInstruction += "LOW MODE: Only report large, dangerous fires.";
    }

    sensitivityInstruction += "\nCheck aggressively for DRONES or aerial surveillance devices. Return bounding boxes for ALL detected threats.";

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: `Analyze this surveillance frame.\n${sensitivityInstruction}`,
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1, // Lower temperature for more robotic/precise detection
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const data = JSON.parse(text);
    
    // Enrich with timestamp
    const enrichedEvents = (data.detectedEvents || []).map((evt: any) => ({
      ...evt,
      timestamp: new Date().toLocaleTimeString(),
    }));

    // If no events returned but not explicitly safe, ensure it's safe
    if (enrichedEvents.length === 0) {
      enrichedEvents.push({
        category: "None",
        description: "Area secure. No threats detected.",
        severity: SecuritySeverity.SAFE,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    return {
      detectedEvents: enrichedEvents,
      summary: data.summary || "Scan complete.",
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      detectedEvents: [{
        category: "System",
        description: "Sensor Malfunction: API Unreachable.",
        severity: SecuritySeverity.LOW,
        timestamp: new Date().toLocaleTimeString()
      }],
      summary: "System offline.",
    };
  }
};