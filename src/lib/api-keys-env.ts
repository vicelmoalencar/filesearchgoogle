// Sistema de API Keys baseado em variáveis de ambiente
// No Easypanel, configure variáveis de ambiente no formato:
// API_KEY_1_NAME=Nome da Chave
// API_KEY_1_KEY=sua-api-key-aqui
// API_KEY_1_THEME=Tema
// API_KEY_1_DESCRIPTION=Descrição (opcional)
//
// IMPORTANTE: Prompts customizados são armazenados em arquivos (data/key-prompts.json)
// e editáveis via interface admin, NÃO via variáveis de ambiente

import { readKeyPrompts } from './key-prompts-storage';

export interface ApiKey {
  id: string;
  name: string;
  apiKey: string;
  theme: string;
  description?: string;
  customPrompt?: string;
  createdAt: string;
}

// Ler todas as chaves de API das variáveis de ambiente
export function readApiKeys(): ApiKey[] {
  const keys: ApiKey[] = [];

  // Ler prompts customizados do arquivo
  const keyPrompts = readKeyPrompts();

  // Chave padrão do .env (se existir)
  const defaultKey = process.env.GEMINI_API_KEY;
  if (defaultKey) {
    keys.push({
      id: 'default',
      name: process.env.DEFAULT_KEY_NAME || 'Chave Padrão',
      apiKey: defaultKey,
      theme: process.env.DEFAULT_KEY_THEME || 'Geral',
      description: process.env.DEFAULT_KEY_DESCRIPTION || 'Chave configurada via variável de ambiente',
      customPrompt: keyPrompts['default'], // Busca prompt do arquivo
      createdAt: new Date().toISOString()
    });
  }

  // Buscar chaves adicionais no formato API_KEY_N_*
  let index = 1;
  while (true) {
    const keyName = process.env[`API_KEY_${index}_NAME`];
    const apiKey = process.env[`API_KEY_${index}_KEY`];
    const theme = process.env[`API_KEY_${index}_THEME`];

    // Se não encontrou nome, chave ou tema, para de buscar
    if (!keyName || !apiKey || !theme) {
      break;
    }

    const keyId = `env_key_${index}`;
    keys.push({
      id: keyId,
      name: keyName,
      apiKey: apiKey,
      theme: theme,
      description: process.env[`API_KEY_${index}_DESCRIPTION`],
      customPrompt: keyPrompts[keyId], // Busca prompt do arquivo
      createdAt: new Date().toISOString()
    });

    index++;
  }

  return keys;
}

// Obter uma chave específica por ID
export function getApiKeyById(id: string): ApiKey | null {
  const keys = readApiKeys();
  return keys.find(k => k.id === id) || null;
}

// Obter chave por tema
export function getApiKeyByTheme(theme: string): ApiKey | null {
  const keys = readApiKeys();
  return keys.find(k => k.theme === theme) || null;
}

// Validar se uma API key está configurada
export function hasApiKeys(): boolean {
  return readApiKeys().length > 0;
}

// Obter a primeira chave disponível (default ou primeira configurada)
export function getDefaultApiKey(): ApiKey | null {
  const keys = readApiKeys();
  return keys[0] || null;
}
