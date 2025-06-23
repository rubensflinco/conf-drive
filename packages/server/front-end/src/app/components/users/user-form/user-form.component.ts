import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService, User } from '../../../services/user.service';
import { ProjectService } from '../../../services/project.service';
import { LoadingService } from '../../../services/loading.service';

interface Project {
  id: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit {
  projects: Project[] = [];
  error: string = '';
  editingUser: User | null = null;
  
  // Dados do formulário de criação/edição
  userForm = {
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    projects: [] as string[]
  };

  isEditing = false;
  userId: string | null = null;
  pageTitle = '';

  constructor(
    private userService: UserService,
    private projectService: ProjectService,
    private loadingService: LoadingService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEditing = !!this.userId;
    this.pageTitle = this.isEditing ? 'Editar Usuário' : 'Novo Usuário';
    
    this.loadProjects();
    
    if (this.isEditing) {
      this.loadUser();
    }
  }

  loadUser() {
    if (!this.userId) return;
    
    this.loadingService.show();
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.editingUser = users.find(u => u.id === this.userId) || null;
        if (this.editingUser) {
          this.userForm = {
            name: this.editingUser.name,
            email: this.editingUser.email,
            password: '',
            role: this.editingUser.role,
            projects: this.editingUser.projects.map(p => p.id)
          };
        } else {
          this.error = 'Usuário não encontrado';
        }
        this.loadingService.hide();
      },
      error: (error) => {
        this.error = 'Erro ao carregar usuário';
        console.error(error);
        this.loadingService.hide();
      }
    });
  }

  loadProjects() {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
      },
      error: (error) => {
        console.error('Erro ao carregar projetos:', error);
      }
    });
  }

  saveUser() {
    if (!this.validateForm()) {
      return;
    }

    this.loadingService.show();

    if (this.isEditing && this.editingUser) {
      // Atualizar usuário existente
      let updateData= {
        name: this.userForm.name,
        password: this.userForm?.password,
        role: this.userForm.role,
        projects: this.userForm.projects
      };

      this.userService.updateUser(this.editingUser.id, updateData).subscribe({
        next: () => {
          this.loadingService.hide();
          // Notificar que os projetos dos usuários podem ter mudado
          this.projectService.notifyProjectsChanged();
          this.router.navigate(['/users']);
        },
        error: (error) => {
          this.error = error.error?.message || 'Erro ao atualizar usuário';
          this.loadingService.hide();
        }
      });
    } else {
      // Criar novo usuário
      this.userService.createUser(this.userForm).subscribe({
        next: () => {
          this.loadingService.hide();
          // Notificar que os projetos dos usuários podem ter mudado
          this.projectService.notifyProjectsChanged();
          this.router.navigate(['/users']);
        },
        error: (error) => {
          this.error = error.error?.message || 'Erro ao criar usuário';
          this.loadingService.hide();
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/users']);
  }

  validateForm(): boolean {
    if (!this.userForm.name.trim()) {
      this.error = 'Nome é obrigatório';
      return false;
    }
    if (!this.userForm.email.trim()) {
      this.error = 'Email é obrigatório';
      return false;
    }
    if (!this.isEditing && !this.userForm.password.trim()) {
      this.error = 'Senha é obrigatória';
      return false;
    }
    if (this.userForm.password.length < 6 && this.userForm.password.length !== 0) {
      this.error = 'Senha deve ter no mínimo 6 caracteres';
      return false;
    }
    this.error = '';
    return true;
  }

  toggleProjectSelection(projectId: string) {
    const index = this.userForm.projects.indexOf(projectId);
    if (index > -1) {
      this.userForm.projects.splice(index, 1);
    } else {
      this.userForm.projects.push(projectId);
    }
  }

  isProjectSelected(projectId: string): boolean {
    return this.userForm.projects.includes(projectId);
  }
} 