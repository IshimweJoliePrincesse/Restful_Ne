require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { logger, errorHandler, applySecurity } = require('shared');

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Service URLs define the upstream microservices reached through the gateway.
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const EXTINGUISHER_SERVICE_URL = process.env.EXTINGUISHER_SERVICE_URL || 'http://localhost:3003';
const INSPECTION_SERVICE_URL = process.env.INSPECTION_SERVICE_URL || 'http://localhost:3004';
const MAINTENANCE_SERVICE_URL = process.env.MAINTENANCE_SERVICE_URL || 'http://localhost:3005';
const REPORTING_SERVICE_URL = process.env.REPORTING_SERVICE_URL || 'http://localhost:3006';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';

// Gateway-level security protects all proxied routes before forwarding.
applySecurity(app, cors, helmet, logger, 'gateway');

// Swagger options provide the unified API documentation for frontend and testers.
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fire Extinguisher Management System API',
      version: '1.0.0',
      description: 'Unified API Gateway for Fire Extinguisher Management System microservices',
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Development server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['ADMIN', 'INSPECTOR', 'USER'] },
          },
        },
        FireExtinguisher: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            serialNumber: { type: 'string' },
            location: { type: 'string' },
            type: { type: 'string', enum: ['WATER', 'CO2', 'FOAM', 'DRY_CHEMICAL'] },
            size: { type: 'string', enum: ['2.5 lb', '5 lb', '9 lb', '12 lb'] },
            installationDate: { type: 'string', format: 'date-time' },
            expiryDate: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            extinguisherId: { type: 'string', format: 'uuid' },
            message: { type: 'string' },
            status: { type: 'string', enum: ['SENT', 'RESPONDED', 'IGNORED', 'ESCALATED'] },
            sentAt: { type: 'string', format: 'date-time' },
            respondedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        InspectionSchedule: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            extinguisherId: { type: 'string', format: 'uuid' },
            inspectorId: { type: 'string', format: 'uuid' },
            scheduledDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'OVERDUE'] },
          },
        },
        MaintenanceLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            extinguisherId: { type: 'string', format: 'uuid' },
            actionTaken: { type: 'string' },
            maintenanceDate: { type: 'string', format: 'date-time' },
            issuesIdentified: { type: 'string' },
            notes: { type: 'string' },
            recommendations: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    role: { type: 'string', enum: ['ADMIN', 'INSPECTOR', 'USER'] },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'User registered, OTP sent' } },
        },
      },
      '/auth/verify-otp': {
        post: {
          tags: ['Auth'],
          summary: 'Verify OTP and receive JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'otp'],
                  properties: {
                    email: { type: 'string' },
                    otp: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'OTP verified, JWT issued' } },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Login successful' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'User profile' } },
        },
      },
      '/auth/users': {
        get: {
          tags: ['Auth'],
          summary: 'List all users (Admin only)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'List of users' } },
        },
      },
      '/extinguishers': {
        get: {
          tags: ['Fire Extinguishers'],
          summary: 'List fire extinguishers',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'List of extinguishers' } },
        },
        post: {
          tags: ['Fire Extinguishers'],
          summary: 'Create a fire extinguisher',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FireExtinguisher' },
              },
            },
          },
          responses: { 201: { description: 'Extinguisher created' } },
        },
      },
      '/extinguishers/{id}': {
        get: {
          tags: ['Fire Extinguishers'],
          summary: 'Get extinguisher by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Extinguisher details' } },
        },
        put: {
          tags: ['Fire Extinguishers'],
          summary: 'Update extinguisher',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Extinguisher updated' } },
        },
        delete: {
          tags: ['Fire Extinguishers'],
          summary: 'Delete extinguisher',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Extinguisher deleted' } },
        },
      },
      '/users': {
        get: {
          tags: ['Users'],
          summary: 'List users with pagination, search, sort, and role filtering',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Paginated list of users' } },
        },
        post: {
          tags: ['Users'],
          summary: 'Create a user account (Admin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          responses: { 201: { description: 'User created' } },
        },
      },
      '/inspections': {
        get: {
          tags: ['Inspections'],
          summary: 'List inspection schedules with server-side table controls',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Paginated inspection schedules' } },
        },
        post: {
          tags: ['Inspections'],
          summary: 'Schedule an inspection and assign an inspector',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/InspectionSchedule' },
              },
            },
          },
          responses: { 201: { description: 'Inspection scheduled' } },
        },
      },
      '/maintenance': {
        get: {
          tags: ['Maintenance'],
          summary: 'List maintenance history with pagination and filters',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Paginated maintenance logs' } },
        },
        post: {
          tags: ['Maintenance'],
          summary: 'Create a maintenance log',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MaintenanceLog' },
              },
            },
          },
          responses: { 201: { description: 'Maintenance logged' } },
        },
      },
      '/reports/inventory': {
        get: {
          tags: ['Reports'],
          summary: 'Generate an inventory report',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Inventory report' } },
        },
      },
      '/reports/inspection': {
        get: {
          tags: ['Reports'],
          summary: 'Generate an inspection report',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Inspection report' } },
        },
      },
      '/reports/compliance': {
        get: {
          tags: ['Reports'],
          summary: 'Generate a compliance report',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Compliance report' } },
        },
      },
      '/reports/maintenance': {
        get: {
          tags: ['Reports'],
          summary: 'Generate a maintenance report',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Maintenance report' } },
        },
      },
      '/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'List notifications',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'List of notifications' } },
        },
      },
      '/notifications/respond/{id}': {
        post: {
          tags: ['Notifications'],
          summary: 'Respond to a notification',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Response recorded' } },
        },
      },
      '/notifications/trigger-check': {
        post: {
          tags: ['Notifications'],
          summary: 'Manually trigger expiry check (Admin only)',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Check completed' } },
        },
      },
      
    },
  },
  apis: [],
};

