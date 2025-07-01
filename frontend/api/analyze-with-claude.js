// Filename: frontend/api/analyze-with-claude.js

// This line imports the official Anthropic SDK for Node.js
// Make sure this dependency is listed in your frontend/package.json
const Anthropic = require('@anthropic-ai/sdk');

// Vercel automatically makes environment variables (like CLAUDE_API_KEY)
// available here when you add them in the project settings dashboard.
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// IMPORTANT: This check ensures that the API key is actually available when the function runs.
// If it's missing, the function will stop and log an error.
if (!CLAUDE_API_KEY) {
    throw new Error("CLAUDE_API_KEY is not set. Please add it to Vercel environment variables.");
}

// Initialize the Anthropic client with your API key
const anthropic = new Anthropic({ apiKey: CLAUDE_API_KEY });

// This is the main function that Vercel's serverless environment will execute
// when your frontend makes a POST request to /api/analyze-with-claude
module.exports = async (req, res) => {
    // Vercel's serverless environment automatically handles parsing the request body (req.body)
    // and setting CORS headers for you for standard cases.
    const { bulkData, companyName, pillars } = req.body;

    // Basic validation: ensure bulkData is provided
    if (!bulkData) {
        return res.status(400).json({ error: 'Bulk data is required.' });
    }

    try {
        // This is the detailed instruction (prompt) we give to Claude.
        // It's crucial for getting good, structured results.
        const prompt = `You are an expert investment readiness assessor for Barka, specializing in evaluating companies across Financial, Business Strategy, Legal & Operations, People & Communication, and Impact pillars.
Your task is to analyze the provided company information and assign a score from 1 to 5 for each subcategory within these pillars. For each score, you must also extract a concise, direct piece of supporting evidence from the text.

Here are the pillars and their subcategories with brief descriptions and keywords. The scores mean:
1: Absent/Too Early
2: Basic/Too Early
3: Developing/Near Ready
4: Well-Developed/Investment Ready
5: Optimized/Best Practice

Company Name: ${companyName || 'Unknown Company'}

Pillars and Subcategories:
${pillars.map((p) => `
**${p.name} (Weight: ${p.weight * 100}%)**
${p.subcategories.map((s, sIdx) => `  - ${s.name} (Weight: ${s.weight * 100}%): Focus on aspects related to "${s.keywords.join(', ')}".`).join('\n')}
`).join('\n')}

Company Information to Analyze:
---
${bulkData}
---

Your output MUST be a JSON object with the following structure:
{
  "companyName": "Extracted Company Name (if found, otherwise use 'Unknown Company')",
  "subcategoryScoresAndEvidence": {
    "pillarIndex-subIndex": {
      "score": [1-5 integer],
      "evidence": "Concise sentence or phrase directly from the provided text supporting the score."
    },
    // ... for all subcategories, e.g., "0-0", "0-1", "1-0", etc.
    // Ensure all subcategories defined above are present in the output, even if score is 1.
  }
}

Ensure the evidence is a direct quote or a very close paraphrase from the input text, not your own summary. If no clear evidence is found for a subcategory, provide a score of 1 and evidence as "No direct evidence found in the provided text."
Double-check that all subcategories are present in your JSON output.`;

        // Make the API call to Claude
        const msg = await anthropic.messages.create({
            model: "claude-3-opus-20240229", // You can try "claude-3-sonnet-20240229" or "claude-3-haiku-20240307" for potentially lower cost/faster responses.
            max_tokens: 4000, // Maximum number of tokens Claude's response can be. Adjust if your outputs are getting cut off.
            temperature: 0.2, // Lower temperature means more deterministic, factual responses (good for structured data extraction).
            system: "You are an expert investment readiness assessor.", // Role for Claude
            messages: [{ role: "user", content: prompt }], // The actual prompt
        });

        const claudeResponseContent = msg.content[0].text; // Get the text content from Claude's response
        console.log("Claude raw response:", claudeResponseContent); // Log for debugging on Vercel

        let claudeAnalysis;
        try {
            // Claude sometimes wraps JSON in markdown code blocks (```json ... ```)
            // This regex removes those wraps to allow proper JSON parsing.
            const jsonString = claudeResponseContent.replace(/```json\n|```/g, '').trim();
            claudeAnalysis = JSON.parse(jsonString); // Parse the string into a JavaScript object
        } catch (parseError) {
            console.error("Failed to parse Claude's JSON response:", parseError);
            // If Claude doesn't return valid JSON, throw an error to indicate failure.
            throw new Error("Claude did not return a valid JSON format. Raw response (partial): " + claudeResponseContent.substring(0, 500) + "...");
        }

        // Send the parsed JSON analysis back to the frontend
        res.status(200).json(claudeAnalysis);

    } catch (error) {
        // If any error occurs during the process (API call, parsing),
        // log it and send a 500 status code with an error message to the frontend.
        console.error('Error in analyze-with-claude function:', error.message);
        res.status(500).json({ error: 'Failed to analyze data with Claude: ' + error.message });
    }
};