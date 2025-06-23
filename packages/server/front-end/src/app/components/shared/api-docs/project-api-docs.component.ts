import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { MonacoCodeViewerComponent } from '../monaco-code-viewer/monaco-code-viewer.component';

@Component({
  selector: 'app-project-api-docs',
  standalone: true,
  imports: [CommonModule, RouterModule, MonacoCodeViewerComponent],
  templateUrl: './project-api-docs.component.html',
  styleUrls: ['./project-api-docs.component.scss']
})
export class ProjectApiDocsComponent implements OnInit {
  projectId!: string;
  projectName: string = '';
  apiUrl: string = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.projectId = params.get('projectId') || '';
      
      // Em uma implementação real, você buscaria esses dados do servidor
      this.projectName = params.get('projectName') || 'Projeto';
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('URL copiada para a área de transferência');
    }).catch(err => {
      console.error('Erro ao copiar URL: ', err);
    });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'folders']);
  }

  goToSecretsPage(): void {
    this.router.navigate(['/projects', this.projectId, 'secrets']);
  }

  getCurlExample(): string {
    return `curl -X GET "${this.apiUrl}/projects/${this.projectId}/keys" \\
  -H "X-API-Secret: SEU_SEGREDO_AQUI" \\
  -H "Content-Type: application/json"`;
  }

  getJavaScriptExample(): string {
    return `// Usando fetch API
const apiSecret = 'SEU_SEGREDO_AQUI';
const apiUrl = '${this.apiUrl}/projects/${this.projectId}/keys';

fetch(apiUrl, {
  method: 'GET',
  headers: {
    'X-API-Secret': apiSecret,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  return response.json();
})
.then(projectKeys => {
  console.log('Chaves do projeto organizadas por pasta:', projectKeys);
  // Iterar sobre cada pasta e suas chaves
  Object.entries(projectKeys).forEach(([folderName, keys]) => {
    console.log(\`Pasta: \${folderName}\`);
    Object.entries(keys).forEach(([key, value]) => {
      console.log(\`  \${key}: \${value}\`);
    });
  });
})
.catch(error => {
  console.error('Erro ao buscar chaves do projeto:', error);
});`;
  }

  getAngularExample(): string {
    return `// No seu service (ex: config.service.ts)
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiUrl = '${this.apiUrl}';
  private apiSecret = 'SEU_SEGREDO_AQUI'; // Armazene de forma segura

  constructor(private http: HttpClient) {}

  getProjectKeys(projectId: string): Observable<any> {
    const headers = new HttpHeaders({
      'X-API-Secret': this.apiSecret,
      'Content-Type': 'application/json'
    });

    return this.http.get(\`\${this.apiUrl}/projects/\${projectId}/keys\`, { headers });
  }
}

// No seu component
import { Component, OnInit } from '@angular/core';
import { ConfigService } from './config.service';

@Component({
  selector: 'app-project-config',
  template: \`
    <div *ngFor="let folder of projectFolders | keyvalue">
      <h4>{{ folder.key }}</h4>
      <div *ngFor="let key of folder.value | keyvalue" class="ms-3">
        <strong>{{ key.key }}:</strong> {{ key.value }}
      </div>
    </div>
  \`
})
export class ProjectConfigComponent implements OnInit {
  projectFolders: any = {};

  constructor(private configService: ConfigService) {}

  ngOnInit() {
    this.configService.getProjectKeys('${this.projectId}').subscribe({
      next: (folders) => {
        this.projectFolders = folders;
        console.log('Chaves do projeto carregadas:', folders);
      },
      error: (error) => {
        console.error('Erro ao carregar chaves do projeto:', error);
      }
    });
  }
}`;
  }

  getReactExample(): string {
    return `// Hook personalizado para buscar chaves do projeto (ex: useProjectKeys.js)
import { useState, useEffect } from 'react';

const useProjectKeys = (projectId) => {
  const [folders, setFolders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjectKeys = async () => {
      try {
        setLoading(true);
        const response = await fetch(\`${this.apiUrl}/projects/\${projectId}/keys\`, {
          method: 'GET',
          headers: {
            'X-API-Secret': 'SEU_SEGREDO_AQUI', // Armazene no .env
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(\`HTTP error! status: \${response.status}\`);
        }

        const data = await response.json();
        setFolders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectKeys();
    }
  }, [projectId]);

  return { folders, loading, error };
};

// Componente React
import React from 'react';

const ProjectConfigDisplay = ({ projectId }) => {
  const { folders, loading, error } = useProjectKeys(projectId);

  if (loading) return <div>Carregando configurações do projeto...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h2>Configurações do Projeto</h2>
      {Object.entries(folders).map(([folderName, keys]) => (
        <div key={folderName} style={{ marginBottom: '2rem' }}>
          <h3>{folderName}</h3>
          <div style={{ marginLeft: '1rem' }}>
            {Object.entries(keys).map(([key, value]) => (
              <div key={key} style={{ marginBottom: '0.5rem' }}>
                <strong>{key}:</strong> {JSON.stringify(value)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectConfigDisplay;`;
  }

  getResponseExample(): string {
    return `{
  "Pasta Desenvolvimento": {
    "DATABASE_URL": "postgres://dev-user:pass@localhost:5432/dev_db",
    "API_KEY": "dev-sk-123456789abcdef",
    "DEBUG": true,
    "MAX_CONNECTIONS": 50
  },
  "Pasta Produção": {
    "DATABASE_URL": "postgres://prod-user:pass@db.example.com:5432/prod_db",
    "API_KEY": "prod-sk-987654321fedcba",
    "DEBUG": false,
    "MAX_CONNECTIONS": 100,
    "CACHE_CONFIG": {
      "ttl": 3600,
      "maxSize": 1000
    }
  },
  "Pasta Staging": {
    "DATABASE_URL": "postgres://staging-user:pass@staging.example.com:5432/staging_db",
    "API_KEY": "staging-sk-abcdef123456789",
    "DEBUG": true,
    "MAX_CONNECTIONS": 75
  }
}`;
  }
} 