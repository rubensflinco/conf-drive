import { ChangeDetectorRef, Component, OnInit, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ProjectNavbarComponent } from './components/shared/project-navbar/project-navbar.component';
import { LoadingModalComponent } from './components/shared/loading-modal/loading-modal.component';
import { BottomNavComponent } from './components/shared/bottom-nav/bottom-nav.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterOutlet, ProjectNavbarComponent, LoadingModalComponent, BottomNavComponent]
})
export class AppComponent implements OnInit {
  title = 'conf-drive';
  sidebarCollapsed = false;
  isMobile = false;
  private _isAuthenticated = false;
  currentProjectId: string | null = null;

  constructor(
    private router: Router, 
    private authService: AuthService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.checkScreenSize();
    this.detectCurrentProject();
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this._isAuthenticated = !!user;
      this.changeDetectorRef.detectChanges();
      if(!this.isAuthenticated) {
        this.router.navigate(['/login']);
      }
    });
  }

  private detectCurrentProject(): void {
    this.router.events.subscribe(() => {
      const url = this.router.url;
      const projectMatch = url.match(/\/projects\/([^\/]+)/);
      
      if (projectMatch && projectMatch[1] && projectMatch[1] !== 'new') {
        this.currentProjectId = projectMatch[1];
      } else {
        this.currentProjectId = null;
      }
    });
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated || this.authService.isAuthenticated();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;
    
    // Só fecha a sidebar quando muda de desktop para mobile
    if (!wasMobile && this.isMobile) {
      // Mudou de desktop para mobile - fechar sidebar
      this.sidebarCollapsed = true;
    } else if (wasMobile && !this.isMobile) {
      // Mudou de mobile para desktop - abrir sidebar
      this.sidebarCollapsed = false;
    }
    // Se já estava no mobile e continua no mobile, não altera o estado da sidebar
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  openSidebar() {
    this.sidebarCollapsed = false;
  }

  closeSidebar() {
    if (this.isMobile) {
      this.sidebarCollapsed = true;
    }
  }
} 