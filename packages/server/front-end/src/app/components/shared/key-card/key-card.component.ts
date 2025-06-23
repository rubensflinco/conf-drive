import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectService, ConfigKey } from '../../../services/project.service';
import { LoadingService } from '../../../services/loading.service';
import { finalize } from 'rxjs/operators';

export interface ProjectInfo {
  id: string;
  name: string;
}

export interface FolderInfo {
  id: string;
  name: string;
}

@Component({
  selector: 'app-key-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './key-card.component.html',
  styleUrls: ['./key-card.component.scss']
})
export class KeyCardComponent {
  @Input() key!: ConfigKey;
  @Input() project?: ProjectInfo;
  @Input() folder?: FolderInfo;
  @Input() showLocation: boolean = false;
  @Input() showActions: boolean = true;
  @Input() clickable: boolean = false;
  @Input() truncateLimit: number = 50;

  constructor(
    private router: Router,
    private projectService: ProjectService,
    private loadingService: LoadingService
  ) {

  }

  getTypeClass(type: string): string {
    return `type-${type}`;
  }

  formatValue(value: any, type: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'json':
        try {
          return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2);
        } catch {
          return String(value);
        }
      case 'boolean':
        return value ? 'true' : 'false';
      case 'number':
        return String(value);
      default:
        return String(value);
    }
  }

  getTruncatedValue(value: string): string {
    if (value.length <= this.truncateLimit) {
      return value;
    }
    return value.substring(0, this.truncateLimit) + '...';
  }

  onCardClick(): void {
    console.log('Card clicked', { 
      clickable: this.clickable, 
      project: this.project, 
      folder: this.folder, 
      keyId: this.key.id 
    });
    
    if (this.clickable && this.project && this.folder && this.key.id) {
      const route = [
        '/projects', 
        this.project.id, 
        'folders', 
        this.folder.id,
        'keys',
        this.key.id,
        'edit'
      ];
      console.log('Navigating to:', route);
      this.router.navigate(route);
    }
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    console.log('Edit clicked', { 
      project: this.project, 
      folder: this.folder, 
      keyId: this.key.id 
    });
    
    if (this.project && this.folder && this.key.id) {
      const route = [
        '/projects', 
        this.project.id, 
        'folders', 
        this.folder.id,
        'keys',
        this.key.id,
        'edit'
      ];
      console.log('Navigating to edit:', route);
      this.router.navigate(route);
    } else {
      console.error('Missing required data for navigation:', {
        project: this.project,
        folder: this.folder,
        keyId: this.key.id
      });
    }
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation();
    console.log('Delete clicked', { keyId: this.key.id, keyName: this.key.name });
    
    if (!this.key.id) {
      console.error('ID da chave não encontrado');
      alert('Erro: ID da chave não encontrado');
      return;
    }

    const confirmMessage = `Tem certeza que deseja excluir a chave "${this.key.name}"?`;
    
    if (confirm(confirmMessage)) {
      console.log('Deleting key:', this.key.id);
      this.loadingService.show();
      
      this.projectService.deleteKey(this.key.id)
        .pipe(finalize(() => this.loadingService.hide()))
        .subscribe({
          next: (response) => {
            console.log('Delete response:', response);
            if (response.success) {
              alert('Chave excluída com sucesso!');
              // Recarregar a página ou emitir evento para atualizar a lista
              window.location.reload();
            } else {
              alert('Erro ao excluir chave: ' + (response.message || 'Erro desconhecido'));
            }
          },
          error: (err) => {
            console.error('Erro ao excluir chave:', err);
            alert('Erro ao excluir chave. Por favor, tente novamente.');
          }
        });
    }
  }

  getTypeLabel(type: string): string {
    const typeLabel = {
      'string': 'Texto',
      'number': 'Número',
      'boolean': 'Booleano',
      'json': 'JSON',
      'array': 'Array',
      'html': 'HTML',
      'css': 'CSS',
      'javascript': 'JavaScript',
      'color': 'Cor'
    }
    return typeLabel[type as keyof typeof typeLabel] || type;
  }
} 