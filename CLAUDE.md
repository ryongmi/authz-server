# CLAUDE.md - Authorization Server

이 파일은 authz-server 작업 시 Claude Code의 가이드라인을 제공합니다.

## 서비스 개요

authz-server는 krgeobuk 생태계의 중앙 권한 관리 서비스로, RBAC(Role-Based Access Control) 기반의 완전한 권한 시스템을 담당합니다.

### MVP 완료 상태
- **HTTP API 서버** (포트 8100) - REST API 제공
- **TCP 마이크로서비스** (포트 8110) - 서비스 간 고성능 권한 조회
- **RBAC 시스템** - 역할 기반 접근 제어 완전 구현
- **중간테이블 최적화** - 고성능 다대다 관계 처리
- **권한 검증 엔진** - 실시간 사용자 권한 확인
- **프로덕션 준비** - Docker, 로깅, 모니터링 완비

## 핵심 명령어

### 개발
- `npm run start:debug` - nodemon으로 개발 서버 시작
- `npm run build` - TypeScript와 별칭 해결로 프로젝트 빌드
- `npm run build:watch` - 감시 모드로 빌드

### 코드 품질
- `npm run lint` - 소스 파일에 ESLint 실행
- `npm run lint-fix` - 자동 수정과 함께 ESLint 실행
- `npm run format` - Prettier로 코드 포맷팅

### 테스트
- `npm run test` - 단위 테스트 실행
- `npm run test:watch` - 감시 모드로 테스트 실행
- `npm run test:cov` - 커버리지와 함께 테스트 실행

### Docker 운영
- `npm run docker:local:up` - 로컬 Docker 스택 시작
- `npm run docker:dev:up` - 개발 Docker 스택 시작
- `npm run docker:prod:up` - 프로덕션 Docker 스택 시작
- `npm run docker:local:down` - 로컬 Docker 스택 중지

## 아키텍처

### 핵심 구조
- **진입점**: `src/main.ts` - Swagger 설정과 함께 애플리케이션 부트스트랩
- **앱 모듈**: `src/app.module.ts` - 모든 기능 모듈을 가져오는 루트 모듈
- **글로벌 설정**: `src/setNestApp.ts` - 글로벌 파이프, 필터, 인터셉터, CORS 설정

### 기능 모듈 구조
- **Authorization 모듈** (`src/modules/authorization/`) - 권한 검증 엔진
- **Role 모듈** (`src/modules/role/`) - 역할 관리 (기본 CRUD 패턴)
- **Permission 모듈** (`src/modules/permission/`) - 권한 관리 (기본 CRUD 패턴)
- **User-Role 모듈** (`src/modules/user-role/`) - 사용자-역할 매핑 (중간테이블 패턴)
- **Role-Permission 모듈** (`src/modules/role-permission/`) - 역할-권한 매핑 (중간테이블 패턴)
- **Service-Visible-Role 모듈** (`src/modules/service-visible-role/`) - 서비스 가시성 역할

### 설정
- **Config 디렉터리** (`src/config/`) - 환경별 설정
- **Database 모듈** (`src/database/`) - TypeORM 및 Redis 설정
- **JWT 모듈** (`src/common/jwt/`) - Access Token 검증
- **Authorization Guard** (`src/common/authorization/`) - 권한 가드

### 공유 라이브러리 의존성
krgeobuk 생태계 표준화를 위한 `@krgeobuk/*` 패키지들:
- `@krgeobuk/core` - 핵심 유틸리티, 인터셉터, 필터
- `@krgeobuk/authorization` - 권한 검증 로직
- `@krgeobuk/jwt` - JWT 토큰 검증 서비스
- `@krgeobuk/swagger` - API 문서화 설정
- `@krgeobuk/database-config` - TypeORM 및 Redis 설정
- `@krgeobuk/role` - 역할 관리 기능
- `@krgeobuk/permission` - 권한 관리 기능
- `@krgeobuk/role-permission` - 역할-권한 매핑
- `@krgeobuk/user-role` - 사용자-역할 매핑
- `@krgeobuk/service-visible-role` - 서비스 가시성 역할
- `@krgeobuk/shared` - 공유 타입 및 유틸리티

