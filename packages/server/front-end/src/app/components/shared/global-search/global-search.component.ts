import { Component, EventEmitter, Output, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProjectService } from '../../../services/project.service';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.scss'
})
export class GlobalSearchComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef<HTMLInputElement>;
  @Output() searchResults = new EventEmitter<any[]>();
  @Output() searchSubmitted = new EventEmitter<void>();
  @Input() initialSearchTerm: string = '';
  
  searchTerm: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialSearchTerm'] && changes['initialSearchTerm'].currentValue) {
      this.searchTerm = changes['initialSearchTerm'].currentValue;
    }
  }

  ngOnInit(): void {
    // Se houver termo inicial, defina-o
    if (this.initialSearchTerm) {
      this.searchTerm = this.initialSearchTerm;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchSubmit(): void {
    if (this.searchTerm.trim().length >= 2) {
      // Fechar o teclado virtual no mobile removendo o foco do input
      if (this.searchInput) {
        this.searchInput.nativeElement.blur();
      }
      
      this.router.navigate(['/search'], { 
        queryParams: { q: this.searchTerm.trim() } 
      });
      this.searchSubmitted.emit();
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
  }
} 