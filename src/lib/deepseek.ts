export async function askDeepSeek(message: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a helpful customer support assistant.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  const data = await res.json();
  return data.choices[0].message.content;
}