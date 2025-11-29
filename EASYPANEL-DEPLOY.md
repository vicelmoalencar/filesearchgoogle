# Guia de Deploy no Easypanel

## 1. Configuração de Variáveis de Ambiente

Acesse o painel do Easypanel e configure as seguintes variáveis de ambiente:

### Supabase (Obrigatório)
```
NEXT_PUBLIC_SUPABASE_URL=https://ghdfouqzasvxlptbjkin.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZGZvdXF6YXN2eGxwdGJqa2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDI1NzIsImV4cCI6MjA3NjgxODU3Mn0.uaFHo-mHWQBBiUD2BTYeKGmBAIzy9p8p3B9DR67YNTM
```

### Chave Padrão - PJE-CALC (Obrigatório)
```
GEMINI_API_KEY=AIzaSyC19oLyKtrDrATPBuDWokQaySAGyd-ycvM
DEFAULT_KEY_NAME=Pje-calc
DEFAULT_KEY_THEME=Geral
```

### Chave Adicional 1 - Jurisprudência (Opcional)
```
API_KEY_1_NAME=Jurisprudência
API_KEY_1_KEY=AIzaSyCq7Cs84JsYKGsRSFYSBuFfM7UuZy9ZOpU
API_KEY_1_THEME=Jurisprudência de cálculos
```

## 2. Configuração de Volume Persistente

**IMPORTANTE**: A pasta `data/` precisa ser persistente para manter os prompts customizados e configurações do sistema.

### No Easypanel:

1. Acesse a configuração do seu app
2. Vá até a seção "Mounts" ou "Volumes"
3. Adicione um novo volume:
   - **Host Path**: `/app/data` (caminho dentro do container)
   - **Container Path**: `/app/data`
   - **Tipo**: Persistente

## 3. Arquivos de Dados Iniciais

Após o primeiro deploy, você precisará criar os arquivos de dados iniciais. Conecte-se ao container e execute:

### 3.1. Criar diretório data (se não existir)
```bash
mkdir -p /app/data
```

### 3.2. Criar arquivo de prompts customizados
```bash
cat > /app/data/key-prompts.json << 'EOF'
[
  {
    "keyId": "default",
    "prompt": "Atue como um especialista em cálculos trabalhistas e no sistema PJe-Calc. Sua principal função é fornecer respostas claras, precisas e objetivas para profissionais da área, utilizando sempre o português do Brasil.\n\n**Diretrizes de Resposta:**\n1.  **Base de Conhecimento:** Priorize sempre as informações contidas no documento manual_vicelmo_alencar.pdf. Responda com base estrita nesse conteúdo. Sempre exiba os links das imagens.\n2.  **Citação de Fonte:** Apenas se o usuário solicitar explicitamente, informe o link da aula que originou a resposta. Fora dessa situação, não mencione a fonte, nomes de arquivos ou qualquer metadado.\n3.  **Escopo:** Mantenha-se focado nos temas de cálculos trabalhistas e PJe-Calc. Se a pergunta fugir do escopo, informe que você não possui informações sobre o assunto.\n4.  **Linguagem:** Responda de forma direta e profissional, como um consultor.\n5.  **Mídia:**\n    - **Imagens:** Use a sintaxe markdown ![descrição](url) para exibir imagens (diagramas, gráficos, ilustrações).Inclua sempre os textos explicativos das imagens proximo a elas.\n    - **Vídeos:** Inclua URLs completas do YouTube (youtube.com ou youtu.be) ou Vimeo (vimeo.com) que serão automaticamente convertidas em players embarcados.\n6.  **Tabelas:** Quando apropriado, organize dados em tabelas usando a sintaxe markdown.",
    "updatedAt": "2025-11-29T21:32:21.917Z"
  },
  {
    "keyId": "env_key_1",
    "prompt": "Atue como um especialista em jurisprudência. Sua principal função é fornecer respostas claras, precisas e objetivas para profissionais da área, utilizando sempre o português do Brasil.\n\n**Diretrizes de Resposta:**\nQuando uma súmula tiver sido cancelada destaque em vermelho essa informação com um emotion de cuidado.\n1.  **Base de Conhecimento:** Priorize sempre as informações contidas nos documentos fornecidos. Responda com base estrita nesse conteúdo. Se não encontrar diga: \"tema não localizado\" mas não crie respostas que não estejam nos documentos pesquisados.\n\n1.1 Se o usuario perguntar sobre súmulas pesquise primeiro na fonte livro_sumulas_tst.pdf.\n1.2 Se o usuario citar o número de uma súmula, exemplo: \"o que diz a súmula 46?\", pesquise por SUM-46.\n1.3 Se o conteúdo for encontrado em precedentes sempre informe a tese.\n2.  **Citação de Fonte:** sempre que a resposta for obtido em um precedente do tst cite o número e outras informações.\n3.  **Linguagem:** Responda de forma direta e profissional, como um consultor.\n4.  **Tabelas:** Quando apropriado, organize dados em tabelas usando a sintaxe markdown.",
    "updatedAt": "2025-11-29T21:32:21.917Z"
  }
]
EOF
```

