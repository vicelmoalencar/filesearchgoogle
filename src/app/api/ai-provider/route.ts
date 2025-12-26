import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'ai-provider.json');

interface AIProviderConfig {
  provider: 'google' | 'openrouter';
  googleApiKey?: string;
  openrouterApiKey?: string;
  selectedModel?: string;
  customModels?: Array<{
    id: string;
    name: string;
    description?: string;
    contextLength?: number;
    pricing?: {
      prompt: string;
      completion: string;
    };
  }>;
}

// Garantir que o diretório data existe
function ensureDataDir() {
  const dataDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Ler configuração
export async function GET() {
  try {
    ensureDataDir();

    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config: AIProviderConfig = JSON.parse(data);

      // Adicionar a chave do Google do .env.local
      config.googleApiKey = process.env.GEMINI_API_KEY;

      return NextResponse.json(config);
    }

    // Configuração padrão
    return NextResponse.json({
      provider: 'google',
      googleApiKey: process.env.GEMINI_API_KEY,
      openrouterApiKey: '',
      selectedModel: '',
      customModels: []
    });
  } catch (error) {
    console.error('Erro ao ler configuração:', error);
    return NextResponse.json({
      error: 'Erro ao carregar configurações'
    }, { status: 500 });
  }
}

// Salvar configuração
export async function POST(request: NextRequest) {
  try {
    const config: AIProviderConfig = await request.json();

    // Validações
    if (config.provider === 'openrouter') {
      if (!config.openrouterApiKey || !config.openrouterApiKey.trim()) {
        return NextResponse.json({
          error: 'OpenRouter API Key é obrigatória'
        }, { status: 400 });
      }

      if (!config.selectedModel || !config.selectedModel.trim()) {
        return NextResponse.json({
          error: 'Selecione um modelo para o OpenRouter'
        }, { status: 400 });
      }
    }

    ensureDataDir();

    // Não salvar a chave do Google (ela está no .env.local)
    const configToSave: AIProviderConfig = {
      provider: config.provider,
      openrouterApiKey: config.openrouterApiKey,
      selectedModel: config.selectedModel,
      customModels: config.customModels || []
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    return NextResponse.json({
      error: 'Erro ao salvar configurações',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