// Swagger UI exposes the gateway contract at /api-docs.
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root route advertises gateway health and configured service targets.
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Fire Extinguisher Management System - API Gateway',
    documentation: `/api-docs`,
    services: {
      auth: AUTH_SERVICE_URL,
      users: USER_SERVICE_URL,
      extinguisher: EXTINGUISHER_SERVICE_URL,
      inspection: INSPECTION_SERVICE_URL,
      maintenance: MAINTENANCE_SERVICE_URL,
      reporting: REPORTING_SERVICE_URL,
      notification: NOTIFICATION_SERVICE_URL,
    },
  });
});

// Health endpoint supports gateway availability checks.
app.get('/health', async (req, res) => {
  res.json({ success: true, service: 'gateway', status: 'healthy' });
});

// Proxy factory preserves request bodies and normalizes upstream failures.
function createServiceProxy(target, routePrefix) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => `${routePrefix}${path}`,
    on: {
      proxyReq: fixRequestBody,
      error: (err, req, res) => {
        logger.error(`Proxy error to ${target}: ${err.message}`);
        if (!res.headersSent) {
          res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
        }
      },
    },
  });
}

// Route mounts forward API groups to the appropriate microservice.
app.use('/auth', createServiceProxy(AUTH_SERVICE_URL, '/auth'));
app.use('/users', createServiceProxy(USER_SERVICE_URL, '/users'));
app.use('/extinguishers', createServiceProxy(EXTINGUISHER_SERVICE_URL, '/extinguishers'));
app.use('/inspections', createServiceProxy(INSPECTION_SERVICE_URL, '/inspections'));
app.use('/maintenance', createServiceProxy(MAINTENANCE_SERVICE_URL, '/maintenance'));
app.use('/reports', createServiceProxy(REPORTING_SERVICE_URL, '/reports'));
app.use('/notifications', createServiceProxy(NOTIFICATION_SERVICE_URL, '/notifications'));

// Shared error handler catches gateway-level failures.
app.use(errorHandler);

// Gateway startup binds the public API port and logs documentation location.
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Swagger documentation: http://localhost:${PORT}/api-docs`);
});
