# Soluções para Upload de Arquivos Grandes na API do Gemini

Este documento resume as soluções encontradas para resolver erros 503 ao fazer upload de arquivos grandes (>10MB) para a API do Google Gemini.

## 🔴 Problema Identificado

A API do Gemini File Search retorna erro **503 Service Unavailable** ao fazer upload de arquivos grandes (especialmente PDFs > 10MB). Isso acontece porque:

1. A API tem limitações não documentadas para arquivos grandes
2. Quando o total de tokens excede ~500.000, o erro 503 aparece
3. Há um bug recente (última semana) com "Failed to count tokens"

## ✅ Soluções Implementadas

### 1. Upload Resumível (Implementado)

Criamos uma rota `/api/upload-resumable` que:
- Usa polling a cada 5 segundos (recomendado pela Google)
- Timeout de 5 minutos para arquivos grandes
- Logs detalhados de progresso
- Automaticamente usado para arquivos > 10MB

**Arquivos:**
- `src/app/api/upload-resumable/route.ts` - Nova rota
- `src/app/admin/page.tsx` - Detecta tamanho e escolhe rota automaticamente

### 2. Aviso Preventivo

Antes de fazer upload de arquivos > 10MB, o usuário recebe um aviso explicando:
- A API tem problemas conhecidos com arquivos grandes
- Recomendações para comprimir ou dividir o arquivo
- Opção de cancelar antes de perder tempo

### 3. Mensagens de Erro Detalhadas

Todos os erros agora mostram orientações específicas em português:
- **503 com arquivo grande**: Sugere dividir, comprimir ou aguardar
- **503 com arquivo pequeno**: Indica problema temporário da API
- **429**: Limite de taxa excedido
- **Timeout**: Arquivo muito grande ou conexão lenta
- **Count tokens error**: Bug conhecido da API

## 🎯 Outras Soluções Encontradas (Não Implementadas)

### Solução A: Migrar para Vertex AI

**Melhor solução segundo relatos de usuários** - Vários desenvolvedores reportaram que mudar para Vertex AI resolveu instantaneamente os erros 503.

**Vantagens:**
- Usa os mesmos fundos da conta Google
- Endpoints de alta performance
- Menos erros 503
- Sem billing adicional

**Como implementar:**
```bash
npm install @google-cloud/vertexai
```

```typescript
import { VertexAI } from '@google-cloud/vertexai';

const vertex = new VertexAI({
  project: 'YOUR_PROJECT_ID',
  location: 'us-central1'
});
```

**Fontes:**
- [503 error with File search tool](https://discuss.ai.google.dev/t/503-error-with-file-search-tool-from-gemini/109892)
- [Stack Overflow - 503 Error Solution](https://stackoverflow.com/questions/78154047/encountering-503-error-when-calling-gemini-api-from-google-colab)

### Solução B: Comprimir PDFs Antes do Upload

**Limites recomendados pela Google:**
- Tamanho ideal: **25-30 MB**
- Páginas ideais: **500-1.000 páginas**
- Limite máximo: **100 MB**
- Limite de tokens: **~500.000 tokens**

**Ferramentas online:**
- https://smallpdf.com/pt/comprimir-pdf
- https://www.ilovepdf.com/pt/comprimir_pdf
- https://www.adobe.com/br/acrobat/online/compress-pdf.html

**Fonte:**
- [File Upload Size Limits](https://www.datastudios.org/post/google-gemini-file-upload-size-limits-supported-types-and-advanced-document-processing)

### Solução C: Dividir PDFs em Partes Menores

Para arquivos muito grandes (>30MB), divida em partes de 5-10MB cada.

**Ferramentas:**
- https://smallpdf.com/pt/dividir-pdf
- https://www.ilovepdf.com/pt/dividir_pdf

Depois faça upload de cada parte separadamente.

## 📊 Limites da API do Gemini

| Métrica | Limite |
|---------|--------|
| Tamanho máximo | 100 MB |
| Tamanho ideal | 25-30 MB |
| Páginas ideais | 500-1.000 |
| Tokens máximos | ~500.000 |
| Tamanho estável | < 10 MB |

**Fonte:**
- [Handling Multiple PDFs with Token Limits](https://discuss.ai.google.dev/t/handling-multiple-pdf-files-with-gemini-api-and-token-limit-issues/58567)

## 🐛 Problemas Conhecidos da API

### 1. Bug Recente: "Failed to count tokens"

**Quando:** Última semana (relatado há 1 semana)

**Sintoma:** Erro 503 com mensagem "Failed to count tokens" ao fazer upload para File Search Store

**Causa:** Bug da plataforma Google após atualização recente

**Solução temporária:**
- Aguardar correção do Google
- Dividir arquivos em partes menores
- Tentar novamente mais tarde

**Fonte:**
- [Gemini AI File Upload Failure Issue](https://github.com/googleapis/python-genai/issues/589)

### 2. Upload já terminado

Alguns usuários relatam erro "Upload has already been terminated" com arquivos markdown após atualização da API.

**Fonte:**
- [Upload terminated error](https://discuss.ai.google.dev/t/upload-has-already-been-terminated-error-with-markdown-files-after-gemini-file-search-api-update/110244)

## 🔧 Melhorias Futuras Recomendadas

1. **Migrar para Vertex AI** (melhor solução a longo prazo)
2. **Implementar chunking automático** - Dividir arquivos grandes automaticamente
3. **Progress bar** - Mostrar progresso do upload em tempo real
4. **Upload em background** - Usar workers para não bloquear a UI
5. **Cache de embeddings** - Evitar reprocessar arquivos já indexados

## 📚 Fontes e Referências

### Documentação Oficial:
- [File Search API Documentation](https://ai.google.dev/gemini-api/docs/file-search)
- [Upload & Analyze Files - Gemini Apps Help](https://support.google.com/gemini/answer/14903178?hl=en&co=GENIE.Platform%3DDesktop)

### Fóruns e Issues:
- [503 error with File search tool](https://discuss.ai.google.dev/t/503-error-with-file-search-tool-from-gemini/109892)
- [File Upload Issue - Python GenAI](https://github.com/googleapis/python-genai/issues/589)
- [Gemini 2.5 Pro File Upload Issue](https://discuss.ai.google.dev/t/google-gemini-2-5-pro-file-upload-issue/94208)
- [Model 503 Error Solutions](https://visionvix.com/how-to-solve-model-503-error-in-gemini-api/)

### Artigos Técnicos:
- [Google's File Search Tool Introduction](https://towardsdatascience.com/introducing-googles-file-search-tool/)
- [File Upload Size Limits Guide](https://www.datastudios.org/post/google-gemini-file-upload-size-limits-supported-types-and-advanced-document-processing)

### Stack Overflow:
- [Encountering 503 Error from Colab](https://stackoverflow.com/questions/78154047/encountering-503-error-when-calling-gemini-api-from-google-colab)
- [Problem Uploading Files with PHP](https://stackoverflow.com/questions/79398113/problem-uploading-files-with-gemini-api-using-php)

## 🎯 Recomendação Final

Para seu caso específico (PDF de 12MB):

1. **Curto prazo:** Use a rota `/api/upload-resumable` que acabamos de criar
2. **Se continuar falhando:** Comprima o PDF para <10MB
3. **Longo prazo:** Considere migrar para Vertex AI para melhor estabilidade

---

**Última atualização:** 2025-01-26