### 데이터베이스 설정
- **MySQL**: 기본 데이터베이스 (Docker에서 포트 3308)
- **Redis**: 세션 저장 및 캐싱 (Docker에서 포트 6381)
- **TypeORM**: snake_case 네이밍 전략을 사용하는 ORM
- **최적화된 인덱스**: 복합 인덱스를 통한 고성능 권한 조회

### Docker 환경
애플리케이션은 멀티 컨테이너 설정으로 실행됩니다:
- Asia/Seoul 시간대를 사용하는 MySQL 데이터베이스
- 권한 조회 캐싱을 위한 Redis
- 개발 시 핫 리로드를 지원하는 애플리케이션 서버
- 서비스 통신을 위한 외부 MSA 네트워크

### API 구조
- **HTTP REST API**: 글로벌 프리픽스 `/api`
- **TCP 마이크로서비스**: 포트 8110에서 실행
- 설정된 출처에 대해 CORS 활성화
- JWT 토큰 기반 인증
- 개발 환경에서 Swagger 문서 제공

## TCP 마이크로서비스 통신

### 서버 설정
authz-server는 HTTP API 서버(포트 8100)와 TCP 마이크로서비스(포트 8110)를 동시에 실행합니다.

```typescript
// main.ts
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.TCP,
  options: {
    host: '0.0.0.0',
    port: 8110,
  },
});
```

### 권한 검증 TCP 엔드포인트

다른 서비스에서 authz-server:8110으로 TCP 통신하여 권한 정보를 조회할 수 있습니다.

#### 사용 가능한 메시지 패턴

| 패턴 | 설명 | 요청 데이터 | 응답 타입 |
|------|------|-------------|-----------|
| `authorization.check` | 사용자 권한 확인 | `{ userId, action, serviceId }` | `boolean` |
| `authorization.bulkCheck` | 다중 권한 확인 | `{ userId, permissions[] }` | `PermissionResult[]` |
| `user-role.findRolesByUser` | 사용자 역할 조회 | `{ userId }` | `string[]` |
| `user-role.findUsersByRole` | 역할 사용자 조회 | `{ roleId }` | `string[]` |
| `role-permission.findPermissionsByRole` | 역할 권한 조회 | `{ roleId }` | `string[]` |
| `role-permission.findRolesByPermission` | 권한 역할 조회 | `{ permissionId }` | `string[]` |
| `role.findByServiceId` | 서비스 역할 조회 | `{ serviceId }` | `Role[]` |
| `permission.findByServiceId` | 서비스 권한 조회 | `{ serviceId }` | `Permission[]` |

#### 다른 서비스에서 사용 예시

```typescript
// auth-server에서 authz-server TCP 호출
@Injectable()
export class AuthService {
  constructor(
    @Inject('AUTHZ_SERVICE') private authzClient: ClientProxy
  ) {}

  async checkUserPermission(userId: string, action: string, serviceId: string): Promise<boolean> {
    // authz-server TCP로 권한 확인
    return this.authzClient.send('authorization.check', {
      userId,
      action,
      serviceId
    }).toPromise();
  }

  async getUserRoles(userId: string): Promise<string[]> {
    return this.authzClient.send('user-role.findRolesByUser', { userId }).toPromise();
  }

  async checkMultiplePermissions(userId: string, permissions: Permission[]): Promise<PermissionResult[]> {
    return this.authzClient.send('authorization.bulkCheck', {
      userId,
      permissions
    }).toPromise();
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    return this.authzClient.send('role-permission.findPermissionsByRole', { roleId }).toPromise();
  }
}
```

#### 클라이언트 설정 예시

```typescript
// auth-server app.module.ts
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTHZ_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'authz-server', // Docker 네트워크에서
          port: 8110,
        },
      },
    ]),
  ],
})
export class AppModule {}
```

## 개발 가이드라인

