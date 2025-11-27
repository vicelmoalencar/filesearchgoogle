import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROMPT_FILE = path.join(process.cwd(), 'data', 'system-prompt.txt');
const DEFAULT_PROMPT = `Atue como um especialista em cálculos trabalhistas e no sistema PJe-Calc. Sua principal função é fornecer respostas claras, precisas e objetivas para profissionais da área, utilizando sempre o português do Brasil.

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

// Garantir que o diretório existe
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// GET - Retorna o prompt atual
export async function GET() {
  try {
    ensureDataDir();

    let prompt = DEFAULT_PROMPT;

    if (fs.existsSync(PROMPT_FILE)) {
      prompt = fs.readFileSync(PROMPT_FILE, 'utf-8');
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Erro ao ler prompt:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar prompt' },
      { status: 500 }
    );
  }
}

// POST - Atualiza o prompt
export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        {
          error: 'Prompt inválido',
          details: 'O prompt não pode estar vazio e deve ser uma string'
        },
        { status: 400 }
      );
    }

    if (prompt.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Prompt vazio',
          details: 'O prompt não pode conter apenas espaços em branco'
        },
        { status: 400 }
      );
    }

    ensureDataDir();

    // Verificar permissões de escrita
    const dataDir = path.join(process.cwd(), 'data');
    try {
      fs.accessSync(dataDir, fs.constants.W_OK);
    } catch (permError) {
      console.error('Erro de permissão no diretório data/:', permError);
      return NextResponse.json(
        {
          error: 'Erro de permissão',
          details: `Sem permissão de escrita no diretório: ${dataDir}. Verifique as permissões do container.`
        },
        { status: 500 }
      );
    }

    fs.writeFileSync(PROMPT_FILE, prompt, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Prompt atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar prompt:', error);
    return NextResponse.json(
      {
        error: 'Erro ao salvar prompt',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Exportar função para obter o prompt (usado em outras rotas)
export function getSystemPrompt(): string {
  try {
    ensureDataDir();

    if (fs.existsSync(PROMPT_FILE)) {
      return fs.readFileSync(PROMPT_FILE, 'utf-8');
    }

    return DEFAULT_PROMPT;
  } catch (error) {
    console.error('Erro ao ler prompt:', error);
    return DEFAULT_PROMPT;
  }
}
