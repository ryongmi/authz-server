import { Injectable, Inject } from '@nestjs/common';

import type { Redis } from 'ioredis';

import { BaseRedisService, REDIS_CLIENT_TOKEN } from '@krgeobuk/database-config/redis';

@Injectable()
export class RedisService extends BaseRedisService {
  constructor(@Inject(REDIS_CLIENT_TOKEN) redisClient: Redis) {
    super(redisClient);
  }
}
