// ─────────────────────────────────────────────
//  ApplyOnce AI – Gemini Prompt Templates
// ─────────────────────────────────────────────

/**
 * Prompt for parsing a resume into structured JSON.
 * Returns ONLY valid JSON — no markdown, no explanation.
 */
export const RESUME_PARSE_PROMPT = (resumeText: string): string => `
You are a professional resume parser. Extract all information from the resume text below and return ONLY a valid JSON object.

RULES:
- Return ONLY raw JSON. No markdown code blocks, no explanation, no extra text.
- If a field is missing, use an empty string "" or empty array [].
- Extract all skills as a flat string array.
- For dates, use "Month Year" format where possible (e.g., "Jan 2022").
- Keep descriptions concise but informative.

REQUIRED JSON SCHEMA (return exactly this structure):
{
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "website": "",
    "linkedin": "",
    "github": "",
    "summary": ""
  },
  "education": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "startDate": "",
      "endDate": "",
      "gpa": "",
      "description": ""
    }
  ],
  "experience": [
    {
      "company": "",
      "title": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "description": "",
      "highlights": []
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "url": "",
      "technologies": [],
      "startDate": "",
      "endDate": ""
    }
  ],
  "skills": [],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "date": "",
      "url": ""
    }
  ],
  "links": {
    "linkedin": "",
    "github": "",
    "portfolio": "",
    "twitter": ""
  },
  "resumeText": ""
}

RESUME TEXT:
${resumeText}

Return ONLY the JSON object.
`;

/**
 * Prompt for generating an autofill mapping from profile + form fields.
 * Returns ONLY a JSON object mapping fieldName → value.
 */
export const AUTOFILL_MAPPING_PROMPT = (
  profileJson: string,
  fieldsJson: string
): string => `
You are an intelligent job application form filler. Given the user's profile and a list of form fields, return a JSON object mapping each field's name/id to the best matching value from the profile.

RULES:
- Return ONLY raw JSON. No markdown, no explanation, no extra text.
- Use the field's name or id as the key.
- Match fields intelligently — e.g., "first_name" → personalInfo.name.split()[0]
- For selects/dropdowns, match the value to the closest available option.
- For checkboxes (e.g., "I agree to terms"), use "true".
- If a field has no relevant match, use an empty string "".
- Never invent information not present in the profile.
- Format phone numbers appropriately.
- For LinkedIn/GitHub URLs, include the full URL.

USER PROFILE:
${profileJson}

FORM FIELDS (array of {id, name, type, label, placeholder, ariaLabel, options}):
${fieldsJson}

Return ONLY a JSON object like:
{
  "fieldName_or_id": "value",
  ...
}
`;
