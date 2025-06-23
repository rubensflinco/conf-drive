import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, User } from '../../services/user.service';
import { ProjectService } from '../../services/project.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  error: string = '';

  constructor(
    private userService: UserService,
    private projectService: ProjectService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loadingService.show();
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loadingService.hide();
      },
      error: (error) => {
        this.error = 'Erro ao carregar usuários';
        console.error(error);
        this.loadingService.hide();
      }
    });
  }

  navigateToCreateUser() {
    this.router.navigate(['/users/new']);
  }

  navigateToEditUser(user: User) {
    this.router.navigate(['/users', user.id, 'edit']);
  }

  deleteUser(user: User) {
    if (confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      this.loadingService.show();
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.loadUsers();
          this.loadingService.hide();
          
          // Notificar que os projetos dos usuários podem ter mudado
          this.projectService.notifyProjectsChanged();
        },
        error: (error) => {
          this.error = error.error?.message || 'Erro ao excluir usuário';
          this.loadingService.hide();
        }
      });
    }
  }

  getRoleBadgeClass(role: string): string {
    return role === 'admin' ? 'badge bg-danger' : 'badge bg-primary';
  }
} 