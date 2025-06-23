import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SecretService, Secret } from '../../services/secret.service';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-secrets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './secrets.component.html',
  styleUrls: ['./secrets.component.scss']
})
export class SecretsComponent implements OnInit {
  projectId: string = '';
  projectName: string = '';
  secrets: Secret[] = [];
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private secretService: SecretService,
    private projectService: ProjectService,
    private authService: AuthService,
    private loadingService: LoadingService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.projectId = params['projectId'];
      if (this.projectId) {
        this.loadProject();
        this.loadSecrets();
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
      }
    });
  }

  loadSecrets() {
    this.loadingService.show();
    this.secretService.getSecretsByProject(this.projectId).subscribe({
      next: (secrets) => {
        this.secrets = secrets;
        this.loadingService.hide();
      },
      error: (error) => {
        this.error = error;
        console.error(error);
        this.loadingService.hide();
      }
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  navigateToNewSecret() {
    this.router.navigate(['/projects', this.projectId, 'secrets', 'new']);
  }

  navigateToEditSecret(secret: Secret) {
    this.router.navigate(['/projects', this.projectId, 'secrets', secret.id, 'edit']);
  }

  deleteSecret(secret: Secret) {
    if (!this.isAdmin()) {
      this.error = 'Apenas administradores podem remover segredos';
      return;
    }

    const confirmMessage = `Tem certeza que deseja remover o segredo "${secret.name}"?\n\nEsta ação não pode ser desfeita e pode quebrar aplicações que dependem deste segredo.`;
    
    if (confirm(confirmMessage)) {
      this.loadingService.show();
      this.secretService.deleteSecret(secret.id, {
        projectId: this.projectId
      }).subscribe({
        next: () => {
          this.loadSecrets(); // Recarregar lista
          this.loadingService.hide();
        },
        error: (error) => {
          this.error = error;
          this.loadingService.hide();
        }
      });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('pt-BR');
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Poderia mostrar um toast de sucesso aqui
    }).catch(err => {
      console.error('Erro ao copiar:', err);
    });
  }

  navigateToProject() {
    this.router.navigate(['/projects', this.projectId, 'folders']);
  }
} 