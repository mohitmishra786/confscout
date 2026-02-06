import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { getCachedConferences } from '@/lib/cache';

const MAX_CANDIDATES = 30;
const MODEL_NAME = 'llama-3.3-70b-versatile';
const TEMPERATURE = 0.5;
const RECOMMENDATION_COUNT = 3;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const requestSchema = z.object({
  interests: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
}).refine(data => data.interests || data.bio, {
  message: "Either interests or bio must be provided",
  path: ["interests"],
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = requestSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { interests, bio, location } = parseResult.data;

    // 1. Get Data
    const data = await getCachedConferences();
    const allConferences = Object.values(data.months).flat();

    // 2. Pre-filter to reduce context size (Naive retrieval)
    // We prioritize upcoming conferences and those matching keywords roughly
    let keywords = (interests || '').toLowerCase().split(/[\s,]+/).filter((k: string) => k.length > 0);
    
    // Fallback: Seed keywords from bio if interests are empty
    if (keywords.length === 0 && bio) {
      keywords = bio.toLowerCase().split(/[\s,]+/).filter((k: string) => k.length > 3); // Simple tokenization
    }

    const candidates = allConferences.filter(c => {
      // If no keywords (and no bio tokens), we rely on location or return broad set
      if (keywords.length === 0) {
        if (location) {
           return c.location.country.toLowerCase().includes(location.toLowerCase());
        }
        return true; // No filters, return everything (will be sliced)
      }

      const text = `${c.name} ${c.domain} ${c.tags?.join(' ')} ${c.location.raw}`.toLowerCase();
      return keywords.some((k: string) => text.includes(k)) || 
             (location && c.location.country.toLowerCase().includes(location.toLowerCase()));
    }).slice(0, MAX_CANDIDATES); // Limit to MAX_CANDIDATES candidates to save tokens

    if (candidates.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    // 3. Construct Prompt
    const prompt = `
      You are an expert conference scout. 
      User Profile:
      - Interests: ${interests || 'N/A'}
      - Bio: ${bio || 'N/A'}
      - Preferred Location: ${location || 'Any'}

      Candidate Conferences (JSON):
      ${JSON.stringify(candidates.map(c => ({ 
        id: c.id, 
        name: c.name, 
        date: c.startDate, 
        location: c.location.raw, 
        domain: c.domain,
        tags: c.tags 
      })))}

      Task:
      Identify the top ${RECOMMENDATION_COUNT} conferences for this user.
      For each, provide a "reason" (1 sentence) connecting the user's profile to the conference.
      
      Return strictly a JSON object with a single key "recommendations" containing an array of objects with keys: "id", "reason".
      Example: { "recommendations": [{"id": "123", "reason": "Matches your interest in AI..."}] }
    `;

    // 4. Call Groq
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL_NAME,
      temperature: TEMPERATURE,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');
    
    // console.log('Groq Response:', content);

    const result = JSON.parse(content);
    const recommendations = result.recommendations || result.items || result.conferences || (Array.isArray(result) ? result : []);

    // 5. Merge back with full data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalRecs = (Array.isArray(recommendations) ? recommendations : []).map((rec: any) => {
      const original = candidates.find(c => c.id === rec.id);
      return { ...original, recommendationReason: rec.reason };
    }).filter(x => x.id); // Filter out any hallucinated IDs

    return NextResponse.json({ recommendations: finalRecs });

  } catch (error) {
    console.error('AI Recommendation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}