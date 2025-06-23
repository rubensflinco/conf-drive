import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Project {
  id: string;
  name: string;
  description: string;
  users: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  folders?: Folder[];
}

export interface ProjectWithFolders extends Project {
  folders: Folder[];
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  keys?: ConfigKey[];
}

export interface ConfigKey {
  id: string;
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array' | 'html' | 'css' | 'javascript' | 'color';
  description?: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectResponse {
  success: boolean;
  project?: Project;
  message?: string;
}

export interface ProjectsResponse {
  success: boolean;
  projects: Project[];
  message?: string;
}

export interface FolderResponse {
  success: boolean;
  folder?: Folder;
  message?: string;
}

export interface FoldersResponse {
  success: boolean;
  folders: Folder[];
  message?: string;
}

export interface CreateProjectDto {
  name: string;
  description: string;
}

export interface CreateFolderDto {
  name: string;
  description?: string;
}

export interface CreateKeyDto {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array' | 'html' | 'css' | 'javascript' | 'color';
  description?: string;
}

export interface KeysResponse {
  success: boolean;
  keys: ConfigKey[];
  message?: string;
}

interface KeyResponse {
  success: boolean;
  key?: ConfigKey;
  message?: string;
}

export interface SearchResult {
  key: ConfigKey;
  folder: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  totalResults: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = environment.apiUrl;
  private projectsChangedSubject = new Subject<void>();

  // Observable para notificar mudanças nos projetos
  public projectsChanged$ = this.projectsChangedSubject.asObservable();

  constructor(private http: HttpClient) {}

  getProjects(): Observable<Project[]> {
    return this.http.get<ProjectsResponse>(`${this.apiUrl}/projects`)
      .pipe(map(response => response.projects));
  }

  getAllProjects(): Observable<Project[]> {
    return this.http.get<ProjectsResponse>(`${this.apiUrl}/projects/admin/all`)
      .pipe(map(response => response.projects));
  }

  getProject(id: string): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(`${this.apiUrl}/projects/${id}`);
  }

  createProject(project: CreateProjectDto): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(`${this.apiUrl}/projects`, project);
  }

  updateProject(id: string, project: Partial<Project>): Observable<ProjectResponse> {
    return this.http.put<ProjectResponse>(`${this.apiUrl}/projects/${id}`, project);
  }

  deleteProject(id: string): Observable<ProjectResponse> {
    return this.http.delete<ProjectResponse>(`${this.apiUrl}/projects/${id}`);
  }

  getFolders(projectId: string): Observable<Folder[]> {
    return this.http.get<FoldersResponse>(`${this.apiUrl}/folders/project/${projectId}`)
      .pipe(map(response => response.folders));
  }

  getFolder(id: string): Observable<FolderResponse> {
    return this.http.get<FolderResponse>(`${this.apiUrl}/folders/${id}`);
  }

  createFolder(projectId: string, folder: CreateFolderDto): Observable<FolderResponse> {
    return this.http.post<FolderResponse>(`${this.apiUrl}/folders`, { ...folder, projectId });
  }

  updateFolder(id: string, folder: Partial<Folder>): Observable<FolderResponse> {
    return this.http.put<FolderResponse>(`${this.apiUrl}/folders/${id}`, folder);
  }

  deleteFolder(id: string): Observable<FolderResponse> {
    return this.http.delete<FolderResponse>(`${this.apiUrl}/folders/${id}`);
  }

  getKeys(folderId: string): Observable<KeysResponse> {
    return this.http.get<KeysResponse>(`${this.apiUrl}/keys/folder/${folderId}`);
  }

  getKey(keyId: string): Observable<KeyResponse> {
    return this.http.get<KeyResponse>(`${this.apiUrl}/keys/${keyId}`);
  }

  createKey(folderId: string, key: CreateKeyDto): Observable<KeyResponse> {
    const keyData = {
      folderId,
      name: key.key,
      type: key.type,
      value: key.value,
      description: key.description
    };
    return this.http.post<KeyResponse>(`${this.apiUrl}/keys`, keyData);
  }

  updateKey(id: string, key: Partial<ConfigKey>): Observable<KeyResponse> {
    return this.http.put<KeyResponse>(`${this.apiUrl}/keys/${id}`, key);
  }

  deleteKey(id: string): Observable<{success: boolean, message?: string}> {
    return this.http.delete<{success: boolean, message?: string}>(`${this.apiUrl}/keys/${id}`);
  }

  // Método para buscar chaves globalmente
  searchKeys(searchTerm: string, limit: number = 20): Observable<SearchResponse> {
    return this.http.get<SearchResponse>(`${this.apiUrl}/keys/search`, {
      params: {
        q: searchTerm,
        limit: limit.toString()
      }
    });
  }

  // Método para notificar que os projetos foram alterados
  notifyProjectsChanged(): void {
    this.projectsChangedSubject.next();
  }
} 