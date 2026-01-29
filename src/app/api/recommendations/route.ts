import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getCachedConferences } from '@/lib/cache';
import { Conference } from '@/types/conference';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { interests, bio, location } = body;

    if (!interests && !bio) {
      return NextResponse.json(
        { error: 'Please provide interests or a bio.' },
        { status: 400 }
      );
    }

    // 1. Get Data
    const data = await getCachedConferences();
    const allConferences = Object.values(data.months).flat();

    // 2. Pre-filter to reduce context size (Naive retrieval)
    // We prioritize upcoming conferences and those matching keywords roughly
    const keywords = (interests || '').toLowerCase().split(/[\s,]+/).filter((k: string) => k.length > 0);
    
    const candidates = allConferences.filter(c => {
      const text = `${c.name} ${c.domain} ${c.tags?.join(' ')} ${c.location.raw}`.toLowerCase();
      return keywords.some((k: string) => text.includes(k)) || 
             (location && c.location.country.toLowerCase().includes(location.toLowerCase()));
    }).slice(0, 30); // Limit to 30 candidates to save tokens

    if (candidates.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    // 3. Construct Prompt
    const prompt = `
      You are an expert conference scout. 
      User Profile:
      - Interests: ${interests}
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
      Identify the top 3 conferences for this user.
      For each, provide a "reason" (1 sentence) connecting the user's profile to the conference.
      
      Return strictly a JSON object with a single key "recommendations" containing an array of objects with keys: "id", "reason".
      Example: { "recommendations": [{"id": "123", "reason": "Matches your interest in AI..."}] }
    `;

    // 4. Call Groq
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
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