# Guia de Instalação - PJE Perito Automation

## 📋 Pré-requisitos

- **Node.js** versão 18 ou superior
- **npm** (incluído com Node.js)
- **Git** para clonar o repositório
- Sistema operacional: Windows, macOS ou Linux

## 🚀 Instalação

### 1. Clone o Repositório

```bash
git clone https://github.com/msribeiro2010/pje-perito-automation.git
cd pje-perito-automation
```

### 2. Instale as Dependências

```bash
npm install
```

**Nota:** O `node_modules` não está incluído no repositório para evitar arquivos grandes. A instalação das dependências é necessária.

### 3. Execute a Aplicação

```bash
npm start
```

## 🔧 Scripts Disponíveis

- `npm start` - Inicia a aplicação Electron
- `npm run build:win` - Gera executável para Windows
- `npm run build:mac` - Gera executável para macOS
- `npm run build:linux` - Gera executável para Linux
- `npm run build:all` - Gera executáveis para todas as plataformas
- `npm run dist` - Alias para build:all

## 📦 Gerando Executáveis

### Para Windows
```bash
npm run build:win
```
Gera:
- Instalador NSIS (.exe)
- Versão portátil (.exe)

### Para macOS
```bash
npm run build:mac
```
Gera:
- Arquivo DMG
- Arquivo ZIP

### Para Linux
```bash
npm run build:linux
```
Gera:
- AppImage
- Pacote DEB
- Pacote RPM

### Para Todas as Plataformas
```bash
npm run build:all
```

## 📁 Estrutura de Arquivos Gerados

Após o build, os executáveis serão criados em:
```
dist/
├── win-unpacked/          # Windows (descompactado)
├── mac/                   # macOS
├── linux-unpacked/        # Linux (descompactado)
├── PJE-Perito-Setup.exe   # Instalador Windows
├── PJE-Perito-Portable.exe # Portátil Windows
├── PJE-Perito.dmg         # Instalador macOS
└── PJE-Perito.AppImage    # Executável Linux
```

## ⚠️ Problemas Comuns

### Erro de Dependências
Se encontrar erros durante `npm install`:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Erro de Permissões (Linux/macOS)
```bash
sudo npm install -g electron
```

### Erro de Build
Verifique se todas as dependências estão instaladas:
```bash
npm audit fix
```

## 🔒 Segurança

- O arquivo `.env` não está incluído no repositório
- Dados sensíveis devem ser configurados localmente
- O `node_modules` é excluído do controle de versão

## 📝 Configuração

1. Configure os dados do perito em `data/perito.json`
2. Ajuste as configurações conforme necessário
3. Execute a aplicação

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique a documentação no README.md
2. Consulte os arquivos de documentação específicos
3. Abra uma issue no repositório GitHub

## 📊 Performance

O sistema inclui otimizações de performance:
- Timeouts reduzidos para maior velocidade
- Validação de tipo de usuário
- Detecção de OJs duplicados
- Processo 70-80% mais rápido que a versão original

Consulte `OTIMIZACOES_PERFORMANCE.md` e `OTIMIZACOES_ADICIONAIS.md` para detalhes.