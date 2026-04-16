import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateOperaArticle = async (topic: string, category: string) => {
  const prompt = `Write a high-quality, professional article for Opera News Hub about: ${topic}. 
  Category: ${category}.
  
  Guidelines for Opera News Hub (STRICT ADHERENCE):
  1. Title must be catchy but NOT clickbait. No excessive punctuation.
  2. Content must be original, informative, and provide value.
  3. No fake news, hate speech, or sexually explicit content.
  4. Use clear headings and short paragraphs.
  5. Minimum 300 words.
  6. Tone: Professional and Engaging.
  
  Format the output in Markdown with a clear Title heading, Introduction, Body (with subheadings), and Conclusion.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
};

export const generateEbook = async (topic: string, publisher: string, author: string, type: 'story' | 'educational') => {
  const prompt = `Generate a professional ${type} eBook.
  Topic/Story Seed: ${topic}
  Publisher: ${publisher}
  Author: ${author}
  
  Please provide the full structure in Markdown:
  1. Cover Page detail (Title, Author, Publisher)
  2. Copyright Page (Professional copyright notice with ${publisher})
  3. Table of Contents
  4. Introduction
  5. Chapter 1: [Title]
  6. Chapter 2: [Title]
  7. Chapter 3: [Title]
  
  Content should be detailed and professional. Make it look like a real eBook.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
  });

  return response.text;
};

export const generateArticleImage = async (articleTitle: string, articleExerpt: string) => {
  const prompt = `A professional, realistic editorial illustration or high-quality photograph for a news article titled: "${articleTitle}". 
  Context: ${articleExerpt.slice(0, 500)}. 
  The style should be photorealistic or modern digital journalism style. No text in the image.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};