### 환경 설정
```bash
# 서버 설정
NODE_ENV=development
PORT=8100
TCP_PORT=8110
APP_NAME=authz-server

# 클라이언트 URL
AUTH_CLIENT_URL=http://localhost:3000
PORTAL_CLIENT_URL=http://localhost:3200

# MySQL 데이터베이스 (Docker 컨테이너)
MYSQL_HOST=authz-mysql
MYSQL_PORT=3306              # 내부 통신 포트
MYSQL_OPEN_PORT=3308         # 외부 접근 포트
MYSQL_USER=krgeobuk
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=authz

# Redis 캐시 저장소 (Docker 컨테이너)
REDIS_HOST=authz-redis
REDIS_PORT=6379              # 내부 통신 포트
REDIS_OPEN_PORT=6381         # 외부 접근 포트
REDIS_PASSWORD=your-redis-password

# JWT 토큰 검증 (auth-server 공개키)
JWT_ACCESS_PUBLIC_KEY_PATH=./keys/access-public.key
```

### Import 경로 별칭
```typescript
// tsconfig.json에 설정된 경로 별칭
import { RoleService } from '@modules/role/role.service';
import { PermissionService } from '@modules/permission/permission.service';
import { DatabaseConfig } from '@config/database';
import { RedisService } from '@database/redis/redis.service';
import { AuthorizationGuard } from '@common/authorization/authorization.guard';
```

### 코드 품질 관리
```bash
# 린팅 및 포맷팅 (필수 실행)
npm run lint-fix    # ESLint 자동 수정
npm run format      # Prettier 포맷팅

# 빌드 및 타입 검사
npm run build       # TypeScript 컴파일
npm run build:watch # 감시 모드 빌드
```

### 테스트 전략
```bash
# 단위 테스트
npm run test        # Jest 테스트 실행
npm run test:watch  # 감시 모드
npm run test:cov    # 커버리지 포함
```

### 로깅 시스템
- **Winston** 기반 구조화된 로깅
- **개발환경**: 콘솔 출력
- **프로덕션**: 파일 로깅 + 일별 로테이션
- **로그 레벨**: error, warn, info, debug

---

# authz-server 전용 개발 가이드

## 도메인 모듈 구조

authz-server는 다음과 같은 도메인 모듈들로 구성됩니다:

### 핵심 도메인
- **role** - 역할 관리 (기본 CRUD 패턴)
- **permission** - 권한 관리 (기본 CRUD 패턴)
- **authorization** - 권한 검증 엔진 (비즈니스 로직 중심)

### 중간테이블 도메인
- **role-permission** - 역할-권한 중간테이블 (중간테이블 패턴)
- **user-role** - 사용자-역할 중간테이블 (중간테이블 패턴)
- **service-visible-role** - 서비스 가시성 역할 중간테이블 (중간테이블 패턴)

## RBAC 권한 시스템 구현 패턴

### 1. AuthorizationService 핵심 구현

authz-server의 핵심 비즈니스 로직인 권한 검증 시스템:

