# ConfDrive

Este é um monorepo contendo os seguintes pacotes:

- `@conf-drive/server`: Servidor Express com API e interface Angular
- `@conf-drive/sdk`: SDK para consumo da API
- `@conf-drive/docs`: Documentação do projeto usando Docusaurus


--------------

NodeJS v 24.1.0

--------------

## Estrutura do Projeto

```
conf-drive/
├── packages/
│   ├── server/        # Servidor Express + Angular
│   ├── sdk/          # SDK para consumo da API
│   └── docs/         # Documentação (Docusaurus)
├── package.json
└── README.md
```

## Instalação

```bash
npm install
```

## Desenvolvimento

Para iniciar o desenvolvimento, você pode usar os seguintes comandos:

```bash
# Iniciar o servidor
npm run dev --workspace=@conf-drive/server

# Iniciar a documentação
npm run start --workspace=@conf-drive/docs
```

## Build

```bash
npm run build
``` 