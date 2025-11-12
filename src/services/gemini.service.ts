import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private genAI: GoogleGenAI | null = null;
  private currentApiKey = signal<string>('');

  constructor() {
    // Try to load from localStorage first
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedKey = localStorage.getItem('geminiApiKey');
      if (savedKey) {
        this.setApiKey(savedKey);
      }
    }
  }

  setApiKey(apiKey: string): void {
    if (!apiKey || !apiKey.trim()) {
      this.genAI = null;
      this.currentApiKey.set('');
      return;
    }

    try {
      this.genAI = new GoogleGenAI({ apiKey: apiKey.trim() });
      this.currentApiKey.set(apiKey.trim());

      // Save to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('geminiApiKey', apiKey.trim());
      }
    } catch (error) {
      console.error('Failed to initialize Gemini API:', error);
      this.genAI = null;
      this.currentApiKey.set('');
      throw new Error('Invalid Gemini API key');
    }
  }

  getApiKey(): string {
    return this.currentApiKey();
  }

  hasValidApiKey(): boolean {
    return this.genAI !== null && this.currentApiKey().length > 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private parseError(error: any): { isRateLimit: boolean, message: string } {
    let isRateLimit = false;
    let message = 'Could not generate download options.';
    
    // The error from the SDK might have a JSON string in its message property
    if (error instanceof Error && error.message) {
      try {
        const errorObj = JSON.parse(error.message);
        if (errorObj?.error?.message) {
            message = errorObj.error.message;
        }
        if (errorObj?.error?.code === 429) {
          isRateLimit = true;
        }
      } catch (e) {
        // Not a JSON error message, use the original message if it's not empty
        if (error.message.trim()) {
          message = error.message;
        }
      }
    }
    return { isRateLimit, message };
  }

  async generateSummary(videoDetails: any, preferredQuality: string = 'Best Available'): Promise<string> {
    
    let qualityInstruction = `Provide 5-6 options with different high resolutions (e.g., 8K, 4K, 1440p, 1080p, 720p) and formats (e.g., MP4, WebM).`;
    if (preferredQuality !== 'Best Available') {
      qualityInstruction = `Prioritize generating a fictional download link for ${preferredQuality} resolution. Also include a few other high-resolution options like 8K, 4K, 1440p, and 1080p.`;
    }

    const prompt = `
      Generate a list of fictional download stream links for the following YouTube video. 
      ${qualityInstruction}
      The links should be illustrative and not real. Start each link with "https://fictional-stream-link.com/".

      Video Title: ${videoDetails.snippet.title}
      Video ID: ${videoDetails.id}
    `;

    const maxRetries = 3;
    let attempt = 0;
    let backoff = 2000; // Start with 2 seconds

    while (attempt < maxRetries) {
      try {
        const response: GenerateContentResponse = await this.genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        
        return response.text.trim();
      } catch (error) {
        attempt++;
        const { isRateLimit, message } = this.parseError(error);
        
        console.error(`Gemini API Error (Attempt ${attempt}/${maxRetries}): ${message}`, error);

        if (isRateLimit && attempt < maxRetries) {
          console.log(`Rate limit exceeded. Retrying in ${backoff / 1000} seconds...`);
          await this.sleep(backoff);
          backoff *= 2; // Exponential backoff
        } else {
          // For other errors or if max retries are reached
          throw new Error(message);
        }
      }
    }
    
    // This line is for TypeScript's benefit and should not be reached in practice.
    throw new Error('Failed to generate summary after multiple retries.');
  }
}
