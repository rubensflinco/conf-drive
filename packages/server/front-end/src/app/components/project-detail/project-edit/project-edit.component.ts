import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService, Project } from '../../../services/project.service';
import { LoadingService } from '../../../services/loading.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-project-edit',
  templateUrl: './project-edit.component.html',
  styleUrls: ['./project-edit.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ProjectEditComponent implements OnInit {
  project: Project = {
    id: '',
    name: '',
    description: '',
    users: [],
    createdAt: '',
    updatedAt: ''
  };
  error: string | null = null;
  projectId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.loadProject();
    }
  }

  loadProject(): void {
    if (!this.projectId) return;

    this.loadingService.show();
    this.projectService.getProject(this.projectId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success && response.project) {
            this.project = response.project;
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

  updateProject(): void {
    if (!this.projectId || !this.isValidProject()) return;

    this.loadingService.show();
    this.projectService.updateProject(this.projectId, {
      name: this.project.name,
      description: this.project.description
    })
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success && response.project) {
            this.router.navigate(['/projects', this.projectId, 'folders']);
          } else {
            this.error = 'Erro ao atualizar projeto';
          }
        },
        error: (err) => {
          console.error('Erro ao atualizar projeto:', err);
          this.error = 'Erro ao atualizar projeto. Por favor, tente novamente.';
        }
      });
  }

  deleteProject(): void {
    if (!this.projectId) return;

    if (!confirm('Tem certeza que deseja excluir este projeto?')) {
      return;
    }

    this.loadingService.show();
    this.projectService.deleteProject(this.projectId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/projects']);
          } else {
            this.error = 'Erro ao excluir projeto';
          }
        },
        error: (err) => {
          console.error('Erro ao excluir projeto:', err);
          this.error = 'Erro ao excluir projeto. Por favor, tente novamente.';
        }
      });
  }

  isValidProject(): boolean {
    return this.project.name.trim().length > 0 && 
           this.project.description.trim().length > 0;
  }

  cancel(): void {
    if (this.projectId) {
      this.router.navigate(['/projects', this.projectId, 'folders']);
    } else {
      this.router.navigate(['/projects']);
    }
  }
} 