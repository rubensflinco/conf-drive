import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingService } from '../../../services/loading.service';
import { ProjectService, ConfigKey } from '../../../services/project.service';
import { GlobalSearchComponent } from '../../shared/global-search/global-search.component';
import { KeyCardComponent } from '../../shared/key-card/key-card.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-folder-detail',
  templateUrl: './folder-detail.component.html',
  styleUrls: ['./folder-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalSearchComponent, KeyCardComponent]
})
export class FolderDetailComponent implements OnInit, OnDestroy {
  projectId: string | null = null;
  folderId: string | null = null;
  folderName: string = '';
  folderDescription: string = '';
  keys: ConfigKey[] = [];
  error: string | null = null;
  private routeSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Observar mudanças na rota
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      this.projectId = params.get('projectId');
      this.folderId = params.get('folderId');
      
      if (this.projectId && this.folderId) {
        this.loadFolder();
        this.loadKeys();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadFolder(): void {
    if (!this.projectId || !this.folderId) return;

    this.loadingService.show();
    this.projectService.getFolder(this.folderId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success && response.folder) {
            this.folderName = response.folder.name;
            this.folderDescription = response.folder.description || '';
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

  loadKeys(): void {
    if (!this.projectId || !this.folderId) return;

    this.loadingService.show();
    this.projectService.getKeys(this.folderId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.keys = response.keys;
          } else {
            this.error = response.message || 'Erro ao carregar chaves';
          }
        },
        error: (err) => {
          console.error('Erro ao carregar chaves:', err);
          this.error = 'Erro ao carregar chaves. Por favor, tente novamente.';
        }
      });
  }

  createNewKey(): void {
    if (this.projectId && this.folderId) {
      this.router.navigate(['/projects', this.projectId, 'folders', this.folderId, 'keys', 'new']);
    }
  }



  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      string: 'Texto',
      number: 'Número',
      boolean: 'Booleano',
      json: 'JSON',
      array: 'Array',
      html: 'HTML',
      css: 'CSS',
      javascript: 'JavaScript'
    };
    return labels[type] || type;
  }

  formatValue(key: ConfigKey): string {
    if (key.type === 'json' || key.type === 'array') {
      try {
        return JSON.stringify(JSON.parse(key.value), null, 2);
      } catch {
        return key.value;
      }
    }
    return String(key.value);
  }

  goBack(): void {
    if (this.projectId) {
      this.router.navigate(['/projects', this.projectId, 'folders']);
    }
  }

  navigateToFolderApiDocs(): void {
    this.router.navigate(['/projects', this.projectId, 'folders', this.folderId, 'api-docs']);
  }
} 