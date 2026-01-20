import { registerAs } from '@nestjs/config';

import { ClientConfig } from '@/common/interfaces/config.interfaces.js';

export const clientConfig = registerAs(
  'client',
  (): ClientConfig => ({
    authServiceHost: process.env.AUTH_SERVICE_HOST,
    authServicePort: parseInt(process.env.AUTH_SERVICE_PORT ?? '8010', 10),
    portalServiceHost: process.env.PORTAL_SERVICE_HOST,
    portalServicePort: parseInt(process.env.PORTAL_SERVICE_PORT ?? '8210', 10),
  })
);
