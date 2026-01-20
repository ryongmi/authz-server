export interface DefaultConfig {
  mode: 'local' | 'development' | 'production' | undefined;
  port: number | undefined;
  corsOrigins: string | undefined;
}

export interface ClientConfig {
  authServiceHost: string | undefined;
  authServicePort: number | undefined;
  portalServiceHost: string | undefined;
  portalServicePort: number | undefined;
}

export interface MysqlConfig {
  host: string | undefined;
  port: number | undefined;
  username: string | undefined;
  password: string | undefined;
  name: string | undefined;
  synchronize: boolean;
  logging: boolean;
}

export interface RedisConfig {
  host: string | undefined;
  port: number | undefined;
  password: string | undefined;
  keyPrefix: string | undefined;
}

export interface JwtConfig {
  accessPublicKey: string | undefined;
}
