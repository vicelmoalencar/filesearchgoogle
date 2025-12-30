# 📁 Armazenamento de Arquivos - Google File Search API

## 🌐 Onde ficam armazenados os arquivos?

Os arquivos **NÃO ficam armazenados no seu servidor**. Eles são enviados e armazenados nos **servidores do Google Cloud** através da **Gemini File Search API**.

### 📍 Localização dos Arquivos

1. **Servidores Google Cloud**
   - Armazenamento permanente na infraestrutura do Google
   - Gerenciado pela API Gemini File Search
   - Região: Provavelmente us-central1 (não especificado pela API)

2. **Organização**
   - Arquivos são organizados em **File Search Stores** (corpus/repositórios)
   - Cada store tem um nome único, exemplo: `cct-file-search-store`
   - Stores separados por tema/API key (jurisprudência, doutrina, etc.)

3. **Identificação**
   - Cada arquivo recebe um ID único do formato:
     ```
     fileSearchStores/{store-id}/documents/{document-id}
     ```
   - Exemplo real:
     ```
     fileSearchStores/abc123xyz/documents/doc456def
     ```

## 🔐 Acesso aos Arquivos

### ❌ NÃO é possível acessar pelo navegador

**Os arquivos NÃO podem ser baixados ou visualizados diretamente** por alguns motivos:

1. **Sem URL pública**
   - Arquivos não têm URL HTTP/HTTPS direta
   - Não existe endpoint para download via navegador
   - Acesso apenas via API do Google

2. **Processamento e Indexação**
   - Arquivos são **processados e indexados** pelo Google
   - Conteúdo é convertido para busca semântica
   - Arquivo original pode não estar mais no formato original

3. **Apenas consulta via API**
   - Você pode apenas **fazer buscas** no conteúdo
   - Não pode baixar o PDF/arquivo original
   - API retorna trechos de texto relevantes, não o arquivo

### ✅ Como acessar os dados

Você pode acessar os arquivos apenas através da **API**:

#### 1. Listar arquivos do store
```bash
GET https://generativelanguage.googleapis.com/v1beta/fileSearchStores/{store-name}/documents
```

Ou via código (já implementado):
```typescript
// Em src/app/api/files/route.ts
const documentsIterator = await genAIClient.fileSearchStores.documents.list({
    parent: store.name
});
```

#### 2. Ver metadados de um arquivo
```javascript
// Retorna:
{
    name: "fileSearchStores/xxx/documents/yyy",
    displayName: "meu-arquivo.pdf",
    state: "ACTIVE",
    mimeType: "application/pdf",
    sizeBytes: 1234567,
    createTime: "2025-01-15T10:30:00Z"
}
```

#### 3. Fazer buscas no conteúdo
```typescript
// Via chat - src/app/api/chat/route.ts
const response = await genAI.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: "pergunta sobre o conteúdo" }] }],
    tools: [{
        fileSearchStore: {
            name: storeName  // Busca nos arquivos do store
        }
    }]
});
```

## 🗂️ Estrutura de Armazenamento

```
Google Cloud (Gemini File Search API)
│
├── File Search Store: "cct-file-search-store" (tema padrão)
│   ├── Document: "documento1.pdf"
│   ├── Document: "documento2.docx"
│   └── Document: "documento3.txt"
│
├── File Search Store: "cct-file-search-store_Jurisprudência"
│   ├── Document: "jurisprudencia1.pdf"
│   └── Document: "jurisprudencia2.pdf"
│
└── File Search Store: "cct-file-search-store_Doutrina"
    ├── Document: "doutrina1.pdf"
    └── Document: "doutrina2.pdf"
```

## 🔍 Gerenciamento via Interface

### No Google AI Studio

Você **PODE** visualizar e gerenciar seus arquivos através do:

**Google AI Studio**: https://aistudio.google.com

#### Como acessar:

1. Acesse: https://aistudio.google.com
2. Faça login com a conta Google da API key
3. No menu lateral, procure por:
   - **"Files"** ou **"Arquivos"**
   - Ou **"File Search Stores"**
4. Lá você verá:
   - Lista de todos os stores criados
   - Arquivos dentro de cada store
   - Metadados (nome, tamanho, data)
   - **Opção de deletar arquivos** ✅

