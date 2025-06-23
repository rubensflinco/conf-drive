import { Component, Input, OnInit, ElementRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as monaco from 'monaco-editor';
// Configuração do Monaco Editor
import loader from '@monaco-editor/loader';

@Component({
  selector: 'app-monaco-code-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="monaco-editor-container">
      <div class="monaco-editor-header" *ngIf="showHeader">
        <div class="d-flex justify-content-between align-items-center">
          <span class="badge bg-secondary">{{ getLanguageDisplayName() }}</span>
          <button class="btn btn-outline-secondary btn-sm" 
                  (click)="copyToClipboard()"
                  title="Copiar código">
            <i class="bi bi-copy"></i>
          </button>
        </div>
      </div>
      <div #monacoContainer class="monaco-editor-content"></div>
    </div>
  `,
  styleUrls: ['./monaco-code-viewer.component.scss']
})
export class MonacoCodeViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('monacoContainer', { static: true }) monacoContainer!: ElementRef;
  @Input() code: string = '';
  @Input() language: string = 'javascript';
  @Input() showHeader: boolean = true;
  @Input() height: string = '300px';
  @Input() theme: string = 'vs-dark';

  private editor: monaco.editor.IStandaloneCodeEditor | null = null;

  constructor() {
    // Configurar o Monaco Editor loader
    loader.config({
      paths: {
        vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
      }
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initializeMonaco();
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.dispose();
    }
  }

  private async initializeMonaco(): Promise<void> {
    try {
      // Aguardar o Monaco Editor carregar
      await loader.init();

      // Configurar tema personalizado
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'string', foreground: 'ce9178' },
          { token: 'keyword', foreground: '569cd6' },
          { token: 'number', foreground: 'b5cea8' },
          { token: 'comment', foreground: '6a9955' }
        ],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
          'editorLineNumber.foreground': '#858585',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#3a3d41'
        }
      });

      monaco.editor.defineTheme('custom-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'string', foreground: 'a31515' },
          { token: 'keyword', foreground: '0000ff' },
          { token: 'number', foreground: '098658' },
          { token: 'comment', foreground: '008000' }
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#000000',
          'editorLineNumber.foreground': '#237893',
          'editor.selectionBackground': '#add6ff',
          'editor.inactiveSelectionBackground': '#e5ebf1'
        }
      });

      // Criar o editor
      this.editor = monaco.editor.create(this.monacoContainer.nativeElement, {
        value: this.code,
        language: this.getMonacoLanguage(),
        theme: this.getEditorTheme(),
        readOnly: true,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineNumbers: 'on',
        folding: false,
        glyphMargin: false,
        contextmenu: false,
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'Consolas, "SF Mono", Monaco, Inconsolata, "Roboto Mono", "Source Code Pro", Menlo, "Courier New", monospace',
        padding: { top: 10, bottom: 10 },
        renderLineHighlight: 'none',
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          alwaysConsumeMouseWheel: false
        },
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: 'never',
          seedSearchStringFromSelection: 'never'
        }
      });

      // Ajustar altura automaticamente baseada no conteúdo
      this.adjustEditorHeight();

    } catch (error) {
      console.error('Erro ao inicializar Monaco Editor:', error);
      // Fallback para mostrar código em elemento pre
      this.showFallbackCode();
    }
  }

  private getEditorTheme(): string {
    if (this.theme === 'vs-dark') {
      return 'custom-dark';
    } else if (this.theme === 'vs') {
      return 'custom-light';
    }
    return this.theme;
  }

  private adjustEditorHeight(): void {
    if (!this.editor) return;

    const lineCount = this.editor.getModel()?.getLineCount() || 1;
    const lineHeight = 20;
    const padding = 20;
    const maxHeight = 500;
    const minHeight = 100;
    
    let calculatedHeight = (lineCount * lineHeight) + padding;
    calculatedHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
    
    this.monacoContainer.nativeElement.style.height = `${calculatedHeight}px`;
    this.editor.layout();
  }

  private showFallbackCode(): void {
    this.monacoContainer.nativeElement.innerHTML = `
      <pre class="fallback-code bg-dark text-light p-3 rounded"><code>${this.escapeHtml(this.code)}</code></pre>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private getMonacoLanguage(): string {
    const languageMap: { [key: string]: string } = {
      'curl': 'shell',
      'bash': 'shell',
      'shell': 'shell',
      'javascript': 'javascript',
      'js': 'javascript',
      'typescript': 'typescript',
      'ts': 'typescript',
      'angular': 'typescript',
      'react': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss'
    };

    return languageMap[this.language.toLowerCase()] || 'javascript';
  }

  getLanguageDisplayName(): string {
    const displayNames: { [key: string]: string } = {
      'curl': 'cURL',
      'bash': 'Bash',
      'shell': 'Shell',
      'javascript': 'JavaScript',
      'js': 'JavaScript',
      'typescript': 'TypeScript',
      'ts': 'TypeScript',
      'angular': 'Angular',
      'react': 'React',
      'jsx': 'React JSX',
      'tsx': 'React TSX',
      'json': 'JSON',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS'
    };

    return displayNames[this.language.toLowerCase()] || this.language;
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.code).then(() => {
      // Feedback visual temporário
      const button = document.querySelector('.monaco-editor-header button');
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="bi bi-check"></i>';
        setTimeout(() => {
          button.innerHTML = originalText;
        }, 1000);
      }
      console.log('Código copiado para a área de transferência');
    }).catch(err => {
      console.error('Erro ao copiar código: ', err);
    });
  }

  // Método para atualizar o código dinamicamente
  updateCode(newCode: string, newLanguage?: string): void {
    this.code = newCode;
    if (newLanguage) {
      this.language = newLanguage;
    }

    if (this.editor) {
      this.editor.setValue(this.code);
      if (newLanguage) {
        monaco.editor.setModelLanguage(this.editor.getModel()!, this.getMonacoLanguage());
      }
      this.adjustEditorHeight();
    }
  }
} 