### 3.3. Criar arquivo .gitkeep
```bash
touch /app/data/.gitkeep
```

## 4. Adicionando Novas Chaves API

Para adicionar uma nova chave API (exemplo: terceira chave):

```
API_KEY_2_NAME=Nome da Nova Chave
API_KEY_2_KEY=sua-nova-api-key-aqui
API_KEY_2_THEME=Tema da Nova Chave
API_KEY_2_DESCRIPTION=Descrição opcional
```

O sistema detectará automaticamente as novas chaves seguindo o padrão `API_KEY_N_*`.

## 5. Editando Prompts via Interface Admin

Após o deploy:

1. Acesse `/admin/prompt` no seu domínio
2. Você verá todas as chaves configuradas
3. Clique em uma chave para expandir
4. Edite o prompt customizado no textarea
5. Clique em "Salvar Prompt"

Os prompts são salvos automaticamente em `data/key-prompts.json` e aplicados imediatamente.

## 6. Estrutura do Sistema

### API Keys (em variáveis de ambiente)
- Armazenadas de forma segura nas variáveis de ambiente do Easypanel
- Nunca são expostas no código ou commits do Git
- Formato: `API_KEY_N_NAME`, `API_KEY_N_KEY`, `API_KEY_N_THEME`

### Prompts (em arquivos editáveis)
- Armazenados em `data/key-prompts.json`
- Editáveis via interface admin (`/admin/prompt`)
- Persistem entre deploys através do volume montado

### Prompt Padrão do Sistema
- Armazenado em `data/system-prompt.txt`
- Usado quando uma chave não tem prompt customizado
- Editável via interface admin

## 7. Verificação Pós-Deploy

Execute estes testes após o deploy:

1. **Verificar variáveis de ambiente**: Acesse `/admin` e veja se as chaves estão listadas
2. **Testar chat**: Envie uma mensagem de teste
3. **Verificar prompts**: Acesse `/admin/prompt` e confira os prompts
4. **Testar edição**: Edite um prompt e salve para verificar persistência

## 8. Troubleshooting

### Erro: "No File Search Store found"
- Certifique-se de que fez upload dos arquivos para o Google File Search
- Cada chave API precisa ter seu próprio File Search Store

### Erro: "API key expired" ou "API key leaked"
- Gere novas API keys no Google Cloud Console
- Atualize as variáveis de ambiente no Easypanel

### Prompts não são salvos
- Verifique se o volume `/app/data` está montado corretamente
- Verifique permissões de escrita no diretório

### Chaves não aparecem no admin
- Verifique se as variáveis de ambiente estão configuradas corretamente
- O formato deve ser exatamente: `API_KEY_N_NAME`, `API_KEY_N_KEY`, `API_KEY_N_THEME`

## 9. Backup

**IMPORTANTE**: Faça backup regular da pasta `data/`:
- `data/key-prompts.json` - Prompts customizados
- `data/system-prompt.txt` - Prompt padrão do sistema

Você pode fazer isso através do console do Easypanel ou via FTP/SSH.