```typescript
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly userRoleService: UserRoleService,
    private readonly rolePermissionService: RolePermissionService,
    private readonly permissionService: PermissionService,
    private readonly redisService: RedisService
  ) {}

  /**
   * 단일 권한 검증 (핵심 메서드)
   */
  async checkPermission(dto: CheckPermissionDto): Promise<boolean> {
    const { userId, action, serviceId } = dto;
    
    try {
      // 1. 캐시에서 사용자 권한 조회 (성능 최적화)
      const userPermissions = await this.getUserPermissionsWithCache(userId);
      
      // 2. 요청된 권한이 사용자 권한에 포함되는지 확인
      const hasPermission = userPermissions.some(
        perm => perm.action === action && perm.serviceId === serviceId
      );

      this.logger.debug('Single permission check completed', {
        userId,
        action,
        serviceId,
        hasPermission,
        cachedPermissionCount: userPermissions.length,
      });

      return hasPermission;
    } catch (error: unknown) {
      this.logger.error('Permission check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        action,
        serviceId,
      });
      
      // 권한 검증 실패 시 안전하게 거부
      return false;
    }
  }

  /**
   * 다중 권한 검증 (배치 처리)
   */
  async bulkCheckPermissions(dto: BulkCheckPermissionDto): Promise<PermissionResult[]> {
    const { userId, permissions } = dto;

    try {
      // 사용자의 모든 권한을 한 번에 조회 (성능 최적화)
      const userPermissions = await this.getUserPermissionsWithCache(userId);

      // 각 요청된 권한에 대해 검증
      const results: PermissionResult[] = permissions.map(({ action, serviceId }) => {
        const hasPermission = userPermissions.some(
          perm => perm.action === action && perm.serviceId === serviceId
        );

        return {
          action,
          serviceId,
          granted: hasPermission,
        };
      });

      this.logger.debug('Bulk permission check completed', {
        userId,
        totalChecks: permissions.length,
        granted: results.filter(r => r.granted).length,
        denied: results.filter(r => !r.granted).length,
      });

      return results;
    } catch (error: unknown) {
      this.logger.error('Bulk permission check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        permissionCount: permissions.length,
      });

      // 실패 시 모든 권한 거부
      return permissions.map(({ action, serviceId }) => ({
        action,
        serviceId,
        granted: false,
      }));
    }
  }

  /**
   * 사용자 권한 캐싱 조회 (성능 최적화)
   */
  private async getUserPermissionsWithCache(userId: string): Promise<Permission[]> {
    const cacheKey = `user:permissions:${userId}`;
    
    try {
      // 1. Redis 캐시에서 조회 시도
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug('User permissions loaded from cache', { 
          userId,
          permissionCount: JSON.parse(cached).length 
        });
        return JSON.parse(cached);
      }

      // 2. 캐시 미스 시 DB에서 조회
      const permissions = await this.getUserPermissions(userId);

      // 3. Redis에 5분간 캐시 저장
      await this.redisService.setex(cacheKey, 300, JSON.stringify(permissions));

      this.logger.debug('User permissions cached', { 
        userId, 
        permissionCount: permissions.length 
      });

      return permissions;
    } catch (cacheError: unknown) {
      this.logger.warn('Permission cache error, fallback to DB', {
        error: cacheError instanceof Error ? cacheError.message : 'Unknown cache error',
        userId,
      });

      // 캐시 실패 시 DB 직접 조회
      return this.getUserPermissions(userId);
    }
  }

  /**
   * 사용자의 모든 권한 조회 (DB 조회)
   */
  private async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      // 1. 사용자 역할 조회
      const roleIds = await this.userRoleService.getRoleIds(userId);
      
      if (roleIds.length === 0) {
        this.logger.debug('User has no roles assigned', { userId });
        return [];
      }

      // 2. 역할별 권한 ID 조회 (배치 처리)
      const permissionIdsMap = await this.rolePermissionService.getPermissionIdsBatch(roleIds);
      const uniquePermissionIds = [...new Set(Object.values(permissionIdsMap).flat())];

      if (uniquePermissionIds.length === 0) {
        this.logger.debug('User roles have no permissions assigned', { 
          userId, 
          roleCount: roleIds.length 
        });
        return [];
      }

      // 3. 권한 상세 정보 조회
      const permissions = await this.permissionService.findByIds(uniquePermissionIds);

      this.logger.debug('User permissions loaded from DB', {
        userId,
        roleCount: roleIds.length,
        permissionCount: permissions.length,
      });

      return permissions;
    } catch (error: unknown) {
      this.logger.error('Failed to load user permissions from DB', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return [];
    }
  }

  /**
   * 사용자 권한 캐시 무효화
   */
  async invalidateUserPermissions(userId: string): Promise<void> {
    const cacheKey = `user:permissions:${userId}`;
    
    try {
      await this.redisService.del(cacheKey);
      this.logger.debug('User permissions cache invalidated', { userId });
    } catch (error: unknown) {
      this.logger.warn('Failed to invalidate user permissions cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * 역할 권한 변경 시 관련 사용자 캐시 일괄 무효화
   */
  async invalidateUsersInRole(roleId: string): Promise<void> {
    try {
      const userIds = await this.userRoleService.getUserIds(roleId);
      
      await Promise.all(
        userIds.map(userId => this.invalidateUserPermissions(userId))
      );

      this.logger.log('Role users permission cache invalidated', {
        roleId,
        affectedUsers: userIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('Failed to invalidate role users cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
    }
  }
}
```

### 2. 중간테이블 최적화 패턴

