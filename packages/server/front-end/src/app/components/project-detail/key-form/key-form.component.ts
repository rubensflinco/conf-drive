import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingService } from '../../../services/loading.service';
import { ProjectService, ConfigKey, CreateKeyDto } from '../../../services/project.service';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import loader from '@monaco-editor/loader';
import { ColorChromeModule } from 'ngx-color/chrome';
import { ColorEvent } from 'ngx-color';

@Component({
  selector: 'app-key-form',
  templateUrl: './key-form.component.html',
  styleUrls: ['./key-form.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ColorChromeModule]
})
export class KeyFormComponent implements OnInit, OnDestroy, AfterViewInit {
  projectId: string | null = null;
  folderId: string | null = null;
  keyId: string | null = null;
  folderName: string = '';
  error: string | null = null;
  jsonValidationError: string | null = null;
  isEditMode = false;
  private routeSubscription?: Subscription;
  private monacoEditor: any;
  
  // Propriedades para o sistema de cores
  showColorPicker = false;
  commonColors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#000000', '#FFFFFF', '#808080', '#800000', '#008000', '#000080',
    '#808000', '#800080', '#008080', '#C0C0C0', '#FFA500', '#FFC0CB',
    '#A52A2A', '#DEB887', '#5F9EA0', '#7FFF00', '#D2691E', '#FF7F50'
  ];

  @ViewChild('monacoEditor', { static: false }) monacoEditorRef!: ElementRef;

  keyForm: CreateKeyDto = {
    key: '',
    type: 'string',
    value: '',
    description: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private loadingService: LoadingService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      this.projectId = params.get('projectId');
      this.folderId = params.get('folderId');
      this.keyId = params.get('keyId');
      
      this.isEditMode = !!this.keyId;
      
      if (this.projectId && this.folderId) {
        this.loadFolder();
        if (this.isEditMode && this.keyId) {
          this.loadKey();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Inicializar o Monaco Editor para tipos que precisam de editor
    if (this.needsMonacoEditor(this.keyForm.type)) {
      setTimeout(() => {
        this.initMonacoEditor();
      }, 100);
    }
  }

  private needsMonacoEditor(type: string): boolean {
    return ['json', 'array', 'html', 'css', 'javascript'].includes(type);
  }

  private getLanguageConfig(type: string): { language: string; defaultValue: string } {
    switch (type) {
      case 'json':
        return { language: 'json', defaultValue: '{\n  \n}' };
      case 'array':
        return { language: 'json', defaultValue: '[\n  \n]' };
      case 'html':
        return { language: 'html', defaultValue: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Título</title>\n</head>\n<body>\n  \n</body>\n</html>' };
      case 'css':
        return { language: 'css', defaultValue: '/* Estilos CSS */\n.classe {\n  \n}' };
      case 'javascript':
        return { language: 'javascript', defaultValue: '// Código JavaScript\nfunction exemplo() {\n  \n}' };
      default:
        return { language: 'text', defaultValue: '' };
    }
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.monacoEditor) {
      this.monacoEditor.dispose();
    }
  }

  private async initMonacoEditor(): Promise<void> {
    // Verificar se o elemento existe e se o tipo precisa do editor
    if (!this.monacoEditorRef || !this.monacoEditorRef.nativeElement || !this.needsMonacoEditor(this.keyForm.type)) {
      return;
    }
    
    // Se já existe um editor, destruir primeiro
    if (this.monacoEditor) {
      try {
        this.monacoEditor.dispose();
        this.monacoEditor = null;
      } catch (error) {
        console.warn('Erro ao destruir Monaco Editor existente:', error);
      }
    }

    try {
      // Configurar Monaco Environment para funcionar corretamente
      (window as any).MonacoEnvironment = {
        getWorker: function (moduleId: string, label: string) {
          // Desabilitar workers para evitar erros de CORS
          return {
            postMessage: () => {},
            terminate: () => {},
            addEventListener: () => {},
            removeEventListener: () => {}
          };
        }
      };

      // Configurar o loader
      loader.config({
        paths: { 
          vs: '/assets/monaco-editor/min/vs' 
        }
      });

      const monaco = await loader.init();
      
      // Desabilitar workers para evitar erros
      monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
        customWorkerPath: undefined
      });
      
      monaco.languages.typescript.javascriptDefaults.setWorkerOptions({
        customWorkerPath: undefined
      });

      // Configurar validação JSON apenas se for JSON ou Array
      if (this.keyForm.type === 'json' || this.keyForm.type === 'array') {
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          enableSchemaRequest: false,
          schemas: [],
          allowComments: false
        });
      }

      // Determinar linguagem e valor padrão
      const { language, defaultValue } = this.getLanguageConfig(this.keyForm.type);

      // Criar o editor
      this.monacoEditor = monaco.editor.create(this.monacoEditorRef.nativeElement, {
        value: String(this.keyForm.value) || defaultValue,
        language: language,
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false }, // Desabilitar minimap para melhor performance
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        lineNumbers: 'on',
        folding: true,
        formatOnPaste: true,
        formatOnType: true,
        renderLineHighlight: 'line',
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        tabSize: 2,
        insertSpaces: true,
        bracketPairColorization: {
          enabled: true
        },
        padding: { top: 10, bottom: 10 },
        mouseWheelZoom: false,
        cursorStyle: 'line',
        selectOnLineNumbers: true,
        contextmenu: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true
      });

      // Listener para mudanças no conteúdo
      this.monacoEditor.onDidChangeModelContent(() => {
        const value = this.monacoEditor.getValue();
        this.keyForm.value = value;
        
        // Validar conteúdo se necessário
        this.validateContent();
      });

      // Formatar automaticamente quando perder o foco
      this.monacoEditor.onDidBlurEditorText(() => {
        try {
          const value = this.monacoEditor?.getValue()?.trim();
          if (value) {
            const parsed = JSON.parse(value);
            const formatted = JSON.stringify(parsed, null, 2);
            if (formatted !== value) {
              this.monacoEditor.setValue(formatted);
            }
          }
        } catch (error) {
          // Não formatar se o JSON for inválido
          console.debug('JSON inválido, não formatando:', error);
        }
      });

      // Validar conteúdo inicial
      this.validateContent();

    } catch (error) {
      console.error('Erro ao inicializar Monaco Editor:', error);
      
      // Fallback: mostrar erro para o usuário
      this.error = 'Erro ao carregar o editor JSON. Por favor, recarregue a página.';
    }
  }

  onTypeChange(): void {
    this.jsonValidationError = null;
    
    // Se mudou para um tipo que precisa do Monaco Editor
    if (this.needsMonacoEditor(this.keyForm.type)) {
      // Aguardar o próximo ciclo de detecção de mudanças
      setTimeout(() => {
        this.initMonacoEditor();
      }, 100);
    } else {
      // Destruir Monaco Editor se existe
      if (this.monacoEditor) {
        this.monacoEditor.dispose();
        this.monacoEditor = null;
      }
    }
    
    // Definir valores padrão para novos tipos
    if (!this.isEditMode) {
      switch (this.keyForm.type) {
        case 'string':
          this.keyForm.value = '';
          break;
        case 'number':
          this.keyForm.value = 0;
          break;
        case 'boolean':
          this.keyForm.value = false;
          break;
        case 'json':
          this.keyForm.value = '{\n  \n}';
          break;
        case 'array':
          this.keyForm.value = '[\n  \n]';
          break;
        case 'html':
          this.keyForm.value = '<!DOCTYPE html>\n<html>\n<head>\n  <title>Título</title>\n</head>\n<body>\n  \n</body>\n</html>';
          break;
        case 'css':
          this.keyForm.value = '/* Estilos CSS */\n.classe {\n  \n}';
          break;
        case 'javascript':
          this.keyForm.value = '// Código JavaScript\nfunction exemplo() {\n  \n}';
          break;
        case 'color':
          this.keyForm.value = '#000000';
          break;
      }
    }
  }

  loadFolder(): void {
    if (!this.folderId) return;

    this.loadingService.show();
    this.projectService.getFolder(this.folderId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success && response.folder) {
            this.folderName = response.folder.name;
          } else {
            this.error = response.message || 'Erro ao carregar pasta';
          }
        },
        error: (err) => {
          console.error('Erro ao carregar pasta:', err);
          this.error = 'Erro ao carregar pasta. Por favor, tente novamente.';
        }
      });
  }

  loadKey(): void {
    if (!this.keyId) return;

    this.loadingService.show();
    this.projectService.getKey(this.keyId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success && response.key) {
            this.keyForm = {
              key: response.key.name,
              type: response.key.type,
              value: (['json', 'array'].includes(response.key.type))
                ? JSON.stringify(response.key.value, null, 2) 
                : response.key.value,
              description: response.key.description || ''
            };
            
            // Se for um tipo que precisa do Monaco Editor, inicializar após carregar os dados
            if (this.needsMonacoEditor(this.keyForm.type)) {
              setTimeout(() => {
                this.initMonacoEditor();
              }, 100);
            }
          } else {
            this.error = response.message || 'Erro ao carregar chave';
          }
        },
        error: (err) => {
          console.error('Erro ao carregar chave:', err);
          this.error = 'Erro ao carregar chave. Por favor, tente novamente.';
        }
      });
  }

  saveKey(): void {
    if (!this.isValidKey()) return;

    if (this.isEditMode) {
      this.updateKey();
    } else {
      this.createKey();
    }
  }

  createKey(): void {
    if (!this.folderId) return;

    const keyData: CreateKeyDto = {
      key: this.keyForm.key,
      type: this.keyForm.type,
      value: this.keyForm.value,
      description: this.keyForm.description
    };

    this.loadingService.show();
    this.projectService.createKey(this.folderId, keyData)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.goBack();
          } else {
            this.error = response.message || 'Erro ao criar chave';
          }
        },
        error: (err) => {
          console.error('Erro ao criar chave:', err);
          this.error = err.error?.message || 'Erro ao criar chave. Por favor, tente novamente.';
        }
      });
  }

  updateKey(): void {
    if (!this.keyId) return;

    const updateData: Partial<ConfigKey> = {
      name: this.keyForm.key,
      type: this.keyForm.type,
      value: (['json', 'array'].includes(this.keyForm.type))
        ? JSON.parse(this.keyForm.value) 
        : this.keyForm.value,
      description: this.keyForm.description
    };

    this.loadingService.show();
    this.projectService.updateKey(this.keyId, updateData)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.goBack();
          } else {
            this.error = response.message || 'Erro ao atualizar chave';
          }
        },
        error: (err) => {
          console.error('Erro ao atualizar chave:', err);
          this.error = err.error?.message || 'Erro ao atualizar chave. Por favor, tente novamente.';
        }
      });
  }

  validateContent(): void {
    this.validateJSON();
  }

  validateJSON(): void {
    if (!['json', 'array'].includes(this.keyForm.type)) {
      this.jsonValidationError = null;
      this.changeDetectorRef.detectChanges();
      return;
    }

    const value = String(this.keyForm.value).trim() || '';
    
    if (!value) {
      this.jsonValidationError = 'JSON não pode estar vazio';
      this.changeDetectorRef.detectChanges();
      return;
    }

    try {
      const parsedValue = JSON.parse(value);
      
      // Validar se é array quando o tipo é array
      if (this.keyForm.type === 'array' && !Array.isArray(parsedValue)) {
        this.jsonValidationError = 'O valor deve ser um array válido (ex: ["item1", "item2"])';
        this.changeDetectorRef.detectChanges();
        return;
      }
      
      this.jsonValidationError = null;
      this.changeDetectorRef.detectChanges();
      
      // Limpar marcadores de erro no editor se existir
      if (this.monacoEditor) {
        const monaco = (window as any).monaco;
        if (monaco) {
          try {
            monaco.editor.setModelMarkers(this.monacoEditor.getModel(), 'json-validation', []);
          } catch (error) {
            console.debug('Erro ao limpar marcadores:', error);
          }
        }
      }
    } catch (error: any) {
      // Criar mensagem de erro mais amigável
      let errorMessage = error.message || 'Erro de sintaxe JSON';
      
      // Traduzir algumas mensagens comuns
      const translations: { [key: string]: string } = {
        'Unexpected token': 'Token inesperado',
        'Unexpected end of JSON input': 'JSON incompleto - verifique se fechou todas as chaves e colchetes',
        'Expected property name or': 'Esperado nome de propriedade ou',
        'Expected': 'Esperado',
        'Unexpected': 'Inesperado'
      };

      for (const [en, pt] of Object.entries(translations)) {
        if (errorMessage.includes(en)) {
          errorMessage = errorMessage.replace(en, pt);
        }
      }
      
      this.jsonValidationError = `JSON inválido: ${errorMessage}`;
      this.changeDetectorRef.detectChanges();
      
      // Adicionar marcador de erro visual no editor se disponível
      if (this.monacoEditor) {
        const monaco = (window as any).monaco;
        if (monaco) {
          try {
            // Tentar determinar a posição do erro
            let errorLine = 1;
            let errorColumn = 1;
            
            // Extrair informações de posição do erro se disponível
            const match = error.message.match(/at position (\d+)/);
            if (match) {
              const position = parseInt(match[1]);
              const lines = value.substring(0, position).split('\n');
              errorLine = lines.length;
              errorColumn = lines[lines.length - 1].length + 1;
            }
            
            monaco.editor.setModelMarkers(this.monacoEditor.getModel(), 'json-validation', [{
              severity: monaco.MarkerSeverity.Error,
              startLineNumber: errorLine,
              startColumn: errorColumn,
              endLineNumber: errorLine,
              endColumn: errorColumn + 1,
              message: errorMessage
            }]);
          } catch (markerError) {
            console.debug('Erro ao definir marcadores:', markerError);
          }
        }
      }
    }
  }

  isValidKey(): boolean {
    if (!this.keyForm.key.trim()) return false;
    
    try {
      if (['json', 'array'].includes(this.keyForm.type) && this.keyForm.value) {
        const parsedValue = JSON.parse(this.keyForm.value);
        
        // Se é array, verificar se realmente é um array
        if (this.keyForm.type === 'array' && !Array.isArray(parsedValue)) {
          return false;
        }
        
        return this.jsonValidationError === null;
      }
      return true;
    } catch {
      return false;
    }
  }

  goBack(): void {
    if (this.projectId && this.folderId) {
      this.router.navigate(['/projects', this.projectId, 'folders', this.folderId]);
    }
  }

  // Métodos para gerenciar cores
  getValidColorForDisplay(value: string): string {
    // Para o display, aceitar mais formatos e tentar validar
    if (typeof value !== 'string' || !value.startsWith('#')) {
      return '#000000';
    }
    
    // Se é um hex válido de 6 dígitos, usar ele
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      return value;
    }
    
    // Se é um hex válido de 3 dígitos, expandir para 6
    if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
      return '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
    }
    
    // Se tem 4 ou 5 caracteres, tentar completar com 'f'
    if (/^#[0-9A-Fa-f]{4,5}$/.test(value)) {
      const missing = 6 - (value.length - 1);
      return value + 'f'.repeat(missing);
    }
    
    // Caso contrário, retornar preto
    return '#000000';
  }

  toggleColorPicker(): void {
    this.showColorPicker = !this.showColorPicker;
  }

  selectCommonColor(color: string): void {
    this.keyForm.value = color;
    // Fechar o color picker se estiver aberto
    this.showColorPicker = false;
  }

  onColorChangeComplete(event: ColorEvent): void {
    this.keyForm.value = event.color.hex;
  }
} 