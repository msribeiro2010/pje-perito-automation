# Build Instructions - PJE Perito Automation

## Pré-requisitos

### Para todos os sistemas operacionais:
- Node.js 16.x ou superior
- npm ou yarn
- Git

### Para builds do Windows (no Windows ou usando Wine):
- NSIS (Nullsoft Scriptable Install System) para criar instaladores
- Windows SDK (opcional, para melhor integração)

### Para builds do macOS:
- Xcode Command Line Tools
- Certificado de desenvolvedor Apple (para distribuição)

### Para builds do Linux:
- Ferramentas de build padrão (build-essential no Ubuntu/Debian)

## Instalação das Dependências

```bash
# Instalar dependências do projeto
npm install

# Verificar se electron-builder está instalado globalmente (opcional)
npm install -g electron-builder
```

## Comandos de Build

### Desenvolvimento
```bash
# Executar em modo de desenvolvimento
npm run dev

# Testar a aplicação
npm start
```

### Build para Distribuição

#### Windows
```bash
# Build completo para Windows (NSIS installer + portable)
npm run build:win

# Apenas installer NSIS
npx electron-builder --win --x64 nsis

# Apenas versão portable
npx electron-builder --win --x64 portable
```

#### macOS
```bash
# Build para macOS (DMG)
npm run build:mac

# Build universal (Intel + Apple Silicon)
npx electron-builder --mac --universal
```

#### Linux
```bash
# Build para Linux (AppImage + DEB)
npm run build:linux

# Apenas AppImage
npx electron-builder --linux AppImage

# Apenas DEB package
npx electron-builder --linux deb
```

#### Todas as plataformas
```bash
# Build para todas as plataformas suportadas
npm run build:all
```

## Estrutura dos Arquivos Gerados

Após o build, os arquivos serão criados na pasta `dist/`:

### Windows:
- `PJE Perito Automation-1.0.0-win-x64.exe` - Installer NSIS (64-bit)
- `PJE Perito Automation-1.0.0-win-ia32.exe` - Installer NSIS (32-bit)
- `PJE Perito Automation-1.0.0-portable.exe` - Versão portable (64-bit)

### macOS:
- `PJE Perito Automation-1.0.0.dmg` - Imagem de disco para instalação
- `PJE Perito Automation-1.0.0-mac.zip` - Arquivo ZIP com a aplicação

### Linux:
- `PJE Perito Automation-1.0.0.AppImage` - AppImage (executável único)
- `pje-perito-automation_1.0.0_amd64.deb` - Pacote Debian

## Configurações Especiais

### Ícones
Os ícones estão localizados em `assets/`:
- `pje-icon.ico` - Ícone do Windows (256x256)
- `pje-icon.icns` - Ícone do macOS (múltiplas resoluções)
- `pje-icon.png` - Ícone do Linux (256x256)

### Certificação e Assinatura

#### Windows
Para evitar avisos de "publisher desconhecido", você pode:
1. Assinar o executável com um certificado de code signing
2. Configurar `certificateFile` e `certificatePassword` no package.json

#### macOS
Para distribuição na App Store ou evitar avisos de segurança:
1. Configurar certificado de desenvolvedor Apple
2. Ativar notarização automática

### Otimizações de Build

O build está configurado para:
- Excluir arquivos desnecessários (testes, documentação, etc.)
- Comprimir recursos para reduzir tamanho
- Incluir apenas dependências necessárias
- Otimizar para diferentes arquiteturas

## Solução de Problemas

### Erro: "Cannot find module electron"
```bash
npm install --save-dev electron
```

### Erro: "wine not found" (Linux/macOS building for Windows)
```bash
# Ubuntu/Debian
sudo apt install wine

# macOS
brew install wine
```

### Build muito lento
- Use `npm run build:dev` para builds de desenvolvimento
- Configure exclusões adicionais no package.json se necessário

### Erro de permissions (Linux/macOS)
```bash
# Dar permissões de execução
chmod +x dist/*.AppImage
```

## Distribuição

### Windows
- **Installer NSIS**: Recomendado para usuários finais
- **Portable**: Para uso em ambiente corporativo sem instalação

### macOS
- **DMG**: Padrão para distribuição no macOS
- Considere submeter para a App Store para maior confiabilidade

### Linux
- **AppImage**: Funciona em qualquer distribuição Linux moderna
- **DEB**: Para distribuições baseadas em Debian/Ubuntu

## Automação de Build

Para integração contínua (CI/CD), você pode usar:

```bash
# Build automatizado com logs
npm run build:all 2>&1 | tee build.log

# Upload para release (exemplo com GitHub Actions)
# Ver: .github/workflows/build.yml (se configurado)
```

## Notas Importantes

1. **Dependências Nativas**: Playwright será incluído automaticamente com os browsers necessários
2. **Tamanho**: O build final será ~200-300MB devido ao Chromium incluído
3. **Performance**: O primeiro boot pode ser mais lento devido à descompressão
4. **Atualizações**: Configure auto-updater se necessário (opcional)

## Suporte

Para problemas de build, verifique:
1. Versões das dependências (`npm ls`)
2. Logs completos do electron-builder
3. Configurações específicas da plataforma no package.json