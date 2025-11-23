# 🚀 Deploy no Easypanel

Guia completo para fazer deploy do AI File Search no Easypanel.

## 📋 Pré-requisitos

- Conta no Easypanel
- Repositório GitHub configurado: https://github.com/vicelmoalencar/filesearch.git
- API Key do Google Gemini

## 🔧 Passo a Passo

### 1. Criar Novo Projeto no Easypanel

1. Acesse seu painel do Easypanel
2. Clique em **"Create Project"**
3. Escolha **"Deploy from GitHub"**

### 2. Conectar Repositório

1. Selecione o repositório: `vicelmoalencar/filesearch`
2. Branch: `master`
3. Build method: **Dockerfile**

### 3. Configurar Variáveis de Ambiente

No Easypanel, vá em **Environment Variables** e adicione:

```env
GEMINI_API_KEY=sua_chave_api_aqui
NODE_ENV=production
```

**Importante:** Substitua `sua_chave_api_aqui` pela sua chave real da API Gemini.

### 4. Configurações de Build

- **Build Command**: Não precisa (usa Dockerfile)
- **Start Command**: Não precisa (definido no Dockerfile)
- **Port**: 3000
- **Health Check Path**: `/` (opcional)

### 5. Configurar Domínio

1. Em **Domains**, adicione seu domínio customizado
2. Ou use o domínio fornecido pelo Easypanel
3. Habilite HTTPS automático

### 6. Deploy

1. Clique em **Deploy**
2. Aguarde o build completar (2-5 minutos)
3. Acesse a URL fornecida

## 🔐 Obtendo a API Key do Gemini

Se você ainda não tem uma API key:

1. Acesse: https://aistudio.google.com/apikey
2. Clique em **"Create API Key"**
3. Escolha ou crie um projeto no Google Cloud
4. Copie a chave gerada
5. Cole nas variáveis de ambiente do Easypanel

## 📊 Recursos Necessários

Configuração mínima recomendada:

- **CPU**: 0.5 vCPU
- **RAM**: 512 MB
- **Storage**: 1 GB

Configuração recomendada para produção:

- **CPU**: 1 vCPU
- **RAM**: 1 GB
- **Storage**: 2 GB

## 🔄 Atualizações Automáticas

### Opção 1: Webhook do GitHub

1. No Easypanel, copie a URL do webhook
2. No GitHub, vá em Settings → Webhooks
3. Cole a URL e configure para push events
4. Agora cada push na branch master fará deploy automático

### Opção 2: Deploy Manual

No Easypanel:
1. Vá no seu projeto
2. Clique em **"Redeploy"**

## ✅ Verificação Pós-Deploy

Após o deploy, teste:

1. ✅ Acesse a URL do projeto
2. ✅ Vá em `/admin` e faça upload de um arquivo de teste
3. ✅ Volte para `/` e faça uma pergunta sobre o arquivo
4. ✅ Teste o tema claro/escuro (ícone de sol/lua)

## 🐛 Troubleshooting

### Build Falhou

- Verifique se o Dockerfile está correto
- Confirme que todas as dependências estão no package.json
- Veja os logs no Easypanel

### Erro 500 na API

- Verifique se a `GEMINI_API_KEY` está configurada
- Teste a chave em: https://aistudio.google.com/
- Certifique-se que a API está habilitada no Google Cloud

### Upload não funciona

- Verifique se há espaço suficiente no container
- Confirme que a porta 3000 está exposta
- Verifique os logs do container

## 📝 Comandos Úteis

### Ver Logs em Tempo Real
No Easypanel, vá em **Logs** → **Live Logs**

### Reiniciar Aplicação
No Easypanel, clique em **Restart**

### Ver Métricas
Vá em **Metrics** para ver uso de CPU, RAM e rede

## 🔗 Links Úteis

- Repositório: https://github.com/vicelmoalencar/filesearch
- Google AI Studio: https://aistudio.google.com/
- Documentação Gemini: https://ai.google.dev/docs
- Easypanel Docs: https://easypanel.io/docs

## 💡 Dicas

1. **Monitore custos**: Configure alertas de billing no Google Cloud
2. **Backup**: Os arquivos no File API expiram em 48h
3. **Segurança**: Nunca commite sua `.env.local` no Git
4. **Performance**: Use cache do Gemini para documentos repetidos

---

**Dúvidas?** Abra uma issue no GitHub!
