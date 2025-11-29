import fs from 'fs';
import path from 'path';

const PROMPTS_FILE = path.join(process.cwd(), 'data', 'key-prompts.json');

interface KeyPrompt {
  keyId: string;
  prompt: string;
  updatedAt: string;
}

// Ler prompts customizados por chave do arquivo
export function readKeyPrompts(): Record<string, string> {
  try {
    if (fs.existsSync(PROMPTS_FILE)) {
      const data = fs.readFileSync(PROMPTS_FILE, 'utf-8');
      const prompts: KeyPrompt[] = JSON.parse(data);

      // Converter array para objeto { keyId: prompt }
      const result: Record<string, string> = {};
      prompts.forEach(p => {
        result[p.keyId] = p.prompt;
      });
      return result;
    }
  } catch (error) {
    console.error('Erro ao ler prompts customizados:', error);
  }
  return {};
}

// Salvar prompt customizado para uma chave específica
export function saveKeyPrompt(keyId: string, prompt: string): { success: boolean; error?: string } {
  try {
    const prompts = readKeyPrompts();
    prompts[keyId] = prompt;

    // Converter objeto para array
    const promptsArray: KeyPrompt[] = Object.entries(prompts).map(([keyId, prompt]) => ({
      keyId,
      prompt,
      updatedAt: new Date().toISOString()
    }));

    // Garantir que o diretório existe
    const dataDir = path.dirname(PROMPTS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(PROMPTS_FILE, JSON.stringify(promptsArray, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar prompt customizado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Obter prompt customizado de uma chave específica
export function getKeyPrompt(keyId: string): string | undefined {
  const prompts = readKeyPrompts();
  return prompts[keyId];
}

// Deletar prompt customizado de uma chave
export function deleteKeyPrompt(keyId: string): { success: boolean; error?: string } {
  try {
    const prompts = readKeyPrompts();
    delete prompts[keyId];

    const promptsArray: KeyPrompt[] = Object.entries(prompts).map(([keyId, prompt]) => ({
      keyId,
      prompt,
      updatedAt: new Date().toISOString()
    }));

    fs.writeFileSync(PROMPTS_FILE, JSON.stringify(promptsArray, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar prompt customizado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
