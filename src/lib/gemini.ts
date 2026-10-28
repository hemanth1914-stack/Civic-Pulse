import { getAuthorityForCategory } from './authorities';

export interface IssueForEscalation {
  id?: string;
  category: string;
  areaName: string;
  zone?: string;
  landmark?: string;
  streetDetail?: string;
  description: string;
  repostCount?: number;
  lat?: number;
  lng?: number;
}

/**
 * Calls the Gemini API (gemini-2.5-flash) to generate a formal civic escalation email.
 * Includes a realistic deterministic fallback if the API key is not yet configured.
 */
export async function draftEscalationEmail(issue: IssueForEscalation): Promise<string> {
  const activeZone = issue.zone || issue.areaName;
  const authority = getAuthorityForCategory(issue.category, activeZone);
  const supportCount = issue.repostCount ?? 0;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const addressLine = [issue.streetDetail, issue.landmark, activeZone].filter(Boolean).join(', ');

  const prompt = `You are writing a formal civic escalation email on behalf of a resident and the local community to a municipal authority.

Details of the civic issue:
- Recipient Authority: ${authority.authorityName}
- Issue Category: ${issue.category}
- Administrative Zone: ${activeZone}
${issue.landmark ? `- Landmark: ${issue.landmark}` : ''}
${issue.streetDetail ? `- Street Detail: ${issue.streetDetail}` : ''}
- Full Location: ${addressLine}
- Issue Description: ${issue.description}
- Community Support: ${supportCount} neighbor(s) have supported / reposted this unresolved issue.
${issue.lat && issue.lng ? `- GPS Coordinates: ${issue.lat.toFixed(5)}, ${issue.lng.toFixed(5)}` : ''}

Write a short, formal, firm, but polite escalation email from a concerned citizen to ${authority.authorityName}.
Refer to the issue category, zone, landmark, exact description, and how many local citizens have supported this complaint.
Request a clear, scheduled resolution or inspection within a specific timeframe (e.g., within 48 to 72 hours).
Include a clear Subject line and Body. Return ONLY the plain text email. Do not use Markdown code fences or asterisks.`;

  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 800,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText && generatedText.trim().length > 0) {
          return generatedText.trim();
        }
      } else {
        console.warn('Gemini API call failed with status:', response.status, await response.text());
      }
    } catch (error) {
      console.warn('Error calling Gemini API, using local generator fallback:', error);
    }
  }

  // Graceful realistic fallback if Gemini key is not configured or network call fails
  const coordsNote = issue.lat && issue.lng ? ` (GPS: ${issue.lat.toFixed(5)}, ${issue.lng.toFixed(5)})` : '';
  const citizenCount = supportCount > 0 ? `${supportCount + 1} residents` : 'local residents';
  const locationSummary = issue.landmark ? `${activeZone} (near ${issue.landmark})` : activeZone;

  return `Subject: URGENT ESCALATION: Unresolved ${issue.category} Issue at ${locationSummary}

To:
The Executive Engineer / Nodal Officer,
${authority.authorityName}
Bangalore, Karnataka

Respected Sir/Madam,

I am writing to formally escalate an unresolved civic grievance regarding ${issue.category.toLowerCase()} in ${addressLine}${coordsNote}.

Issue Details:
"${issue.description}"

This issue has remained unaddressed and continues to cause serious inconvenience and potential safety hazards to the public. To date, ${citizenCount} in our neighborhood have flagged and supported this report through the CivicPulse community network.

Given the public interest and urgency of this matter, we respectfully request that your division inspect the site and initiate corrective action within 48 hours. Please confirm receipt of this escalation and share the complaint tracking number.

Thank you for your prompt attention to public health and safety.

Sincerely,
Concerned Resident & Neighborhood Community
Administrative Zone: ${activeZone}
Reported via CivicPulse Platform`;
}
