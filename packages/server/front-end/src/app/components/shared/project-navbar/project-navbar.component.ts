import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService, Project } from '../../../services/project.service';
import { LoadingService } from '../../../services/loading.service';
import { AuthService } from '../../../services/auth.service';
import { finalize } from 'rxjs/operators';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { GlobalSearchComponent } from '../global-search/global-search.component';

@Component({
  selector: 'app-project-navbar',
  templateUrl: './project-navbar.component.html',
  styleUrls: ['./project-navbar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, GlobalSearchComponent]
})
export class ProjectNavbarComponent implements OnInit, OnDestroy {
  @Input() sidebarCollapsed = false;
  @Input() isMobile = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() closeSidebar = new EventEmitter<void>();

  project?: Project;
  projects: Project[] = [];
  selectedProjectId: string | null = null;
  error: string | null = null;
  isAdmin = false;
  private routeSubscription?: Subscription;
  private projectsChangedSubscription?: Subscription;

  constructor(
    private projectService: ProjectService,
    private loadingService: LoadingService,
    private authService: AuthService,
    private router: Router
  ) {
    this.isAdmin = this.authService.isAdmin();
    this.detectCurrentProject();
  }

  ngOnInit(): void {
    this.loadProjects();

    // Escutar notificações de mudanças nos projetos
    this.projectsChangedSubscription = this.projectService.projectsChanged$.subscribe(() => {
      this.loadProjects();
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }

    if (this.projectsChangedSubscription) {
      this.projectsChangedSubscription.unsubscribe();
    }
  }

  detectCurrentProject(): void {
    // Detecta mudanças na rota para identificar o projeto atual
    this.routeSubscription = this.router.events.subscribe(() => {
      const url = this.router.url;
      const projectMatch = url.match(/\/projects\/([^\/]+)/);

      if (url.includes('projects')) {
        if (projectMatch && projectMatch[1] && projectMatch[1] !== 'new') {
          const projectId = projectMatch[1];
          this.selectedProjectId = projectId;
          this.loadCurrentProject(projectId);
        } else {
          this.project = undefined;
          this.selectedProjectId = null;
        }
      }
    });
  }

  loadCurrentProject(projectId: string): void {
    if (this.project?.id === projectId) {
      return; // Projeto já carregado
    }

    this.projectService.getProject(projectId)
      .subscribe({
        next: (response) => {
          if (response.success && response.project) {
            this.loadProjects();
            this.project = response.project;
          }
        },
        error: (err) => {
          console.error('Erro ao carregar projeto atual:', err);
          this.project = undefined;
        }
      });
  }

  loadProjects(): void {
    this.loadingService.show();
    this.projectService.getProjects()
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          this.projects = response;
          this.handleProjectSelection();
        },
        error: (err) => {
          console.error('Erro ao carregar projetos:', err);
          this.error = 'Erro ao carregar projetos';
        }
      });
  }

  handleProjectSelection(): void {
    // Verifica se já estamos em uma rota de projeto
    const url = this.router.url;
    const projectMatch = url.match(/\/projects\/([^\/]+)/);

    // Se não estiver em uma rota de projeto, não precisa redirecionar
    if(!url.includes('projects')){
      return;
    }

    if (projectMatch && projectMatch[1] && projectMatch[1] !== 'new') {
      // Já estamos em uma página de projeto, não precisa redirecionar
      return;
    }

    // Tenta recuperar o último projeto selecionado
    const lastProjectId = localStorage.getItem('lastProjectId');

    if (lastProjectId) {
      // Verifica se o projeto ainda existe
      const projectExists = this.projects.some(p => p.id === lastProjectId);
      if (projectExists) {
        this.selectedProjectId = lastProjectId;
        this.router.navigate(['/projects', lastProjectId, 'folders']);
        return;
      }
    }

    // Se não houver último projeto ou ele não existir mais
    if (this.projects.length > 0) {
      // Seleciona o primeiro projeto
      this.selectedProjectId = this.projects[0].id;
      localStorage.setItem('lastProjectId', this.projects[0].id);
      this.router.navigate(['/projects', this.projects[0].id, 'folders']);
    } else {
      // Redireciona para a página de projetos vazia
      this.router.navigate(['/projects']);
    }
  }

  onProjectChange(projectId: string): void {
    if (projectId === 'new') {
      this.router.navigate(['/projects/new']);
      return;
    }

    this.selectedProjectId = projectId;
    localStorage.setItem('lastProjectId', projectId);
    this.router.navigate(['/projects', projectId, 'folders']);
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  onSearchSubmitted(): void {
    // Fecha a sidebar no mobile após busca
    if (this.isMobile) {
      this.closeSidebar.emit();
    }
  }

  onNavLinkClick(): void {
    // Fecha a sidebar no mobile quando clicar em um link de navegação
    if (this.isMobile) {
      this.closeSidebar.emit();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
} 