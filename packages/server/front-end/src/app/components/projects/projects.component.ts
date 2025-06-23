import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService, Project, Folder, CreateProjectDto } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { GlobalSearchComponent } from '../shared/global-search/global-search.component';
import { finalize } from 'rxjs/operators';

interface ProjectWithFolders extends Project {
  folders: Folder[];
}

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalSearchComponent]
})
export class ProjectsComponent implements OnInit {
  projects: ProjectWithFolders[] = [];
  error = '';
  isAdmin = false;
  loading = false;
  showNewProjectForm = false;
  newProject: CreateProjectDto = {
    name: '',
    description: ''
  };

  constructor(
    private projectService: ProjectService,
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService
  ) {
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.loading = true;
    this.loadingService.show();
    this.projectService.getProjects()
      .pipe(finalize(() => {
        this.loading = false;
        this.loadingService.hide();
      }))
      .subscribe({
        next: (projects) => {
          this.projects = projects.map(project => ({
            ...project,
            folders: project.folders || []
          })) as ProjectWithFolders[];
        },
        error: (err) => {
          this.error = err.error?.message || 'Erro ao carregar projetos';
        }
      });
  }

  isValidProject(): boolean {
    return this.newProject.name.trim().length > 0 && 
           this.newProject.description.trim().length > 0;
  }

  createProject() {
    if (!this.isValidProject() || !this.isAdmin) return;

    this.loading = true;
    this.loadingService.show();
    this.projectService.createProject(this.newProject)
      .pipe(finalize(() => {
        this.loading = false;
        this.loadingService.hide();
      }))
      .subscribe({
        next: (response) => {
          if (response.success && response.project) {
            this.projects.push({
              ...response.project,
              folders: []
            } as ProjectWithFolders);
            this.cancelNewProject();
          } else {
            this.error = 'Erro ao criar projeto';
          }
        },
        error: (err) => {
          this.error = err.error?.message || 'Erro ao criar projeto';
        }
      });
  }

  cancelNewProject() {
    this.showNewProjectForm = false;
    this.newProject = {
      name: '',
      description: ''
    };
  }

  openProject(projectId: string) {
    this.router.navigate([`/projects/${projectId}/folders`]);
  }

  openProjectSecrets(projectId: string) {
    this.router.navigate([`/projects/${projectId}/secrets`]);
  }

  editProject(projectId: string) {
    this.router.navigate([`/projects/${projectId}/edit`]);
  }

  deleteProject(id: string) {
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      this.loadingService.show();
      this.projectService.deleteProject(id)
        .pipe(finalize(() => this.loadingService.hide()))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.projects = this.projects.filter(p => p.id !== id);
            } else {
              this.error = 'Erro ao excluir projeto';
            }
          },
          error: (error) => {
            this.error = error.error?.message || 'Erro ao excluir projeto';
          }
        });
    }
  }
} 