#### UserRoleService 최적화 구현
```typescript
@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(private readonly userRoleRepo: UserRoleRepository) {}

  /**
   * 사용자 역할 ID 목록 조회 (권한 검증 최적화)
   */
  async getRoleIds(userId: string): Promise<string[]> {
    try {
      return await this.userRoleRepo.findRoleIdsByUserId(userId);
    } catch (error: unknown) {
      this.logger.error('Failed to get user role IDs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return [];
    }
  }

  /**
   * 역할 사용자 ID 목록 조회
   */
  async getUserIds(roleId: string): Promise<string[]> {
    try {
      return await this.userRoleRepo.findUserIdsByRoleId(roleId);
    } catch (error: unknown) {
      this.logger.error('Failed to get role user IDs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
      return [];
    }
  }

  /**
   * 배치 역할 할당 (캐시 무효화 포함)
   */
  async assignMultipleRoles(dto: { userId: string; roleIds: string[] }): Promise<AssignmentResult> {
    const { userId, roleIds } = dto;

    try {
      // 1. 기존 역할 확인
      const existingRoles = await this.getRoleIds(userId);
      const newRoleIds = roleIds.filter(roleId => !existingRoles.includes(roleId));

      if (newRoleIds.length === 0) {
        this.logger.warn('No new roles to assign', {
          userId,
          requestedCount: roleIds.length,
          duplicateCount: roleIds.length,
        });

        return {
          success: true,
          assigned: 0,
          duplicates: roleIds.length,
          newAssignments: [],
        };
      }

      // 2. 새로운 역할 배치 할당
      const entities = newRoleIds.map(roleId => {
        const entity = new UserRoleEntity();
        entity.userId = userId;
        entity.roleId = roleId;
        return entity;
      });

      await this.userRoleRepo.save(entities);

      // 3. 권한 캐시 무효화
      await this.invalidateUserPermissionCache(userId);

      this.logger.log('Multiple user roles assigned successfully', {
        userId,
        assignedCount: newRoleIds.length,
        duplicateCount: roleIds.length - newRoleIds.length,
      });

      return {
        success: true,
        assigned: newRoleIds.length,
        duplicates: roleIds.length - newRoleIds.length,
        newAssignments: newRoleIds,
      };
    } catch (error: unknown) {
      this.logger.error('Failed to assign multiple user roles', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleCount: roleIds.length,
      });

      throw new InternalServerErrorException('Failed to assign user roles');
    }
  }

  /**
   * 사용자 권한 캐시 무효화
   */
  private async invalidateUserPermissionCache(userId: string): Promise<void> {
    try {
      // AuthorizationService의 캐시 무효화 호출
      // 실제 구현에서는 AuthorizationService를 주입받아 사용
      const cacheKey = `user:permissions:${userId}`;
      // await this.redisService.del(cacheKey);
      
      this.logger.debug('User permission cache invalidated after role change', { userId });
    } catch (error: unknown) {
      this.logger.warn('Failed to invalidate user permission cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }
}
```

#### UserRoleRepository 최적화
```typescript
@Injectable()
export class UserRoleRepository extends BaseRepository<UserRoleEntity> {

  /**
   * 사용자별 역할 ID 조회 (SELECT 최적화)
   */
  async findRoleIdsByUserId(userId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('ur')
      .select('ur.roleId')
      .where('ur.userId = :userId', { userId })
      .getRawMany();

    return result.map((row) => row.ur_roleId);
  }

  /**
   * 역할별 사용자 ID 조회 (SELECT 최적화)
   */
  async findUserIdsByRoleId(roleId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('ur')
      .select('ur.userId')
      .where('ur.roleId = :roleId', { roleId })
      .getRawMany();

    return result.map((row) => row.ur_userId);
  }

  /**
   * 여러 사용자의 역할 ID 배치 조회 (성능 최적화)
   */
  async findRoleIdsByUserIds(userIds: string[]): Promise<Record<string, string[]>> {
    if (userIds.length === 0) {
      return {};
    }

    const result = await this.createQueryBuilder('ur')
      .select(['ur.userId', 'ur.roleId'])
      .where('ur.userId IN (:...userIds)', { userIds })
      .getRawMany();

    const userRoleMap: Record<string, string[]> = {};

    // 요청된 모든 사용자에 대해 빈 배열로 초기화
    userIds.forEach(userId => {
      userRoleMap[userId] = [];
    });

    // 결과 매핑
    result.forEach((row) => {
      const userId = row.ur_userId;
      const roleId = row.ur_roleId;
      userRoleMap[userId].push(roleId);
    });

    return userRoleMap;
  }

  /**
   * 역할의 사용자 존재 여부 확인 (삭제 전 검증)
   */
  async hasUsersForRole(roleId: string): Promise<boolean> {
    const count = await this.createQueryBuilder('ur')
      .where('ur.roleId = :roleId', { roleId })
      .getCount();

    return count > 0;
  }

  /**
   * 사용자-역할 관계 존재 확인
   */
  async existsUserRole(userId: string, roleId: string): Promise<boolean> {
    const count = await this.createQueryBuilder('ur')
      .where('ur.userId = :userId AND ur.roleId = :roleId', { userId, roleId })
      .getCount();

    return count > 0;
  }
}
```

