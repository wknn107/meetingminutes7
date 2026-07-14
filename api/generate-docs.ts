const apiKey = process.env.GEMINI_API_KEY;

const form = new FormData();
form.append("file", fileBuffer, fileName);

const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  }
);

const result = await response.json();
