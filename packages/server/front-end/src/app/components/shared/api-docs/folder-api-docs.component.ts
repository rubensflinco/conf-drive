import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { MonacoCodeViewerComponent } from '../monaco-code-viewer/monaco-code-viewer.component';

@Component({
  selector: 'app-folder-api-docs',
  standalone: true,
  imports: [CommonModule, RouterModule, MonacoCodeViewerComponent],
  templateUrl: './folder-api-docs.component.html',
  styleUrls: ['./folder-api-docs.component.scss']
})
export class FolderApiDocsComponent implements OnInit {
  folderId!: string;
  projectId!: string;
  folderName: string = '';
  projectName: string = '';
  apiUrl: string = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.folderId = params.get('folderId') || '';
      this.projectId = params.get('projectId') || '';
      
      // Em uma implementação real, você buscaria esses dados do servidor
      this.folderName = params.get('folderName') || 'Pasta';
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
    this.router.navigate(['/projects', this.projectId, 'folders', this.folderId]);
  }

  goToSecretsPage(): void {
    this.router.navigate(['/projects', this.projectId, 'secrets']);
  }

  getCurlExample(): string {
    return `curl -X GET "${this.apiUrl}/folders/${this.folderId}/keys" \\
  -H "X-API-Secret: SEU_SEGREDO_AQUI" \\
  -H "Content-Type: application/json"`;
  }

  getJavaScriptExample(): string {
    return `// Usando fetch API
const apiSecret = 'SEU_SEGREDO_AQUI';
const apiUrl = '${this.apiUrl}/folders/${this.folderId}/keys';

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
.then(keys => {
  console.log('Chaves da pasta:', keys);
  // Aqui você pode usar as chaves da pasta
  Object.entries(keys).forEach(([key, value]) => {
    console.log(\`\${key}: \${value}\`);
  });
})
.catch(error => {
  console.error('Erro ao buscar chaves:', error);
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

  getFolderKeys(folderId: string): Observable<any> {
    const headers = new HttpHeaders({
      'X-API-Secret': this.apiSecret,
      'Content-Type': 'application/json'
    });

    return this.http.get(\`\${this.apiUrl}/folders/\${folderId}/keys\`, { headers });
  }
}

// No seu component
import { Component, OnInit } from '@angular/core';
import { ConfigService } from './config.service';

@Component({
  selector: 'app-my-component',
  template: \`
    <div *ngFor="let key of configKeys | keyvalue">
      <strong>{{ key.key }}:</strong> {{ key.value }}
    </div>
  \`
})
export class MyComponent implements OnInit {
  configKeys: any = {};

  constructor(private configService: ConfigService) {}

  ngOnInit() {
    this.configService.getFolderKeys('${this.folderId}').subscribe({
      next: (keys) => {
        this.configKeys = keys;
        console.log('Chaves carregadas:', keys);
      },
      error: (error) => {
        console.error('Erro ao carregar chaves:', error);
      }
    });
  }
}`;
  }

  getReactExample(): string {
    return `// Hook personalizado para buscar chaves (ex: useFolderKeys.js)
import { useState, useEffect } from 'react';

const useFolderKeys = (folderId) => {
  const [keys, setKeys] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        setLoading(true);
        const response = await fetch(\`${this.apiUrl}/folders/\${folderId}/keys\`, {
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
        setKeys(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (folderId) {
      fetchKeys();
    }
  }, [folderId]);

  return { keys, loading, error };
};

// Componente React
import React from 'react';

const ConfigDisplay = ({ folderId }) => {
  const { keys, loading, error } = useFolderKeys(folderId);

  if (loading) return <div>Carregando chaves...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h3>Chaves da Pasta</h3>
      {Object.entries(keys).map(([key, value]) => (
        <div key={key}>
          <strong>{key}:</strong> {JSON.stringify(value)}
        </div>
      ))}
    </div>
  );
};

export default ConfigDisplay;`;
  }

  getResponseExample(): string {
    return `{
  "DATABASE_URL": "postgres://user:pass@localhost:5432/db",
  "API_KEY": "sk-123456789abcdef",
  "MAX_CONNECTIONS": 100,
  "ENABLE_CACHE": true,
  "CONFIG_OBJECT": {
    "feature1": true,
    "feature2": false,
    "timeout": 30
  }
}`;
  }
} 