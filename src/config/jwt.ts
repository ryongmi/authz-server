import { registerAs } from '@nestjs/config';

import * as fs from 'fs';

export const jwtConfig = registerAs('jwt', () => ({
  accessPublicKey: fs.readFileSync(process.env.JWT_ACCESS_PUBLIC_KEY_PATH!, 'utf-8'),
}));
