import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { confDrive } from '../../../packages/sdk/src/index';
import defaultValues from '../assets/default-values.json';

// Interface para a estrutura exata que vem da API
interface ConfigData {
  Inicio?: {
    tituloPagina?: string;
    subtituloPagina?: string;
    corTema?: string;
    conteudoHtml?: string;
    footer?: {
      mostrar: boolean;
      texto: string;
    };
  };
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  // Estado simples da aplicação
  config: ConfigData = {}; // Dados diretos da API ou defaults
  isLoading = false;
  error: string | null = null;
  cacheStats: any = null;
  events: string[] = [];
  mostrarDebug = false;

  // ID do projeto de exemplo
  private readonly projectId = '1750609423361';

  constructor(
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.initializeApp();
  }

  ngOnDestroy(): void {
    // SDK cuida da limpeza automaticamente
  }

  /**
   * Inicializa a aplicação de forma ULTRA simples
   */
  private async initializeApp(): Promise<void> {
    try {
      // ========== CONFIGURAÇÃO ULTRA SIMPLES DO SDK ==========
      // Cache obrigatório com TTL configurável! 🎉
      confDrive.setup({
        apiUrl: 'http://localhost:3000/api',
        apiSecret: '4383bc93c7c092cda5bbe55f4930299c70288375c50dd3c5d9b30633eef6aa06',
        defaultValues: defaultValues, // Defaults obrigatórios
        cacheTTL: 5 * 60 * 1000, // TTL: 5 minutos (0 = sempre recarrega)
        validationInterval: 30 * 1000 // Intervalo de validação: 30 segundos
      });

      // Setup listeners de debug (opcional)
      this.setupEventListeners();

      // Carregar configuração inicial
      await this.loadConfig();

    } catch (error) {
      console.error('Erro ao inicializar app:', error);
      this.error = error instanceof Error ? error.message : 'Erro na inicialização';
      this.isLoading = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  /**
   * Carregar configuração inicial - CACHE COM EVENTOS AUTOMÁTICOS!
   */
  private async loadConfig(forceRefresh: boolean = false): Promise<void> {
    try {
      this.isLoading = !forceRefresh; // Só mostrar loading se não for refresh
      this.error = null;

      // 🎉 NOVO SISTEMA BASEADO EM CACHE + EVENTOS!
      // - Sempre retorna IMEDIATAMENTE (cache ou defaults)
      // - API atualiza cache em background
      // - Evento 'cache:update' dispara quando API responde
      // - View atualiza automaticamente via evento!
      this.config = await confDrive.get(this.projectId, forceRefresh);
      console.log("🚀 ~ AppComponent ~ loadConfig ~ this.config:", this.config)
      
      this.addEvent(`✅ Dados iniciais: ${this.config.Inicio?.tituloPagina || 'Padrão'}`);

      // Aplicar tema inicial
      this.applyTheme();

      // Obter estatísticas do cache (opcional)
      this.cacheStats = await confDrive.getCacheStats();
      
      this.isLoading = false;
      this.changeDetectorRef.detectChanges();

    } catch (error) {
      console.error('Erro inesperado:', error);
      this.error = error instanceof Error ? error.message : 'Erro inesperado';
      this.isLoading = false;
      this.addEvent(`❌ Erro inesperado: ${this.error}`);
      this.changeDetectorRef.detectChanges();
    }
  }

  /**
   * Aplicar tema da configuração
   */
  private applyTheme(): void {
    if (this.config.Inicio?.corTema) {
      document.documentElement.style.setProperty('--primary-color', this.config.Inicio.corTema);
      const style = document.createElement('style');
      style.textContent = `:root { --bs-primary: ${this.config.Inicio.corTema}; }`;
      document.head.appendChild(style);
    }
  }

  /**
   * Configurar listeners de eventos - NOVO SISTEMA BASEADO EM CACHE
   */
  private setupEventListeners(): void {
    // 🎉 EVENTO PRINCIPAL: Quando o cache é atualizado com novos dados da API
    confDrive.on('cache:update', (data: any) => {
      console.log("🎉 Cache atualizado com novos dados da API:", data)
      this.config = data.data; // Atualiza automaticamente!
      this.applyTheme(); // Aplica novo tema se mudou
      this.addEvent(`✅ Cache atualizado: ${data.projectId || data.folderId}`);
      this.changeDetectorRef.detectChanges(); // Força atualização da view
    });
  }

  /**
   * Adicionar evento ao log de debug
   */
  private addEvent(event: string): void {
    console.info(event);
    this.events = [...this.events, `${new Date().toLocaleTimeString()}: ${event}`];
    
    // Manter apenas os últimos 10 eventos
    if (this.events.length > 10) {
      this.events.shift();
    }
    this.changeDetectorRef.detectChanges();
  }

  /**
   * Recarregar configuração - SDK gerencia tudo!
   */
  async recarregar(): Promise<void> {
    this.addEvent(`🔄 Recarregando configuração...`);
    await this.loadConfig(true);
  }

  /**
   * Invalidar cache usando o novo sistema remoto
   */
  async invalidarCache(): Promise<void> {
    try {
      this.isLoading = true;
      
      // Invalidar cache remotamente usando o novo sistema
      const response = await confDrive.forceRemoteCacheInvalidation(this.projectId);
      
      this.addEvent(`🗑️ Cache invalidado remotamente: ${response.message}`);
      
      // Aguardar um pouco para a invalidação se propagar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recarregar configuração forçando refresh
      await this.loadConfig(true);
      
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Erro ao invalidar cache';
      this.isLoading = false;
      this.addEvent(`❌ Erro ao invalidar cache: ${this.error}`);
      this.changeDetectorRef.detectChanges();
    }
  }

  /**
   * Forçar validação imediata - testa nova funcionalidade!
   */
  async forcarValidacao(): Promise<void> {
    try {
      this.addEvent('🔍 Forçando validação imediata...');
      
      // Nova funcionalidade: força validação imediata
      await confDrive.forceValidation();
      
      this.addEvent('✅ Validação imediata concluída');
      
      // Atualizar stats
      this.cacheStats = await confDrive.getCacheStats();
      this.changeDetectorRef.detectChanges();
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro na validação';
      this.addEvent(`❌ Erro na validação: ${errorMsg}`);
      this.changeDetectorRef.detectChanges();
    }
  }

  /**
   * Alternar painel de debug
   */
  toggleDebug(): void {
    this.mostrarDebug = !this.mostrarDebug;
    this.addEvent(`🐛 Debug ${this.mostrarDebug ? 'ativado' : 'desativado'}`);
  }

  /**
   * Formatar estatísticas do cache
   */
  formatarEstatisticasCache(): string {
    if (!this.cacheStats) return 'Sem estatísticas';
    
    const stats = this.cacheStats;
    return `Itens: ${stats.totalItems} | Tamanho: ${Math.round(stats.estimatedSize / 1024)} KB`;
  }

  /**
   * Obter classe CSS do status
   */
  getStatusClass(): string {
    if (this.isLoading) return 'warning';
    if (this.error) return 'danger';
    if (this.config?.Inicio?.tituloPagina) return 'success';
    return 'secondary';
  }

  /**
   * Obter texto do status
   */
  getStatusText(): string {
    if (this.isLoading) return 'Carregando...';
    if (this.error) return 'Erro';
    if (this.config?.Inicio?.tituloPagina) return 'Conectado';
    return 'Sem dados';
  }
} 