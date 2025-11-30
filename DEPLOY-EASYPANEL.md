# Guia de Deploy no Easypanel

## 1. Configurar Variáveis de Ambiente

No painel do Easypanel, configure as seguintes variáveis de ambiente:

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://ghdfouqzasvxlptbjkin.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZGZvdXF6YXN2eGxwdGJqa2luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDI1NzIsImV4cCI6MjA3NjgxODU3Mn0.uaFHo-mHWQBBiUD2BTYeKGmBAIzy9p8p3B9DR67YNTM
```

### API Keys do Gemini
```
GEMINI_API_KEY=AIzaSyC19oLyKtrDrATPBuDWokQaySAGyd-ycvM
DEFAULT_KEY_NAME=Pje-calc
DEFAULT_KEY_THEME=Geral

API_KEY_1_NAME=Jurisprudência
API_KEY_1_KEY=AIzaSyCq7Cs84JsYKGsRSFYSBuFfM7UuZy9ZOpU
API_KEY_1_THEME=Jurisprudência de cálculos
```

## 2. Configurar Volume Persistente

Configure um volume persistente no Easypanel apontando para a pasta `data/`:

- **Host Path**: `/mnt/data/filesearch/data` (ou o caminho de sua preferência)
- **Container Path**: `/app/data`

Isso garante que os prompts customizados não sejam perdidos ao reiniciar o container.

## 3. Criar Arquivo de Prompts Inicial

Após o deploy, acesse o terminal do container no Easypanel e execute:

```bash
mkdir -p data
cat > data/key-prompts.json << 'EOF'
[]
EOF
```

Isso cria um arquivo vazio. Os prompts serão configurados via interface admin.

## 4. Configurar Prompts via Interface Admin

1. Acesse: `https://seu-dominio.com/admin/prompt`
2. Configure o **Prompt Padrão do Sistema** (usado quando não há prompt customizado)
3. Para cada chave de API:
   - Clique na seta para expandir
   - Digite o prompt customizado
   - Clique em "Salvar Prompt"

## 5. Prompts Recomendados

### Chave: Pje-calc (default)
```
Atue como um especialista em cálculos trabalhistas e no sistema PJe-Calc. Sua principal função é fornecer respostas claras, precisas e objetivas para profissionais da área, utilizando sempre o português do Brasil.

**Diretrizes de Resposta:**
1.  **Base de Conhecimento:** Priorize sempre as informações contidas no documento manual_vicelmo_alencar.pdf. Responda com base estrita nesse conteúdo. Sempre exiba os links das imagens.
2.  **Citação de Fonte:** Apenas se o usuário solicitar explicitamente, informe o link da aula que originou a resposta. Fora dessa situação, não mencione a fonte, nomes de arquivos ou qualquer metadado.
3.  **Escopo:** Mantenha-se focado nos temas de cálculos trabalhistas e PJe-Calc. Se a pergunta fugir do escopo, informe que você não possui informações sobre o assunto.
4.  **Linguagem:** Responda de forma direta e profissional, como um consultor.
5.  **Mídia:**
    - **Imagens:** Use a sintaxe markdown ![descrição](url) para exibir imagens (diagramas, gráficos, ilustrações).Inclua sempre os textos explicativos das imagens proximo a elas.
    - **Vídeos:** Inclua URLs completas do YouTube (youtube.com ou youtu.be) ou Vimeo (vimeo.com) que serão automaticamente convertidas em players embarcados.
6.  **Tabelas:** Quando apropriado, organize dados em tabelas usando a sintaxe markdown.
```

### Chave: Jurisprudência (env_key_1)
```
Atue como um especialista em jurisprudência. Sua principal função é fornecer respostas claras, precisas e objetivas para profissionais da área, utilizando sempre o português do Brasil.

**Diretrizes de Resposta:**
Quando uma súmula tiver sido cancelada destaque em vermelho essa informação com um emotion de cuidado.
1.  **Base de Conhecimento:** Priorize sempre as informações contidas nos documentos fornecidos. Responda com base estrita nesse conteúdo. Se não encontrar diga: "tema não localizado" mas não crie respostas que não estejam nos documentos pesquisados.

1.1 Se o usuario perguntar sobre súmulas pesquise primeiro na fonte livro_sumulas_tst.pdf.
1.2 Se o usuario citar o número de uma súmula, exemplo: "o que diz a súmula 46?", pesquise por SUM-46.
1.3 Se o conteúdo for encontrado em precedentes sempre informe a tese.
2.  **Citação de Fonte:** sempre que a resposta for obtido em um precedente do tst cite o número e outras informações.
3.  **Linguagem:** Responda de forma direta e profissional, como um consultor.
4.  **Tabelas:** Quando apropriado, organize dados em tabelas usando a sintaxe markdown.
```

## 6. Verificação

Após configurar:

1. Acesse o chat
2. Selecione cada chave no seletor
3. Envie uma mensagem de teste
4. Verifique se o sistema responde de acordo com o prompt configurado

## Estrutura do Sistema

- **API Keys**: Armazenadas em variáveis de ambiente (seguro)
- **Prompts**: Armazenados em `data/key-prompts.json` (editável via admin)
- **Dados**: Volume persistente em `/app/data`

## Troubleshooting

### Prompts não estão sendo aplicados
1. Verifique se o arquivo `data/key-prompts.json` existe
2. Verifique se o volume persistente está configurado
3. Reinicie o container após criar o arquivo

### Arquivo não persiste após reiniciar
1. Verifique se o volume persistente está configurado corretamente
2. Verifique as permissões da pasta no host

### Erro ao salvar prompts
1. Verifique as permissões de escrita no diretório `data/`
2. Execute: `chmod -R 777 data/` no terminal do container (temporariamente para teste)
