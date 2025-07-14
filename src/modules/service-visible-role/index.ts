export * from './entities/service-visible-role.entity.js';
export * from './service-visible-role.controller.js';
export * from './service-visible-role-tcp.controller.js';
export * from './service-visible-role.module.js';
export * from './service-visible-role.service.js';
export * from './service-visible-role.repository.js';
export * from './dtos/index.js';

// Re-export shared patterns and exceptions for convenience
export { ServiceVisibleRoleTcpPatterns } from '@krgeobuk/authz-relations/service-visible-role/tcp/patterns';
export { ServiceVisibleRoleException } from '@krgeobuk/authz-relations/service-visible-role/exception';
