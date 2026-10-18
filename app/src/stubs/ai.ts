// AI features are stubbed: no Claude API in this prototype.
// Each stub keeps the same shape as the web prototype's helper so a real call can replace it later.

export const AI_AVAILABLE = false;

/** Web prototype: aiTranslate(sample, text, language). Here it returns the text unchanged. */
export async function aiTranslate(text: string, _language: string): Promise<{ text: string; stub: true }> {
  return { text, stub: true };
}