### ⚠️ Limitações do AI Studio

- **NÃO permite baixar** os arquivos originais
- **NÃO mostra** o conteúdo completo do arquivo
- **Permite apenas**:
  - Visualizar lista de arquivos
  - Ver metadados (nome, tamanho, data)
  - Deletar arquivos
  - Fazer upload de novos arquivos

## 💰 Custos e Armazenamento

### Permanência
- ✅ **Armazenamento permanente** (não expira como a File API antiga de 48h)
- ✅ **Indexação automática** para busca
- ✅ **Sem limite de tempo** de armazenamento

### Custos
Segundo a documentação do Google (consulte preços atualizados):

- **Armazenamento**: Gratuito até certo limite
- **Indexação**: Cobrado por caractere processado
- **Consultas**: Cobrado por consulta de busca

**Referência**: https://ai.google.dev/pricing

## 🛠️ APIs Disponíveis no Sistema

### 1. Upload de Arquivo
- **Endpoint**: `POST /api/upload`
- **Código**: [src/app/api/upload/route.ts](src/app/api/upload/route.ts)
- **O que faz**: Envia arquivo para Google File Search Store

### 2. Listar Arquivos
- **Endpoint**: `GET /api/files?apiKeyId={id}`
- **Código**: [src/app/api/files/route.ts](src/app/api/files/route.ts)
- **O que faz**: Lista todos os documentos de um store
- **Retorna**: Metadados (nome, tamanho, data, estado)

### 3. Deletar Arquivo
- **Endpoint**: `DELETE /api/files?name={documentName}&apiKeyId={id}`
- **Código**: [src/app/api/files/route.ts:108-154](src/app/api/files/route.ts#L108-L154)
- **O que faz**: Remove documento do store
- **Flag**: `force: true` para deletar documentos indexados

### 4. Buscar Conteúdo
- **Endpoint**: `POST /api/chat`
- **Código**: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
- **O que faz**: Busca semanticamente no conteúdo dos arquivos
- **Retorna**: Resposta gerada pela IA com citações dos documentos

## 📊 Monitoramento

### Ver arquivos atualmente no sistema

1. **Via interface web** (se implementado):
   - Acesse a página de administração do seu app
   - Veja lista de arquivos carregados

2. **Via API direta**:
   ```bash
   curl https://seu-dominio.com/api/files?apiKeyId=default
   ```

3. **Via Google AI Studio**:
   - https://aistudio.google.com
   - Navegue até "File Search Stores"

## 🔒 Segurança e Privacidade

### Quem pode acessar?

1. **Titular da API Key**
   - Pessoa/conta Google que criou a API key
   - Acesso total via API e AI Studio

2. **Aplicação**
   - Seu app Next.js usando a API key
   - Pode listar, buscar e deletar arquivos

3. **Usuários finais**
   - **NÃO** têm acesso direto aos arquivos
   - Podem apenas fazer perguntas que buscam no conteúdo
   - Não podem baixar ou ver lista completa

### Privacidade

- ⚠️ Arquivos ficam nos servidores do Google
- ⚠️ Google pode usar para treinamento (verificar termos)
- ⚠️ Não envie informações confidenciais/sensíveis
- ✅ Use apenas para dados que podem ser processados por terceiros

## 🆘 Problemas Comuns

### "Arquivo não aparece nas buscas"
- Aguarde a indexação completar (pode levar minutos)
- Verifique se o estado é `ACTIVE`
- Confirme que está buscando no store correto

### "Não consigo deletar arquivo"
- Use `force: true` na API de deleção
- Arquivo pode estar sendo usado em cache
- Aguarde alguns minutos e tente novamente

### "Store não existe"
- Store é criado automaticamente no primeiro upload
- Cada API key/tema tem seu próprio store
- Nome do store: `cct-file-search-store` + sufixo do tema

## 📚 Referências

- **Google Gemini API Docs**: https://ai.google.dev/docs
- **File Search Stores**: https://ai.google.dev/api/file-search
- **Google AI Studio**: https://aistudio.google.com
- **Pricing**: https://ai.google.dev/pricing
