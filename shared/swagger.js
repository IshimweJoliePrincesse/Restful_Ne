const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

function registerSwagger(app, { title, description, port, paths = {}, schemas = {} }) {
  const spec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: { title, version: '1.0.0', description },
      servers: [{ url: `http://localhost:${port}`, description: 'Development service' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string' },
              errors: { type: 'array', items: { type: 'object' } },
            },
          },
          ...schemas,
        },
      },
      paths,
    },
    apis: [],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
  return spec;
}

module.exports = { registerSwagger };
