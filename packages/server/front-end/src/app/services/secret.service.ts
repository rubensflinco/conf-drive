import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Secret {
  id: string;
  name: string;
  description: string;
  value?: string; // Only available during creation
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CreateSecretRequest {
  projectId: string;
  name: string;
  description: string;
}

export interface UpdateSecretRequest {
  projectId: string;
  description: string;
}

export interface DeleteSecretRequest {
  projectId: string;
}

@Injectable({
  providedIn: 'root'
})
export class SecretService {
  private apiUrl = `${environment.apiUrl}/secrets`;
  private secretsSubject = new BehaviorSubject<Secret[]>([]);
  public secrets$ = this.secretsSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Lista todos os segredos de um projeto
   */
  getSecretsByProject(projectId: string): Observable<Secret[]> {
    return new Observable(observer => {
      this.http.get<{success: boolean, secrets: Secret[]}>(`${this.apiUrl}/project/${projectId}`, {
        headers: this.getHeaders()
      }).subscribe({
        next: (response) => {
          if (response.success) {
            this.secretsSubject.next(response.secrets);
            observer.next(response.secrets);
          } else {
            observer.error('Erro ao carregar segredos');
          }
          observer.complete();
        },
        error: (error) => {
          console.error('Erro ao carregar segredos:', error);
          observer.error(error.error?.message || 'Erro ao carregar segredos');
        }
      });
    });
  }

  /**
   * Cria um novo segredo
   */
  createSecret(request: CreateSecretRequest): Observable<Secret> {
    return new Observable(observer => {
      this.http.post<{success: boolean, secret: Secret, message: string}>(this.apiUrl, request, {
        headers: this.getHeaders()
      }).subscribe({
        next: (response) => {
          if (response.success) {
            observer.next(response.secret);
          } else {
            observer.error(response.message || 'Erro ao criar segredo');
          }
          observer.complete();
        },
        error: (error) => {
          console.error('Erro ao criar segredo:', error);
          observer.error(error.error?.message || 'Erro ao criar segredo');
        }
      });
    });
  }

  /**
   * Atualiza um segredo
   */
  updateSecret(secretId: string, request: UpdateSecretRequest): Observable<Secret> {
    return new Observable(observer => {
      this.http.put<{success: boolean, secret: Secret, message: string}>(`${this.apiUrl}/${secretId}`, request, {
        headers: this.getHeaders()
      }).subscribe({
        next: (response) => {
          if (response.success) {
            observer.next(response.secret);
          } else {
            observer.error(response.message || 'Erro ao atualizar segredo');
          }
          observer.complete();
        },
        error: (error) => {
          console.error('Erro ao atualizar segredo:', error);
          observer.error(error.error?.message || 'Erro ao atualizar segredo');
        }
      });
    });
  }

  /**
   * Remove um segredo (apenas admin)
   */
  deleteSecret(secretId: string, request: DeleteSecretRequest): Observable<void> {
    return new Observable(observer => {
      this.http.delete<{success: boolean, message: string}>(`${this.apiUrl}/${secretId}`, {
        headers: this.getHeaders(),
        body: request
      }).subscribe({
        next: (response) => {
          if (response.success) {
            observer.next();
          } else {
            observer.error(response.message || 'Erro ao remover segredo');
          }
          observer.complete();
        },
        error: (error) => {
          console.error('Erro ao remover segredo:', error);
          observer.error(error.error?.message || 'Erro ao remover segredo');
        }
      });
    });
  }

  /**
   * Notifica que os segredos foram alterados
   */
  notifySecretsChanged(): void {
    // Força uma nova busca dos segredos atuais se existe um projeto selecionado
    // Este método pode ser chamado após operações de create/update/delete
  }

  /**
   * Limpa os segredos do subject
   */
  clearSecrets(): void {
    this.secretsSubject.next([]);
  }
} 