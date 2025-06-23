import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-form.component.html',
  styles: []
})
export class ProjectFormComponent {
  projectForm: FormGroup;
  error = '';

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private router: Router,
    private loadingService: LoadingService
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.projectForm.valid) {
      this.error = '';
      this.loadingService.show();

      this.projectService.createProject(this.projectForm.value).subscribe({
        next: (project) => {
          this.loadingService.hide();
          // Navega para o novo projeto - o ProjectNavbarComponent detectará automaticamente
          this.router.navigate(['/projects', project.project?.id, 'folders']);
        },
        error: (error) => {
          this.error = error.error?.message || 'Erro ao criar projeto';
          this.loadingService.hide();
        }
      });
    }
  }

  onCancel() {
    this.router.navigate(['/projects']);
  }
} 