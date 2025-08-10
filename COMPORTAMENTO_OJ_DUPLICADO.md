# Comportamento do Sistema com Órgãos Julgadores Já Cadastrados

## 📋 Resumo

Este documento explica como o sistema de automação PJE Perito se comporta quando um Órgão Julgador (OJ) já está vinculado ao perito.

## 🔍 Verificações Implementadas

### 1. Verificação Prévia
Antes de tentar vincular um OJ, o sistema agora:
- ✅ Lista todos os OJs já vinculados ao perito
- ✅ Verifica se o OJ que será vinculado já existe na lista
- ✅ Compara nomes usando normalização de texto (remove acentos, converte para minúsculas)
- ✅ Usa algoritmo de correspondência por tokens para evitar falsos positivos

### 2. Comportamentos por Cenário

#### 🟢 Cenário 1: OJ Não Vinculado
```
✅ Verificando OJ: "Vara do Trabalho de Campinas"
❌ OJ não foi encontrado na lista de vinculados
🔗 Vinculando OJ: "Vara do Trabalho de Campinas"
✅ OJ vinculado com sucesso
```

#### 🟡 Cenário 2: OJ Já Vinculado (Detectado na Verificação)
```
✅ Verificando OJ: "Vara do Trabalho de São Paulo"
⚠️  OJ "Vara do Trabalho de São Paulo" já está vinculado - pulando vinculação
```

#### 🟠 Cenário 3: OJ Já Vinculado (Detectado Durante Vinculação)
```
✅ Verificando OJ: "Tribunal Regional do Trabalho"
❌ OJ não foi encontrado na lista de vinculados
🔗 Vinculando OJ: "Tribunal Regional do Trabalho"
⚠️  OJ "Tribunal Regional do Trabalho" já está vinculado: [mensagem do sistema PJE]
```

#### 🔴 Cenário 4: Erro de Vinculação (Outros Motivos)
```
✅ Verificando OJ: "Vara Inexistente"
❌ OJ não foi encontrado na lista de vinculados
🔗 Vinculando OJ: "Vara Inexistente"
❌ Erro ao vincular OJ: Órgão julgador não encontrado entre as opções disponíveis
```

## 🛠️ Melhorias Implementadas

### Arquivo: `src/verificarOJVinculado.js`
- **Função `verificarOJJaVinculado()`**: Verifica se um OJ específico já está vinculado
- **Função `listarOJsVinculados()`**: Lista todos os OJs vinculados ao perito
- **Normalização de texto**: Remove acentos e padroniza formato para comparação
- **Múltiplos seletores**: Busca em diferentes elementos da página (tabelas, listas, cards)

### Arquivo: `src/main.js` (Modificado)
- **Verificação prévia**: Antes de vincular, verifica se o OJ já existe
- **Tratamento de erros melhorado**: Distingue entre OJs duplicados e outros erros
- **Logs informativos**: Mostra quantos OJs já estão vinculados
- **Pular vinculação**: Evita tentativas desnecessárias quando OJ já existe

## 🧪 Arquivo de Teste

### `test_oj_duplicado.js`
Script para testar manualmente o comportamento com OJs duplicados:

```bash
# Executar teste
node test_oj_duplicado.js
```

O teste:
1. Abre o navegador
2. Aguarda login manual
3. Tenta vincular um OJ específico
4. Captura e analisa erros/mensagens
5. Verifica alertas e modais na página
6. Gera relatório do comportamento

## 📊 Vantagens da Implementação

### ✅ Eficiência
- **Redução de tempo**: Evita tentativas desnecessárias de vinculação
- **Menos requisições**: Reduz carga no servidor PJE
- **Feedback imediato**: Usuário sabe instantaneamente se OJ já está vinculado

### ✅ Confiabilidade
- **Detecção robusta**: Múltiplos métodos de verificação
- **Normalização de texto**: Evita problemas com acentos e formatação
- **Tratamento de erros**: Distingue diferentes tipos de problemas

### ✅ Usabilidade
- **Logs claros**: Mensagens informativas sobre o status
- **Continuidade**: Processo continua mesmo com OJs duplicados
- **Relatório completo**: Lista de OJs já vinculados no início

## 🔧 Configuração

Nenhuma configuração adicional é necessária. As melhorias são aplicadas automaticamente quando o sistema é executado.

## 📝 Logs de Exemplo

```
🔍 Verificando OJs já vinculados...
📋 OJs vinculados encontrados: 3
   1. Vara do Trabalho de São Paulo - 1ª Vara
   2. Tribunal Regional do Trabalho da 2ª Região
   3. Vara do Trabalho de Santos

✅ Verificando OJ: "Vara do Trabalho de Campinas"
❌ OJ não foi encontrado na lista de vinculados
🔗 Vinculando OJ: "Vara do Trabalho de Campinas"
✅ OJ vinculado com sucesso

✅ Verificando OJ: "Vara do Trabalho de São Paulo - 1ª Vara"
⚠️  OJ "Vara do Trabalho de São Paulo - 1ª Vara" já está vinculado - pulando vinculação
```

## 🚀 Próximos Passos

Para melhorias futuras, considerar:
- Interface para gerenciar OJs vinculados
- Opção para forçar re-vinculação
- Relatório detalhado de OJs por perito
- Backup automático antes de modificações