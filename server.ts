const response = await ai.models.generateContent({
  model: "gemini-3.5-flash",
  contents: [
    {
      role: "user",
      parts: parts
    }
  ],
  config: {
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        success: { type: SchemaType.BOOLEAN },
        companyInfo: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING },
            address: { type: SchemaType.STRING },
            representative: { type: SchemaType.STRING }
          },
          required: ["name", "address", "representative"]
        },
        documents: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              title: { type: SchemaType.STRING },
              content: { type: SchemaType.STRING }
            },
            required: ["id", "title", "content"]
          }
        },
        detectedPlaceholders: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              key: { type: SchemaType.STRING },
              label: { type: SchemaType.STRING }
            },
            required: ["key", "label"]
          }
        }
      },
      required: ["success", "companyInfo", "documents", "detectedPlaceholders"]
    }
  }
});
