import fs from 'fs';
import path from 'path';

const KEYS_FILE = path.join(process.cwd(), 'data', 'api-keys.json');

export interface ApiKey {
  id: string;
  name: string;
  apiKey: string;
  theme: string;
  description?: string;
  customPrompt?: string;
  createdAt: string;
}

// Armazenamento em memória como fallback
let inMemoryKeys: ApiKey[] | null = null;

// Garantir que o diretório existe
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o777 });
    } catch (error) {
      console.warn('Não foi possível criar diretório data/:', error);
    }
  }
}

// Ler todas as chaves
export function readApiKeys(): ApiKey[] {
  try {
    // Tentar ler do arquivo primeiro
    try {
      ensureDataDir();
      if (fs.existsSync(KEYS_FILE)) {
        const content = fs.readFileSync(KEYS_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (fsError) {
      console.warn('Sistema de arquivos indisponível para chaves, usando memória');
    }

    // Se não encontrou no arquivo, usar memória
    if (inMemoryKeys) {
      return inMemoryKeys;
    }

    // Se não tem nada, retornar chave padrão do .env
    const defaultKey = process.env.GEMINI_API_KEY;
    if (defaultKey) {
      return [{
        id: 'default',
        name: 'Chave Padrão',
        apiKey: defaultKey,
        theme: 'Geral',
        description: 'Chave configurada via variável de ambiente',
        createdAt: new Date().toISOString()
      }];
    }

    return [];
  } catch (error) {
    console.error('Erro ao ler chaves de API:', error);
    return [];
  }
}

// Salvar chaves
export function writeApiKeys(keys: ApiKey[]): { success: boolean; usedFallback: boolean; error?: string } {
  try {
    // Tentar salvar no arquivo primeiro
    try {
      ensureDataDir();
      const dataDir = path.join(process.cwd(), 'data');
      fs.accessSync(dataDir, fs.constants.W_OK);
      fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf-8');
      return { success: true, usedFallback: false };
    } catch (fsError) {
      // Se falhar, usar armazenamento em memória
      console.warn('Não foi possível salvar chaves no arquivo, usando memória:', fsError);
      inMemoryKeys = keys;
      return { success: true, usedFallback: true };
    }
  } catch (error) {
    console.error('Erro ao salvar chaves:', error);
    return {
      success: false,
      usedFallback: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Obter uma chave específica por ID
export function getApiKeyById(id: string): ApiKey | null {
  const keys = readApiKeys();
  return keys.find(k => k.id === id) || null;
}

// Adicionar nova chave
export function addApiKey(key: Omit<ApiKey, 'id' | 'createdAt'>): { success: boolean; key?: ApiKey; error?: string } {
  try {
    const keys = readApiKeys();

    // Verificar se já existe uma chave com o mesmo nome
    if (keys.some(k => k.name === key.name)) {
      return {
        success: false,
        error: 'Já existe uma chave com este nome'
      };
    }

    const newKey: ApiKey = {
      ...key,
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    keys.push(newKey);
    const result = writeApiKeys(keys);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      key: newKey
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Atualizar chave existente
export function updateApiKey(id: string, updates: Partial<Omit<ApiKey, 'id' | 'createdAt'>>): { success: boolean; error?: string } {
  try {
    const keys = readApiKeys();
    const index = keys.findIndex(k => k.id === id);

    if (index === -1) {
      return {
        success: false,
        error: 'Chave não encontrada'
      };
    }

    // Verificar se o novo nome já existe em outra chave
    if (updates.name && keys.some(k => k.id !== id && k.name === updates.name)) {
      return {
        success: false,
        error: 'Já existe uma chave com este nome'
      };
    }

    keys[index] = {
      ...keys[index],
      ...updates
    };

    const result = writeApiKeys(keys);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Deletar chave
export function deleteApiKey(id: string): { success: boolean; error?: string } {
  try {
    const keys = readApiKeys();
    const filteredKeys = keys.filter(k => k.id !== id);

    if (filteredKeys.length === keys.length) {
      return {
        success: false,
        error: 'Chave não encontrada'
      };
    }

    const result = writeApiKeys(filteredKeys);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
