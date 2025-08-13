# Correção do Seletor de Órgãos Julgadores - Automação de Servidores

## 🎯 Problema Identificado

O campo de seleção de órgãos julgadores na configuração da automação de servidores não estava funcionando. O seletor complexo com dropdown não abria para o usuário selecionar os OJs.

## ✅ Solução Implementada

Substituí o seletor complexo por um **campo de texto simples** (textarea), igual ao usado na automação de peritos, onde o usuário digita os órgãos julgadores linha por linha.

## 📝 Mudanças Realizadas

### 1. Interface HTML (`src/renderer/index.html`)

**ANTES:**
```html
<div class="form-group">
    <label>Órgãos Julgadores:</label>
    <div class="orgaos-selector">
        <div id="oj-selector-v2" class="oj-selector">
            <!-- Structure will be created dynamically by OJSelector class -->
        </div>
        <small>Selecione um ou mais órgãos julgadores do arquivo orgaos_pje.json</small>
    </div>
</div>
```

**DEPOIS:**
```html
<div class="form-group">
    <label for="v2-orgaos">Órgãos Julgadores (um por linha):</label>
    <textarea id="v2-orgaos" rows="6" placeholder="Digite os órgãos julgadores, um por linha:&#10;&#10;Exemplo:&#10;1ª Vara do Trabalho de Campinas&#10;2ª Vara do Trabalho de Campinas&#10;Vara do Trabalho de Jundiaí"></textarea>
    <div style="margin-top: 5px;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="app.loadExampleOJsV2()">
            <i class="fas fa-lightbulb"></i> Carregar Exemplos
        </button>
        <small style="margin-left: 10px;">Digite cada órgão julgador em uma linha separada</small>
    </div>
</div>
```

### 2. JavaScript (`src/renderer/script.js`)

#### Função `getServidorV2Config()` - Simplificada
- Removida a complexidade do seletor
- Agora lê diretamente do textarea
- Parse simples: uma linha = um OJ

```javascript
// Parse órgãos julgadores do textarea (um por linha)
const orgaos = orgaosText
    .split('\n')
    .map(linha => linha.trim())
    .filter(linha => linha.length > 0);
```

#### Função `populateServidorV2Form()` - Simplificada
- Remove toda a lógica complexa do seletor
- Popula diretamente o textarea com os OJs salvos

```javascript
// Populate órgãos no textarea (um por linha)
if (orgaosInput && config.orgaos && config.orgaos.length > 0) {
    orgaosInput.value = config.orgaos.join('\n');
}
```

#### Função `openServidorV2Modal()` - Simplificada
- Removida toda a inicialização complexa do seletor
- Agora apenas abre o modal e carrega a configuração

#### Nova Função `loadExampleOJsV2()`
- Carrega exemplos de OJs no textarea
- Facilita o teste e uso da funcionalidade

## 🚀 Vantagens da Nova Implementação

### ✅ **Simplicidade**
- Interface mais limpa e intuitiva
- Sem dependências complexas de JavaScript
- Funciona imediatamente sem inicialização

### ✅ **Confiabilidade**
- Não depende de carregamento de arquivos JSON
- Não tem problemas de timing ou inicialização
- Funciona mesmo se o arquivo `orgaos_pje.json` não carregar

### ✅ **Flexibilidade**
- Usuário pode digitar qualquer OJ, mesmo que não esteja na lista
- Permite copiar e colar listas de OJs
- Fácil edição e correção

### ✅ **Consistência**
- Interface idêntica à automação de peritos
- Usuários já conhecem como usar
- Padrão unificado na aplicação

## 📋 Como Usar

1. **Abrir Configuração**: Clique em "Configurar Automação" na aba Servidores
2. **Preencher CPF**: Digite o CPF do servidor
3. **Selecionar Perfil**: Escolha o perfil (ex: "Secretário de Audiência")
4. **Digitar OJs**: No campo "Órgãos Julgadores", digite um OJ por linha:
   ```
   1ª Vara do Trabalho de Campinas
   2ª Vara do Trabalho de Campinas
   Vara do Trabalho de Jundiaí
   ```
5. **Usar Exemplos**: Clique em "Carregar Exemplos" para ver exemplos
6. **Salvar**: Clique em "Salvar Configuração"

## 🧪 Teste da Funcionalidade

Para testar:
1. Execute `npm start`
2. Vá para a aba "Servidores"
3. Clique em "Configurar Automação"
4. Preencha os campos e teste o campo de OJs
5. Salve e verifique se a configuração é mantida

## 📊 Status

- ✅ **Interface HTML**: Atualizada
- ✅ **JavaScript**: Simplificado e funcional
- ✅ **Validação**: Implementada
- ✅ **Persistência**: Funcionando
- ✅ **Exemplos**: Botão implementado
- ✅ **Sintaxe**: Verificada e OK

## 🔄 Próximos Passos

A funcionalidade está pronta para uso. O sistema agora:
1. ✅ Permite configurar OJs de forma simples
2. ✅ Salva e carrega configurações corretamente
3. ✅ Valida se pelo menos um OJ foi informado
4. ✅ Passa os OJs para a automação V2

A automação de servidores agora tem uma interface consistente e funcional para seleção de órgãos julgadores!