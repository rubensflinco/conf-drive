import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, ParamMap } from '@angular/router';
import { ProjectService, Project, ProjectResponse, Folder } from '../../services/project.service';
import { LoadingService } from '../../services/loading.service';
import { AuthService } from '../../services/auth.service';
import { finalize, timeout, catchError } from 'rxjs/operators';
import { Subscription, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GlobalSearchComponent } from '../shared/global-search/global-search.component';

declare var bootstrap: any;

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, GlobalSearchComponent]
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  project: Project | null = null;
  error: string | null = null;
  isAdmin: boolean = false;
  private routeSubscription?: Subscription;

  // Propriedades para o modal de criação de pasta
  newFolderName: string = '';
  folderNameError: string | null = null;

  // Propriedades para invalidação de cache
  invalidatingCache: boolean = false;
  cacheInvalidated: boolean = false;
  cacheInvalidationError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private loadingService: LoadingService,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Inscrever-se nas mudanças dos parâmetros da rota
    this.routeSubscription = this.route.paramMap.subscribe((params: ParamMap) => {
      const projectId = params.get('id');
      if (projectId) {
        this.loadProject(projectId);
        this.checkAdminStatus();
      }
    });
  }

  ngOnDestroy(): void {
    // Limpar a inscrição quando o componente for destruído
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadProject(projectId: string): void {
    this.loadingService.show();
    this.projectService.getProject(projectId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success && response.project) {
            this.project = response.project;
            this.loadFolders(projectId);
          } else {
            this.error = 'Erro ao carregar projeto';
            this.router.navigate(['/projects']);
          }
        },
        error: (err) => {
          console.error('Erro ao carregar projeto:', err);
          this.error = 'Erro ao carregar projeto. Por favor, tente novamente.';
          this.router.navigate(['/projects']);
        }
      });
  }

  loadFolders(projectId: string): void {
    this.loadingService.show();
    this.projectService.getFolders(projectId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (folders) => {
          if (this.project) {
            this.project.folders = folders;
          }
        },
        error: (err) => {
          console.error('Erro ao carregar pastas:', err);
          this.error = 'Erro ao carregar pastas do projeto';
        }
      });
  }

  checkAdminStatus(): void {
    this.isAdmin = this.authService.isAdmin();
  }

  openFolder(folderId: string): void {
    if (this.project) {
      this.router.navigate(['/projects', this.project.id, 'folders', folderId]);
    }
  }

  // Resetar o formulário quando o modal for aberto
  resetForm(): void {
    this.newFolderName = '';
    this.folderNameError = null;
  }

  // Fechar modal usando Bootstrap
  private closeModal(): void {
    const modalElement = document.getElementById('createFolderModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  confirmCreateFolder(): void {
    if (!this.project) return;

    // Validar nome da pasta
    if (!this.newFolderName?.trim()) {
      this.folderNameError = 'Por favor, digite um nome para a pasta.';
      return;
    }

    if (this.newFolderName.trim().length < 2) {
      this.folderNameError = 'O nome da pasta deve ter pelo menos 2 caracteres.';
      return;
    }

    // Verificar se já existe uma pasta com o mesmo nome
    if (this.project.folders?.some(folder => folder.name.toLowerCase() === this.newFolderName.trim().toLowerCase())) {
      this.folderNameError = 'Já existe uma pasta com este nome.';
      return;
    }

    // Limpar erro e criar pasta
    this.folderNameError = null;
    this.createFolder();
  }

  createFolder(): void {
    if (!this.project || !this.newFolderName?.trim()) return;

    this.loadingService.show();
    this.projectService.createFolder(this.project.id, { name: this.newFolderName.trim() })
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success && response.folder && this.project) {
            this.project.folders = [...(this.project.folders || []), response.folder];
            this.closeModal(); // Fechar modal usando Bootstrap
            this.resetForm(); // Limpar formulário
          }
        },
        error: (err) => {
          console.error('Erro ao criar pasta:', err);
          this.folderNameError = 'Erro ao criar pasta. Tente novamente.';
        }
      });
  }

  deleteFolder(folderId: string): void {
    if (!this.project) return;

    if (!confirm('Tem certeza que deseja deletar esta pasta?')) return;

    this.loadingService.show();
    this.projectService.deleteFolder(folderId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success && this.project) {
            this.project.folders = this.project.folders?.filter(f => f.id !== folderId) || [];
          }
        },
        error: (err) => {
          console.error('Erro ao deletar pasta:', err);
          this.error = 'Erro ao deletar pasta';
        }
      });
  }

  editProject(): void {
    if (this.project) {
      this.router.navigate(['/projects', this.project.id, 'edit']);
    }
  }

  navigateToProjectApiDocs(): void {
    if (this.project) {
      this.router.navigate(['/projects', this.project.id, 'api-docs']);
    }
  }

  navigateToFolderApiDocs(folderId: string, folderName: string): void {
    if (this.project) {
      this.router.navigate(['/projects', this.project.id, 'folders', folderId, 'api-docs']);
    }
  }

  /**
   * Confirma e executa a invalidação do cache via modal Bootstrap
   */
  confirmCacheInvalidation(): void {
    if (!this.project || this.invalidatingCache) return;

    // Fechar o modal
    this.closeConfirmationModal();
    
    // Executar a invalidação
    this.performCacheInvalidation();
  }

  /**
   * Fecha o modal de confirmação usando Bootstrap
   */
  private closeConfirmationModal(): void {
    const modalElement = document.getElementById('confirmCacheInvalidationModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  /**
   * Executa a invalidação do cache após confirmação
   */
  private performCacheInvalidation(): void {
    if (!this.project) return;

    console.log('Iniciando invalidação de cache para projeto:', this.project.id);

    this.invalidatingCache = true;
    this.cacheInvalidated = false;
    this.cacheInvalidationError = null;

    const url = `${environment.apiUrl}/cache/projects/${this.project.id}/invalidate`;
    console.log('URL da invalidação:', url);

    // Timeout de segurança para forçar fim do loading após 35 segundos
    const safetyTimeout = setTimeout(() => {
      if (this.invalidatingCache) {
        console.warn('Timeout de segurança ativado - forçando fim do loading');
        this.invalidatingCache = false;
        this.cacheInvalidationError = 'Timeout: A operação pode ter sido concluída, mas a resposta não foi recebida.';
      }
    }, 35000);
    
    this.http.post<any>(url, {})
      .pipe(
        timeout(30000), // Timeout de 30 segundos
        catchError((error) => {
          console.error('Erro capturado no pipe:', error);
          return throwError(error);
        }),
        finalize(() => {
          console.log('Finalizando invalidação de cache');
          this.invalidatingCache = false;
          clearTimeout(safetyTimeout);
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Resposta da invalidação:', response);
          console.log('Tipo da resposta:', typeof response);
          
          // Verificar diferentes formatos de resposta
          const isSuccess = response?.success === true || 
                           response?.status === 'success' ||
                           (response && typeof response === 'object' && !response.error) ||
                           response === true;

          if (isSuccess) {
            this.cacheInvalidated = true;
            console.log('Cache invalidado com sucesso');
            
            // Auto-hide success message after 5 seconds
            setTimeout(() => {
              this.cacheInvalidated = false;
              this.changeDetectorRef.detectChanges();
            }, 5000);
          } else {
            console.error('Resposta inválida:', response);
            this.cacheInvalidationError = response?.message || response?.error || 'Resposta inválida da API';
            this.changeDetectorRef.detectChanges();
          }
        },
        error: (err) => {
          console.error('Erro ao invalidar cache do projeto:', err);
          console.error('Status do erro:', err.status);
          console.error('Mensagem do erro:', err.message);
          
          // Verificar se é erro de timeout
          if (err.name === 'TimeoutError') {
            this.cacheInvalidationError = 'Timeout: A operação demorou mais que o esperado. Tente novamente.';
          } else if (err.status === 403) {
            this.cacheInvalidationError = 'Acesso negado. Você precisa ter permissões de administrador.';
          } else if (err.status === 401) {
            this.cacheInvalidationError = 'Não autorizado. Faça login novamente.';
          } else if (err.status === 404) {
            this.cacheInvalidationError = 'Projeto não encontrado.';
          } else if (err.status === 0) {
            this.cacheInvalidationError = 'Erro de conexão. Verifique sua conexão com a internet.';
          } else {
            this.cacheInvalidationError = `Erro ao invalidar cache: ${err.error?.message || err.message || 'Erro desconhecido'}`;
          }
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  /**
   * Abre a documentação da API do projeto
   */
  openApiDocs(): void {
    this.navigateToProjectApiDocs();
  }
} 