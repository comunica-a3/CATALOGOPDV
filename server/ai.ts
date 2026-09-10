import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

export interface AIGenerateParams {
  type: 'prospecting_pitch' | 'budget_description' | 'followup_message' | 'custom';
  prompt: string;
  context?: Record<string, any>;
}

/**
 * Intelligent deterministic offline fallback generator
 */
function generateOfflineFallback(params: AIGenerateParams): string {
  const { type, context } = params;

  if (type === 'prospecting_pitch') {
    const segment = context?.segment || 'Comércio Local';
    const clientName = context?.clientName || 'Cliente';
    const pkgName = context?.packageName || 'Soluções Gráficas & Comunicação Visual';
    return `Olá ${clientName}! Notamos o excelente trabalho do seu negócio no segmento de ${segment}. Desenvolvemos soluções completas para aumentar a visibilidade e o fluxo de clientes na sua empresa com o ${pkgName}. Podemos agendar uma conversa rápida de 5 minutos para apresentar os modelos sem compromisso?`;
  }

  if (type === 'followup_message') {
    const clientName = context?.clientName || 'Cliente';
    const budgetNumber = context?.budgetNumber ? `#${context?.budgetNumber}` : 'enviada';
    return `Olá ${clientName}, tudo bem? Estou passando para saber se você conseguiu analisar a nossa proposta comercial ${budgetNumber}. Ficou alguma dúvida sobre os materiais, acabamentos ou prazos de produção? Estamos com a escala da semana aberta para priorizar seu pedido!`;
  }

  if (type === 'budget_description') {
    const items = context?.itemsSummary || 'materiais gráficos personalizados';
    return `Proposta comercial para fornecimento de ${items}, com acabamento profissional, alta durabilidade e garantia de fidelidade de cores conforme padrões técnicos da nossa gráfica.`;
  }

  return `Proposta de comunicação visual personalizada com foco em alto impacto e retorno comercial para sua empresa.`;
}

/**
 * Generates text using free Gemini model or fallback heuristic
 */
export async function generateAIContent(params: AIGenerateParams): Promise<{ text: string; source: 'gemini' | 'fallback' }> {
  try {
    const ai = getGemini();
    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Você é um assistente comercial e de produção de uma gráfica rápida e estúdio de comunicação visual. Seja direto, persuasivo e profissional em português do Brasil.\n\nInstrução: ${params.prompt}\nContexto: ${JSON.stringify(params.context || {})}`,
              },
            ],
          },
        ],
      });

      const generatedText = response.text?.trim();
      if (generatedText) {
        return { text: generatedText, source: 'gemini' };
      }
    }
  } catch (err) {
    console.warn('Gemini API call failed or rate-limited, switching to offline fallback engine:', err);
  }

  // Graceful offline fallback
  return {
    text: generateOfflineFallback(params),
    source: 'fallback',
  };
}
