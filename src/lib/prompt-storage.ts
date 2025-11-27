import fs from 'fs';
import path from 'path';

const PROMPT_FILE = path.join(process.cwd(), 'data', 'system-prompt.txt');

export const DEFAULT_PROMPT = `Atue como um especialista em cálculos trabalhistas e no sistema PJe-Calc. Sua principal função é fornecer respostas claras, precisas e objetivas para profissionais da área, utilizando sempre o português do Brasil.

**Diretrizes de Resposta:**
1.  **Base de Conhecimento:** Priorize sempre as informações contidas nos documentos fornecidos. Responda com base estrita nesse conteúdo.
2.  **Citação de Fonte:** Apenas se o usuário solicitar explicitamente, informe o link da aula que originou a resposta. Fora dessa situação, não mencione a fonte, nomes de arquivos ou qualquer metadado.
3.  **Escopo:** Mantenha-se focado nos temas de cálculos trabalhistas e PJe-Calc. Se a pergunta fugir do escopo, informe que você não possui informações sobre o assunto.
4.  **Linguagem:** Responda de forma direta e profissional, como um consultor.
5.  **Mídia:**
    - **Imagens:** Use a sintaxe markdown \`![descrição](url)\` para exibir imagens (diagramas, gráficos, ilustrações).
    - **Vídeos:** Inclua URLs completas do YouTube (youtube.com ou youtu.be) ou Vimeo (vimeo.com) que serão automaticamente convertidas em players embarcados. Exemplo: \`https://www.youtube.com/watch?v=VIDEO_ID\` ou \`https://vimeo.com/VIDEO_ID\`.
6.  **Tabelas:** Quando apropriado, organize dados em tabelas usando a sintaxe markdown:
    \`\`\`
    | Coluna 1 | Coluna 2 | Coluna 3 |
    | -------- | -------- | -------- |
    | Dado 1   | Dado 2   | Dado 3   |
    | Dado 4   | Dado 5   | Dado 6   |
    \`\`\`
    As tabelas serão renderizadas automaticamente com formatação visual apropriada.`;

// Armazenamento em memória como fallback (persistente durante a execução do servidor)
let inMemoryPrompt: string | null = null;

// Garantir que o diretório existe
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o777 });
    } catch (error) {
      console.error('Não foi possível criar diretório data/:', error);
      throw new Error(`Não foi possível criar o diretório ${dataDir}. Configure um volume persistente no Easypanel apontando para /app/data`);
    }
  }
}

// Ler o prompt (tenta arquivo, depois memória, depois default)
export function readPrompt(): string {
  try {
    // Tentar ler do arquivo primeiro
    try {
      ensureDataDir();
      if (fs.existsSync(PROMPT_FILE)) {
        return fs.readFileSync(PROMPT_FILE, 'utf-8');
      }
    } catch (fsError) {
      console.warn('Sistema de arquivos indisponível, usando armazenamento em memória');
    }

    // Se não encontrou no arquivo, usar memória
    if (inMemoryPrompt) {
      return inMemoryPrompt;
    }

    return DEFAULT_PROMPT;
  } catch (error) {
    console.error('Erro ao ler prompt:', error);
    return DEFAULT_PROMPT;
  }
}

// Salvar o prompt (tenta arquivo, fallback para memória)
export function writePrompt(prompt: string): { success: boolean; usedFallback: boolean; error?: string } {
  try {
    // Tentar salvar no arquivo primeiro
    try {
      ensureDataDir();
      const dataDir = path.join(process.cwd(), 'data');
      fs.accessSync(dataDir, fs.constants.W_OK);
      fs.writeFileSync(PROMPT_FILE, prompt, 'utf-8');
      return { success: true, usedFallback: false };
    } catch (fsError) {
      // Se falhar, usar armazenamento em memória
      console.warn('Não foi possível salvar no arquivo, usando armazenamento em memória:', fsError);
      inMemoryPrompt = prompt;
      return { success: true, usedFallback: true };
    }
  } catch (error) {
    console.error('Erro ao salvar prompt:', error);
    return {
      success: false,
      usedFallback: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