### 3. TCP 컨트롤러 최적화 패턴

#### AuthorizationTcpController
```typescript
@Controller()
export class AuthorizationTcpController {
  private readonly logger = new Logger(AuthorizationTcpController.name);

  constructor(private readonly authorizationService: AuthorizationService) {}

  /**
   * 단일 권한 확인 (고빈도 호출)
   */
  @MessagePattern(AuthorizationTcpPatterns.CHECK_PERMISSION)
  async checkPermission(@Payload() data: TcpCheckPermissionDto): Promise<boolean> {
    try {
      // DEBUG 레벨로 고빈도 API 로깅 최소화
      this.logger.debug('TCP permission check requested', {
        userId: data.userId,
        action: data.action,
        serviceId: data.serviceId,
      });

      const hasPermission = await this.authorizationService.checkPermission(data);

      // 결과도 DEBUG 레벨로 기록
      this.logger.debug('TCP permission check completed', {
        userId: data.userId,
        action: data.action,
        hasPermission,
      });

      return hasPermission;
    } catch (error: unknown) {
      this.logger.error('TCP permission check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        action: data.action,
        serviceId: data.serviceId,
      });

      // 권한 검증 실패 시 안전하게 거부
      return false;
    }
  }

  /**
   * 다중 권한 확인 (배치 처리)
   */
  @MessagePattern(AuthorizationTcpPatterns.BULK_CHECK_PERMISSION)
  async bulkCheckPermission(@Payload() data: TcpBulkCheckPermissionDto): Promise<PermissionResult[]> {
    try {
      this.logger.debug('TCP bulk permission check requested', {
        userId: data.userId,
        permissionCount: data.permissions.length,
      });

      const results = await this.authorizationService.bulkCheckPermissions(data);

      this.logger.debug('TCP bulk permission check completed', {
        userId: data.userId,
        totalChecks: data.permissions.length,
        granted: results.filter(r => r.granted).length,
      });

      return results;
    } catch (error: unknown) {
      this.logger.error('TCP bulk permission check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        permissionCount: data.permissions.length,
      });

      // 실패 시 모든 권한 거부
      return data.permissions.map(({ action, serviceId }) => ({
        action,
        serviceId,
        granted: false,
      }));
    }
  }

  /**
   * 사용자 역할 조회 (캐싱 최적화)
   */
  @MessagePattern(UserRoleTcpPatterns.FIND_ROLES_BY_USER)
  async findRolesByUser(@Payload() data: { userId: string }): Promise<string[]> {
    try {
      this.logger.debug('TCP user roles requested', {
        userId: data.userId,
      });

      return await this.userRoleService.getRoleIds(data.userId);
    } catch (error: unknown) {
      this.logger.error('TCP user roles fetch failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
      });

      return [];
    }
  }
}
```

### 4. 데이터베이스 인덱스 최적화

authz-server의 권한 조회 성능을 위한 인덱스 설계:

```typescript
// Role Entity - 서비스별 역할 관리
@Entity('role')
@Index('IDX_ROLE_SERVICE_ID', ['serviceId'])  // 서비스별 역할 조회
@Index('IDX_ROLE_NAME_SERVICE', ['name', 'serviceId'], { unique: true })  // 중복 방지 + 검색 최적화
@Index('IDX_ROLE_PRIORITY', ['priority'])  // 우선순위 정렬
export class RoleEntity extends BaseEntityUUID {
  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({
    type: 'tinyint',
    unsigned: true,
    default: 5,
    comment: '낮을수록 더 높은 권한 - 최상위 1, 기본 5',
  })
  priority?: number;

  @Column({ type: 'uuid' })
  serviceId!: string;
}
```

