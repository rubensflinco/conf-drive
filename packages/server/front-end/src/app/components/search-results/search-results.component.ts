import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProjectService, SearchResult } from '../../services/project.service';
import { GlobalSearchComponent } from '../shared/global-search/global-search.component';
import { KeyCardComponent, ProjectInfo, FolderInfo } from '../shared/key-card/key-card.component';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, GlobalSearchComponent, KeyCardComponent],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss'
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  searchResults: SearchResult[] = [];
  totalResults: number = 0;
  isLoading: boolean = false;
  error: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('SearchResultsComponent iniciado');
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (params) => {
          console.log('Parâmetros da URL:', params);
          const searchTerm = params['q'];
          if (searchTerm && searchTerm.trim()) {
            this.searchTerm = searchTerm.trim();
            this.performSearch(this.searchTerm);
          } else {
            console.log('Nenhum termo de busca encontrado, redirecionando...');
            this.router.navigate(['/projects']);
          }
        },
        error: (err) => {
          console.error('Erro ao obter parâmetros da URL:', err);
          this.error = 'Erro ao carregar página';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  performSearch(term: string): void {
    console.log('Iniciando busca por:', term);
    this.isLoading = true;
    this.error = '';
    this.searchResults = [];

    this.projectService.searchKeys(term, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Resposta da busca:', response);
          this.isLoading = false;
          if (response && response.success) {
            this.searchResults = response.results || [];
            this.totalResults = response.totalResults || 0;
            console.log(`Encontrados ${this.totalResults} resultados`);
          } else {
            this.error = response?.message || 'Erro na busca';
            console.error('Erro na resposta:', this.error);
          }
          this.changeDetectorRef.detectChanges();
        },
        error: (err) => {
          console.error('Erro na requisição de busca:', err);
          this.isLoading = false;
          this.error = 'Erro ao realizar busca. Tente novamente.';
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  formatValue(value: any, type: string): string {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'json':
        return JSON.stringify(value, null, 2);
      case 'boolean':
        return value ? 'true' : 'false';
      case 'number':
        return value.toString();
      default:
        return value.toString();
    }
  }

  getTypeClass(type: string): string {
    return `type-${type}`;
  }

  getBadgeClass(type: string): string {
    switch (type) {
      case 'string':
        return 'badge bg-primary';
      case 'number':
        return 'badge bg-success';
      case 'boolean':
        return 'badge bg-warning text-dark';
      case 'json':
        return 'badge bg-info';
      default:
        return 'badge bg-secondary';
    }
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }
} 