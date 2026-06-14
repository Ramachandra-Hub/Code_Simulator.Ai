export function friendlyApiError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("ollama") || lower.includes("econnrefused") || lower.includes("fetch failed")) {
    return "AI service (Ollama) is offline. Start Ollama with your model, or ask your admin to check MODEL_PROVIDER.";
  }
  if (lower.includes("prisma") || lower.includes("database") || lower.includes("supabase") || lower.includes("can't reach")) {
    return "Database is temporarily unavailable. Your progress is safe — please try again in a moment.";
  }
  if (lower.includes("judge0") || lower.includes("code execution")) {
    return "Code execution service is unavailable. Coding rounds may use a limited fallback in dev mode.";
  }
  if (lower.includes("unauthorized") || lower.includes("401")) {
    return "Your session expired. Please log in again.";
  }
  if (lower.includes("empty transcript")) {
    return "We could not hear your answer. Speak clearly in Chrome/Edge, or type your answer in the text box.";
  }
  return message;
}
