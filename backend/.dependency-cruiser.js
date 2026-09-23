/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-domain-imports',
      comment: 'Disallow direct imports between domains. Interactions must go through Ports or Integration Events.',
      severity: 'error',
      from: { path: '^src/domains/([^/]+)' },
      to: {
        path: '^src/domains/([^/]+)',
        pathNot: [
          '^src/domains/shared',
          '^src/domains/$1' // Allow self-domain imports
        ]
      }
    },
    {
      name: 'domain-layer-isolation',
      comment: 'Domain layer entities and business logic must not depend on NestJS framework or DB ORM adapters.',
      severity: 'error',
      from: { path: '^src/domains/[^/]+/domain' },
      to: {
        path: ['node_modules/@nestjs', 'node_modules/prisma', 'node_modules/typeorm']
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json'
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+'
      }
    }
  }
};