```typescript
// Permission Entity - 서비스별 권한 관리
@Entity('permission')
@Index('IDX_PERMISSION_SERVICE', ['serviceId'])  // 서비스별 권한 검색
@Index('IDX_PERMISSION_ACTION', ['action'])  // 액션 검색 (LIKE 쿼리 최적화)
@Index('IDX_PERMISSION_SVC_ACTION', ['serviceId', 'action'])  // 권한 검증용 복합 인덱스 (가장 중요!)
@Unique(['serviceId', 'action'])  // 서비스 내 액션 중복 방지
export class PermissionEntity extends BaseEntityUUID {
  @Column({ type: 'varchar', length: 100 })
  action!: string; // 권한 명칭 (ex: user:create)

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({ type: 'uuid' })
  serviceId!: string;
}
```

```typescript
// UserRole Entity - 권한 검증 최적화
@Entity('user_role')
@Index('IDX_USER_ROLE_USER', ['userId'])    // 사용자별 역할 조회 (권한 검증에서 가장 중요!)
@Index('IDX_USER_ROLE_ROLE', ['roleId'])    // 역할별 사용자 조회
@Index('IDX_USER_ROLE_UNIQUE', ['userId', 'roleId'], { unique: true })  // 중복 방지
export class UserRoleEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid' })
  roleId!: string;
}
```

```typescript
// RolePermission Entity - 권한 조회 최적화
@Entity('role_permission')
@Index('IDX_ROLE_PERMISSION_ROLE', ['roleId'])  // 역할별 권한 조회 (권한 검증에서 중요!)
@Index('IDX_ROLE_PERMISSION_PERMISSION', ['permissionId'])  // 권한별 역할 조회
@Index('IDX_ROLE_PERMISSION_UNIQUE', ['roleId', 'permissionId'], { unique: true })  // 중복 방지
export class RolePermissionEntity {
  @PrimaryColumn({ type: 'uuid' })
  roleId!: string;

  @PrimaryColumn({ type: 'uuid' })
  permissionId!: string;
}
```

## 성능 최적화 전략

### 1. 권한 검증 성능 최적화 우선순위

1. **Redis 캐싱**: 사용자 권한 정보 5분간 캐싱
2. **배치 조회**: 역할/권한 관계를 배치로 조회
3. **인덱스 최적화**: 복합 인덱스를 통한 빠른 조회
4. **TCP 통신**: HTTP보다 빠른 마이크로서비스 통신

### 2. 캐시 무효화 전략

```typescript
// 권한 변경 시 관련 캐시 무효화
export class RolePermissionService {
  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await this.dataSource.transaction(async manager => {
      // 1. 기존 권한 삭제
      await manager.delete(RolePermissionEntity, { roleId });

      // 2. 새로운 권한 할당
      if (permissionIds.length > 0) {
        const entities = permissionIds.map(permissionId => ({
          roleId,
          permissionId,
        }));
        await manager.save(RolePermissionEntity, entities);
      }

      // 3. 해당 역할을 가진 모든 사용자의 권한 캐시 무효화
      await this.authorizationService.invalidateUsersInRole(roleId);
    });

    this.logger.log('Role permissions updated with cache invalidation', {
      roleId,
      newPermissionCount: permissionIds.length,
    });
  }
}
```

### 3. 로깅 성능 최적화

```typescript
// 권한 검증 관련 로깅 레벨 가이드
export class AuthorizationOptimizedLogging {
  
  // 고빈도 권한 확인: DEBUG 레벨
  async checkPermission(dto: CheckPermissionDto): Promise<boolean> {
    this.logger.debug('Permission check', { userId: dto.userId, action: dto.action });
    // ...
  }

  // 중요한 권한 변경: LOG 레벨
  async assignRole(userId: string, roleId: string): Promise<void> {
    this.logger.log('Role assigned', { userId, roleId });
    // ...
  }

  // 시스템 오류: ERROR 레벨
  async handlePermissionError(error: Error, context: any): Promise<void> {
    this.logger.error('Permission system error', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }
}
```

