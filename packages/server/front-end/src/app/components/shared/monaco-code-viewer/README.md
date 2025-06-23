# Monaco Code Viewer Component

Este componente fornece uma interface bonita e moderna para exibir código com syntax highlighting usando o Monaco Editor (o mesmo editor do VS Code).

## Características

- **Syntax Highlighting**: Coloração automática de código baseada na linguagem
- **Temas**: Suporte a tema escuro e claro
- **Read-only**: Apenas visualização, sem edição
- **Responsivo**: Se adapta a diferentes tamanhos de tela
- **Copy to Clipboard**: Botão para copiar código com feedback visual
- **Altura Automática**: Ajusta a altura baseada no conteúdo
- **Fallback**: Funciona mesmo se o Monaco Editor falhar ao carregar

## Uso

```html
<app-monaco-code-viewer 
  [code]="seuCodigoAqui" 
  language="javascript"
  [showHeader]="true"
  theme="vs-dark">
</app-monaco-code-viewer>
```

## Propriedades

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `code` | string | `''` | O código a ser exibido |
| `language` | string | `'javascript'` | Linguagem para syntax highlighting |
| `showHeader` | boolean | `true` | Mostrar cabeçalho com botão de cópia |
| `height` | string | `'300px'` | Altura máxima do editor |
| `theme` | string | `'vs-dark'` | Tema do editor (`vs-dark` ou `vs`) |

## Linguagens Suportadas

O componente mapeia automaticamente as seguintes linguagens:

- **curl** → Shell (para comandos cURL)
- **bash/shell** → Shell 
- **javascript/js** → JavaScript
- **typescript/ts** → TypeScript
- **angular** → TypeScript (com configurações Angular)
- **react** → TypeScript (para componentes React)
- **json** → JSON
- **html** → HTML
- **css/scss** → CSS/SCSS

## Temas

### Tema Escuro (`vs-dark`)
- Fundo escuro (`#1e1e1e`)
- Ideal para código de exemplos
- Cores otimizadas para legibilidade

### Tema Claro (`vs`)
- Fundo claro (`#ffffff`)
- Ideal para documentação
- Contraste otimizado

## Exemplos de Uso

### Exemplo básico com JavaScript
```html
<app-monaco-code-viewer 
  [code]="javascriptCode" 
  language="javascript">
</app-monaco-code-viewer>
```

### Exemplo com cURL (sem cabeçalho)
```html
<app-monaco-code-viewer 
  [code]="curlCommand" 
  language="curl"
  [showHeader]="false">
</app-monaco-code-viewer>
```

### Exemplo com JSON (tema claro)
```html
<app-monaco-code-viewer 
  [code]="jsonData" 
  language="json"
  theme="vs">
</app-monaco-code-viewer>
```

## Métodos

### `updateCode(newCode: string, newLanguage?: string)`
Atualiza o código e opcionalmente a linguagem dinamicamente:

```typescript
@ViewChild(MonacoCodeViewerComponent) codeViewer!: MonacoCodeViewerComponent;

// Atualizar código
this.codeViewer.updateCode('console.log("Hello World");');

// Atualizar código e linguagem
this.codeViewer.updateCode('SELECT * FROM users;', 'sql');
```

## Configuração

O componente está configurado para usar o Monaco Editor via CDN para melhor performance:

```typescript
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
  }
});
```

## Fallback

Se o Monaco Editor falhar ao carregar, o componente automaticamente exibe o código em um elemento `<pre><code>` com estilização similar.

## Integração

Para usar este componente em outros módulos:

1. Importe o componente:
```typescript
import { MonacoCodeViewerComponent } from '../shared/monaco-code-viewer/monaco-code-viewer.component';

@Component({
  // ...
  imports: [MonacoCodeViewerComponent]
})
```

2. Use no template:
```html
<app-monaco-code-viewer [code]="seuCodigo" language="javascript"></app-monaco-code-viewer>
```

## Performance

- **Lazy Loading**: O Monaco Editor é carregado apenas quando necessário
- **CDN**: Recursos servidos via CDN para melhor cache
- **Altura Dinâmica**: Editor se ajusta ao conteúdo para economizar espaço
- **Cleanup**: Recursos são liberados automaticamente no destroy 