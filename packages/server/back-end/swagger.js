const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ConfDrive API',
      version: '1.0.0',
      description: 'API de gerenciamento de configurações do ConfDrive',
      contact: {
        name: 'Suporte ConfDrive',
        email: 'suporte@confdrive.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'user'] }
          }
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            users: { 
              type: 'array',
              items: { type: 'string' }
            },
            createdAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Folder: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            projectId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Key: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['string', 'number', 'boolean', 'json', 'array', 'html', 'css', 'javascript', 'color'] },
            value: { type: 'string' },
            description: { type: 'string' },
            folderId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  msg: { type: 'string' },
                  param: { type: 'string' },
                  location: { type: 'string' }
                }
              }
            }
          }
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único do log'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Data e hora do log'
            },
            description: {
              type: 'string',
              description: 'Descrição da ação'
            },
            userId: {
              type: 'string',
              description: 'ID do usuário (opcional)'
            },
            projectId: {
              type: 'string',
              description: 'ID do projeto (opcional)'
            },
            keyId: {
              type: 'string',
              description: 'ID da chave (opcional)'
            },
            folderId: {
              type: 'string',
              description: 'ID da pasta (opcional)'
            }
          },
          example: {
            id: "1687654321000",
            timestamp: "2024-06-17T18:07:13.898Z",
            description: "Usuário criou novo projeto",
            userId: "user123",
            projectId: "proj456"
          }
        }
      }
    }
  },
  apis: [
    path.join(__dirname, 'routes', '*.js'), // Caminho absoluto para os arquivos de rota
  ]
};

module.exports = swaggerJsdoc(options); 