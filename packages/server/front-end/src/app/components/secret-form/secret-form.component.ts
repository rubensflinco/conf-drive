import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SecretService, Secret } from '../../services/secret.service';
import { ProjectService } from '../../services/project.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-secret-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './secret-form.component.html',
  styleUrls: ['./secret-form.component.scss']
})
export class SecretFormComponent implements OnInit {
  projectId: string = '';
  projectName: string = '';
  secretId: string = '';
  isEditMode: boolean = false;
  
  error: string = '';
  successMessage: string = '';
  createdSecretValue: string = '';
  
  secretForm = {
    name: '',
    description: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private secretService: SecretService,
    private projectService: ProjectService,
    private loadingService: LoadingService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.projectId = params['projectId'];
      this.secretId = params['secretId'];
      this.isEditMode = !!this.secretId;
      
      if (this.projectId) {
        this.loadProject();
        
        if (this.isEditMode) {
          this.loadSecret();
        }
      }
    });
  }

  loadProject() {
    this.projectService.getProject(this.projectId).subscribe({
      next: (response) => {
        if (response.success && response.project) {
          this.projectName = response.project.name;
        }
      },
      error: (error) => {
        console.error('Erro ao carregar projeto:', error);
        this.error = 'Erro ao carregar projeto';
      }
    });
  }

  loadSecret() {
    // Para o modo de edição, precisamos buscar todos os segredos do projeto
    // e encontrar o específico
    this.secretService.getSecretsByProject(this.projectId).subscribe({
      next: (secrets) => {
        const secret = secrets.find(s => s.id === this.secretId);
        if (secret) {
          this.secretForm.name = secret.name;
          this.secretForm.description = secret.description;
        } else {
          this.error = 'Segredo não encontrado';
        }
      },
      error: (error) => {
        console.error('Erro ao carregar segredo:', error);
        this.error = 'Erro ao carregar segredo';
      }
    });
  }

  onSubmit() {
    if (!this.secretForm.name.trim() || !this.secretForm.description.trim()) {
      this.error = 'Nome e descrição são obrigatórios';
      return;
    }

    this.error = '';
    this.successMessage = '';

    if (this.isEditMode) {
      this.updateSecret();
    } else {
      this.createSecret();
    }
  }

  createSecret() {
    this.loadingService.show();
    this.secretService.createSecret({
      projectId: this.projectId,
      name: this.secretForm.name.trim(),
      description: this.secretForm.description.trim()
    }).subscribe({
      next: (secret) => {
        this.loadingService.hide();
        this.successMessage = 'Segredo criado com sucesso!';
        this.createdSecretValue = secret.value || '';
        
        // Limpar formulário
        this.secretForm = {
          name: '',
          description: ''
        };
      },
      error: (error) => {
        this.loadingService.hide();
        this.error = error;
      }
    });
  }

  updateSecret() {
    this.loadingService.show();
    this.secretService.updateSecret(this.secretId, {
      projectId: this.projectId,
      description: this.secretForm.description.trim()
    }).subscribe({
      next: () => {
        this.loadingService.hide();
        this.successMessage = 'Segredo atualizado com sucesso!';
        
        // Navegar de volta para a lista após 2 segundos
        setTimeout(() => {
          this.navigateToSecrets();
        }, 2000);
      },
      error: (error) => {
        this.loadingService.hide();
        this.error = error;
      }
    });
  }

  navigateToSecrets() {
    this.router.navigate(['/projects', this.projectId, 'secrets']);
  }

  navigateToProject() {
    this.router.navigate(['/projects', this.projectId, 'folders']);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Poderia mostrar um toast de sucesso aqui
    }).catch(err => {
      console.error('Erro ao copiar:', err);
    });
  }

  createAnotherSecret() {
    this.successMessage = '';
    this.createdSecretValue = '';
    this.secretForm = {
      name: '',
      description: ''
    };
  }
} 