## 권한 시스템 개발 워크플로우

### 1. 개발 환경 설정
```bash
# 1. Docker 인프라 시작
npm run docker:local:up

# 2. 개발 서버 시작 (핫 리로드)
npm run start:debug

# 3. 권한 검증 테스트
curl -X POST http://localhost:8100/api/authorization/check \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","action":"user:create","serviceId":"auth-service"}'
```

### 2. 권한 시스템 개발 단계

1. **권한 정의**: Permission 엔티티에 새로운 권한 추가
2. **역할 설계**: Role 엔티티에 역할 생성 및 우선순위 설정
3. **관계 매핑**: RolePermission을 통한 역할-권한 매핑
4. **사용자 할당**: UserRole을 통한 사용자-역할 매핑
5. **권한 검증**: AuthorizationService를 통한 권한 확인
6. **캐싱 적용**: Redis를 통한 성능 최적화
7. **TCP 통신**: 다른 서비스에서 권한 조회 가능

### 3. 테스트 전략

```typescript
// 권한 검증 로직 단위 테스트
describe('AuthorizationService', () => {
  it('should grant permission when user has required role', async () => {
    // Given
    const userId = 'user-123';
    const action = 'user:create';
    const serviceId = 'auth-service';
    
    // Mock user has admin role with user:create permission
    jest.spyOn(userRoleService, 'getRoleIds').mockResolvedValue(['admin-role']);
    jest.spyOn(rolePermissionService, 'getPermissionIdsBatch').mockResolvedValue({
      'admin-role': ['user-create-permission']
    });
    jest.spyOn(permissionService, 'findByIds').mockResolvedValue([
      { id: 'user-create-permission', action: 'user:create', serviceId: 'auth-service' }
    ]);

    // When
    const result = await authorizationService.checkPermission({
      userId,
      action,
      serviceId,
    });

    // Then
    expect(result).toBe(true);
  });

  it('should deny permission when user has no required role', async () => {
    // Given
    const userId = 'user-456';
    const action = 'admin:delete';
    const serviceId = 'auth-service';
    
    // Mock user has no roles
    jest.spyOn(userRoleService, 'getRoleIds').mockResolvedValue([]);

    // When
    const result = await authorizationService.checkPermission({
      userId,
      action,
      serviceId,
    });

    // Then
    expect(result).toBe(false);
  });
});
```

### 4. 성능 측정 및 모니터링

```typescript
// 권한 검증 성능 모니터링
export class AuthorizationPerformanceMonitor {
  private readonly performanceLogger = new Logger('PerformanceMonitor');

  async measurePermissionCheck<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - start;

      // 성능 로그 (50ms 이상 소요 시 경고)
      if (duration > 50) {
        this.performanceLogger.warn('Slow permission operation detected', {
          operation,
          duration,
          threshold: 50,
        });
      } else {
        this.performanceLogger.debug('Permission operation completed', {
          operation,
          duration,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.performanceLogger.error('Permission operation failed', {
        operation,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// 사용 예시
const result = await this.performanceMonitor.measurePermissionCheck(
  'checkPermission',
  () => this.authorizationService.checkPermission(dto)
);
```

## 개발 참고사항

### 경로 별칭
- `@modules/*` → `src/modules/*`
- `@common/*` → `src/common/*`
- `@config/*` → `src/config/*`
- `@database/*` → `src/database/*`

### 환경 설정
- **포트**: 8100 (HTTP), 8110 (TCP)
- **MySQL**: 포트 3308
- **Redis**: 포트 6381
- **환경 파일**: `envs/` 디렉토리 (필요 시 생성)

### 네트워크 구성
- **authz-network**: authz-server 내부 통신
- **msa-network**: 마이크로서비스 간 통신
- **shared-network**: 공유 리소스 접근

### 성능 목표
- **단일 권한 확인**: 50ms 이내
- **배치 권한 확인 (10개)**: 100ms 이내
- **캐시 히트율**: 80% 이상
- **TCP 응답 시간**: 30ms 이내

이러한 가이드라인을 따르면 고성능의 권한 관리 시스템을 구축할 수 있으며, krgeobuk 생태계에서 안정적인 권한 검증 서비스를 제공할 수 있습니다.