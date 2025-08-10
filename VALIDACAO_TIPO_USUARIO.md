# Validação de Tipo de Usuário - Perito vs Servidor

## 📋 Resumo

Este documento explica como o sistema PJE Perito Automation detecta e valida se o CPF inserido pertence a um **Perito** ou a um **Servidor**, garantindo que apenas peritos sejam processados pelo sistema.

## 🔍 Processo de Validação

### 1. Momento da Verificação
A validação ocorre **após** clicar no ícone de edição do usuário encontrado, mas **antes** de tentar acessar a aba "Perito".

### 2. Indicadores de Servidor
O sistema verifica a presença dos seguintes elementos que indicam que o usuário é um **Servidor**:

#### Abas Específicas:
- ✅ Aba "Servidor"

#### Textos Indicadores:
- ✅ "Dados do Servidor"
- ✅ "Informações do Servidor"
- ✅ "Cadastro de Servidor"
- ✅ "Servidor Público"
- ✅ "Matrícula"
- ✅ "Cargo"
- ✅ "Lotação"

### 3. Indicadores de Perito
O sistema confirma que é um **Perito** verificando:
- ✅ Presença da aba "Perito"
- ✅ Ausência de indicadores de servidor

## 🚨 Comportamentos por Cenário

### ✅ Cenário 1: CPF de Perito (Válido)
```
🔍 Verificando tipo de usuário (Perito vs Servidor)...
✅ Confirmado: Usuário é um PERITO
✅ Clicou na aba Perito
[Continua o processo de vinculação]
```

### ❌ Cenário 2: CPF de Servidor (Inválido)
```
🔍 Verificando tipo de usuário (Perito vs Servidor)...
🔍 Indicador de servidor encontrado: text=Servidor
❌ ERRO: O CPF 123.456.789-00 pertence a um SERVIDOR, não a um PERITO. 
   Este sistema é específico para vinculação de PERITOS. 
   Verifique o CPF informado.
[Processo interrompido]
```

### ⚠️ Cenário 3: CPF de Tipo Desconhecido
```
🔍 Verificando tipo de usuário (Perito vs Servidor)...
⚠️ Aba "Perito" não encontrada. Verificando se é outro tipo de usuário...
📋 Abas disponíveis encontradas: ["Dados Pessoais", "Endereços", "Contatos"]
❌ ERRO: O CPF 123.456.789-00 não parece ser de um PERITO. 
   Abas disponíveis: Dados Pessoais, Endereços, Contatos. 
   Verifique se o CPF está correto.
[Processo interrompido]
```

### 🔄 Cenário 4: Erro na Verificação
```
🔍 Verificando tipo de usuário (Perito vs Servidor)...
⚠️ Erro na verificação de tipo de usuário: [erro técnico]
[Continua assumindo que é perito - comportamento de fallback]
```

## 🛡️ Benefícios da Validação

### 1. **Prevenção de Erros**
- Evita tentativas de vinculação em usuários incorretos
- Reduz tempo perdido com processamento inválido
- Melhora a confiabilidade do sistema

### 2. **Feedback Claro**
- Mensagens de erro específicas e informativas
- Orientação clara sobre o problema encontrado
- Sugestões para correção

### 3. **Robustez**
- Múltiplos indicadores para detecção precisa
- Sistema de fallback em caso de erro técnico
- Debug detalhado para troubleshooting

## 🔧 Implementação Técnica

### Localização do Código
**Arquivo:** `src/navigate.js`
**Função:** `processarPaginaPessoaFisica()`
**Linha:** Após clicar no ícone de edição

### Timeouts Utilizados
- **Verificação de aba Perito:** 3000ms
- **Verificação de aba Servidor:** 1000ms
- **Verificação de indicadores:** 500ms cada
- **Carregamento da página:** 3000ms

### Estratégia de Detecção
1. **Aguardar carregamento** da página de edição
2. **Verificar aba "Perito"** (indicador positivo)
3. **Verificar aba "Servidor"** (indicador negativo)
4. **Verificar textos específicos** de servidor
5. **Capturar abas disponíveis** para debug
6. **Decidir ação** baseada nos resultados

## 📝 Logs e Debug

### Logs de Sucesso
```
🔍 Verificando tipo de usuário (Perito vs Servidor)...
✅ Confirmado: Usuário é um PERITO
```

### Logs de Erro
```
🔍 Indicador de servidor encontrado: text=Servidor
❌ ERRO: O CPF pertence a um SERVIDOR...
```

### Logs de Debug
```
📋 Abas disponíveis encontradas: ["aba1", "aba2"]
⚠️ Erro na verificação de tipo de usuário: [detalhes]
```

## 🚀 Melhorias Futuras

### Possíveis Aprimoramentos
1. **Cache de validação** para CPFs já verificados
2. **Validação prévia** antes da busca
3. **Base de dados** de CPFs conhecidos
4. **Integração com API** de validação
5. **Relatório de tipos** encontrados

### Novos Indicadores
- Verificação de **cargo específico**
- Detecção de **órgão de lotação**
- Validação de **matrícula funcional**
- Análise de **permissões de acesso**

---

**Nota:** Esta validação garante que o sistema seja usado apenas para seu propósito específico: **vinculação de Órgãos Julgadores a Peritos**. Servidores possuem um fluxo diferente e não devem ser processados por este sistema.