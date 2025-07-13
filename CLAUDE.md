# CLAUDE.md - Authorization Server

이 파일은 authz-server 작업 시 Claude Code의 가이드라인을 제공하며, **krgeobuk 생태계의 모든 NestJS 서버에서 공통으로 사용하는 표준 패턴**을 포함합니다.

## 서비스 개요

authz-server는 krgeobuk 생태계의 권한 관리 서비스로, RBAC(Role-Based Access Control) 기반의 역할과 권한 관리를 담당합니다.

## 기술 스택

- **NestJS**: 백엔드 프레임워크
- **TypeScript**: ES 모듈 지원과 함께 완전한 TypeScript 구현
- **MySQL 8**: 데이터베이스 (포트 3308)
- **Redis**: 캐싱 및 세션 (포트 6381)
- **Docker**: 컨테이너화

## 핵심 명령어

```bash
# 개발 서버 시작
npm run start:dev          # 일반 개발 서버
npm run start:debug        # 디버그 모드 (nodemon)

# 빌드
npm run build              # TypeScript 컴파일
npm run build:watch        # 감시 모드 빌드

# 코드 품질
npm run lint               # ESLint 실행
npm run lint-fix           # 자동 수정과 함께 린팅
npm run format             # Prettier 포맷팅

# 테스트
npm run test               # Jest 테스트 실행
npm run test:watch         # 감시 모드 테스트
npm run test:cov           # 커버리지 테스트
npm run test:e2e           # 엔드투엔드 테스트

# Docker 환경
npm run docker:local:up    # 로컬 Docker 스택 시작
npm run docker:local:down  # 로컬 Docker 스택 중지
npm run docker:dev:up      # 개발 Docker 환경
npm run docker:prod:up     # 프로덕션 Docker 환경
```

---

# 🔥 krgeobuk NestJS 서버 공통 개발 표준

> **중요**: 이 섹션은 krgeobuk 생태계의 **모든 NestJS 서버**(auth-server, authz-server, portal-server)에서 공통으로 적용되는 표준입니다.

## API 응답 포맷 표준

krgeobuk 생태계는 `@krgeobuk/core` 패키지의 SerializerInterceptor와 HttpExceptionFilter를 통해 일관된 API 응답 포맷을 제공합니다.

### 성공 응답 포맷 (SerializerInterceptor)

모든 성공적인 API 응답은 다음 구조를 따릅니다:

```typescript
{
  code: string,           // 응답 코드 (기본: CoreCode.REQUEST_SUCCESS)
  status_code: number,    // HTTP 상태 코드 (기본: 200)
  message: string,        // 응답 메시지 (기본: CoreMessage.REQUEST_SUCCESS)
  isLogin: boolean,       // 사용자 로그인 상태
  data: object | null     // 실제 응답 데이터 (snake_case로 변환됨)
}
```

**주요 특징:**
- 모든 응답 데이터는 `toSnakeCase()` 함수를 통해 snake_case로 변환
- `@Serialize()` 데코레이터를 통해 커스텀 code, message, DTO 지정 가능
- DTO가 지정된 경우 `class-transformer`의 `plainToInstance()`로 변환
- `isLogin` 필드로 사용자 인증 상태 확인 가능

### 에러 응답 포맷 (HttpExceptionFilter)

모든 HTTP 예외는 다음 구조로 응답됩니다:

```typescript
{
  statusCode: number,     // HTTP 상태 코드
  code: string,          // 에러 코드 (기본: CoreCode.SERVER_ERROR)
  message: string        // 에러 메시지 (배열인 경우 join으로 결합)
}
```

**주요 특징:**
- 배열 형태의 메시지는 쉼표로 결합하여 단일 문자열로 변환
- 커스텀 에러 코드 지원 (exception response에 code 필드 포함 시)
- Chrome DevTools 요청은 자동으로 필터링
- 상세한 로깅: 요청 정보, 사용자 정보, 파라미터, 에러 상세 등

### 사용 예시

**성공 응답 커스터마이징:**
```typescript
@Get()
@Serialize({ 
  dto: UserResponseDto, 
  code: 'USER_001', 
  message: '사용자 조회 성공' 
})
getUser() {
  return { id: 1, name: 'John', email: 'john@example.com' };
}
```

**커스텀 예외 처리:**
```typescript
throw new BadRequestException({
  message: '잘못된 요청입니다',
  code: 'AUTH_001'
});
```

이러한 표준화된 응답 포맷을 통해 프론트엔드와 백엔드 간의 일관된 데이터 교환이 보장됩니다.

## 표준화된 도메인 API 설계 패턴

krgeobuk 생태계의 모든 도메인 모듈에서 일관된 API 구조를 위한 표준 패턴입니다. 

### API 구조 표준

도메인 타입에 따라 다음 두 가지 표준 구조를 적용합니다:

#### 일반 도메인 (permission, role 등)

```typescript
GET    /{domain}s                    # 목록 조회 (검색)
POST   /{domain}s                    # 생성
GET    /{domain}s/:id                # 상세 조회
PATCH  /{domain}s/:id                # 수정
DELETE /{domain}s/:id                # 삭제
GET    /{domain}s/:id/summary        # 요약 정보 (신규) - 현재는 구현 X
```

**구현 예시:**
```typescript
@Controller('permissions')
export class PermissionController {
  
  @Get()
  async searchPermissions(
    @Query() query: PermissionSearchQueryDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<PermissionPaginatedSearchResultDto> {
    return this.permissionService.searchPermissions(query);
  }

  @Post()
  async createPermission(
    @Body() dto: CreatePermissionDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.permissionService.createPermission(dto);
  }

  @Get(':permissionId')
  async getPermissionById(
    @Param() params: PermissionIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<PermissionDetailDto> {
    return this.permissionService.getPermissionById(params.permissionId);
  }

  @Patch(':permissionId')
  async updatePermission(
    @Param() params: PermissionIdParamsDto,
    @Body() dto: UpdatePermissionDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.permissionService.updatePermission(params.permissionId, dto);
  }

  @Delete(':permissionId')
  async deletePermission(
    @Param() params: PermissionIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.permissionService.deletePermission(params.permissionId);
  }

  @Get(':permissionId/summary')
  async getPermissionSummary(
    @Param() params: PermissionIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<PermissionSummaryDto> {
    return this.permissionService.getPermissionSummary(params.permissionId);
  }
}
```

#### 중간테이블 도메인 (role-permission, service-visible-role, user-role 등)

```typescript
GET    /{entityA}s/:idA/{entityB}s           # A의 B 목록
GET    /{entityB}s/:idB/{entityA}s           # B의 A 목록
GET    /{entityA}s/:idA/{entityB}s/:idB/exists # 관계 존재 확인
POST   /{entityA}s/:idA/{entityB}s/:idB      # 관계 생성
DELETE /{entityA}s/:idA/{entityB}s/:idB      # 관계 삭제
POST   /{entityA}s/:idA/{entityB}s/batch     # 배치 할당
PUT    /{entityA}s/:idA/{entityB}s           # 완전 교체
```

**구현 예시 (role-permission):**
```typescript
@Controller()
export class RolePermissionController {

  // 양방향 관계 조회
  @Get('roles/:roleId/permissions')
  async getPermissionsByRole(
    @Param() params: RoleIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<string[]> {
    return this.rolePermissionService.getPermissionIds(params.roleId);
  }

  @Get('permissions/:permissionId/roles')
  async getRolesByPermission(
    @Param() params: PermissionIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<string[]> {
    return this.rolePermissionService.getRoleIds(params.permissionId);
  }

  // 관계 존재 확인
  @Get('roles/:roleId/permissions/:permissionId/exists')
  async checkRolePermissionExists(
    @Param() params: RolePermissionParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<boolean> {
    return this.rolePermissionService.exists(params.roleId, params.permissionId);
  }

  // 관계 생성/삭제
  @Post('roles/:roleId/permissions/:permissionId')
  async assignRolePermission(
    @Param() params: RolePermissionParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.assignRolePermission({
      roleId: params.roleId,
      permissionId: params.permissionId,
    });
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  async revokeRolePermission(
    @Param() params: RolePermissionParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.revokeRolePermission(params.roleId, params.permissionId);
  }

  // 배치 처리
  @Post('roles/:roleId/permissions/batch')
  async assignMultiplePermissions(
    @Param() params: RoleIdParamsDto,
    @Body() dto: PermissionIdsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.assignMultiplePermissions(params.roleId, dto.permissionIds);
  }

  // 완전 교체
  @Put('roles/:roleId/permissions')
  async replaceRolePermissions(
    @Param() params: RoleIdParamsDto,
    @Body() dto: PermissionIdsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.rolePermissionService.replaceRolePermissions({
      roleId: params.roleId,
      permissionIds: dto.permissionIds,
    });
  }
}
```

### 설계 원칙

#### 1. 도메인 경계 준수
- **각 도메인은 자신의 리소스만 관리**: `/permissions`는 permission 모듈, `/roles`는 role 모듈
- **도메인 간 조회는 TCP 통신 활용**: 다른 도메인 데이터가 필요한 경우 마이크로서비스 통신
- **서비스별 조회는 별도 처리**: `/services/:id/permissions` 같은 API는 service 도메인에서 구현

#### 2. RESTful 설계 원칙
- **리소스 중심 URL**: 동사보다는 명사 사용
- **HTTP 메서드 의미 준수**: GET(조회), POST(생성), PATCH(부분수정), PUT(완전교체), DELETE(삭제)
- **일관된 네이밍**: 복수형 리소스명 사용 (`/permissions`, `/roles`)

#### 3. 중간테이블 특화 패턴
- **양방향 관계 지원**: A→B, B→A 모두 제공
- **배치 처리 지원**: 성능 최적화를 위한 bulk 연산
- **완전 교체 기능**: PUT을 통한 관계 재설정
- **존재 확인 API**: 관계 유무 빠른 확인

### 구현 체크리스트

#### 일반 도메인 개발 시
- [ ] 6가지 표준 API 모두 구현 (search, create, get, update, delete, summary)
- [ ] 일관된 HTTP 메서드 사용
- [ ] 적절한 응답 DTO 및 에러 처리
- [ ] 도메인 경계 내에서만 API 구현
- [ ] summary API를 통한 부가 정보 제공

#### 중간테이블 도메인 개발 시
- [ ] 양방향 관계 조회 API (A→B, B→A)
- [ ] 관계 존재 확인 API
- [ ] 개별 관계 생성/삭제 API
- [ ] 배치 할당 API (POST batch)
- [ ] 완전 교체 API (PUT)
- [ ] ID 기반 최적화된 조회 (전체 엔티티 대신 ID만)
- [ ] 적절한 인덱싱 및 성능 최적화

#### 공통 요구사항
- [ ] JWT 인증 가드 적용
- [ ] Swagger 문서화 완료
- [ ] 공통 패키지 활용 (Response, Error, DTO)
- [ ] 적절한 로깅 및 에러 처리
- [ ] TCP 컨트롤러 구현 (마이크로서비스 통신용)

### 금지사항

#### ❌ 도메인 경계 위반
```typescript
// 잘못된 예시 - permission 모듈에서 service 라우팅
@Get('services/:serviceId/permissions')  // ❌ 금지

// 올바른 방법 - 쿼리 파라미터 사용 또는 service 모듈에서 구현
@Get('permissions?serviceId=xxx')         // ✅ 권장
```

#### ❌ 불필요한 검색 API (중간테이블)
```typescript
// 잘못된 예시 - 중간테이블에 검색 API
@Get('role-permissions')                  // ❌ 금지

// 올바른 방법 - 관계 조회 API 사용
@Get('roles/:roleId/permissions')         // ✅ 권장
```

#### ❌ 비표준 API 패턴
```typescript
// 잘못된 예시 - 표준을 벗어나는 API
@Delete('roles/:roleId/permissions/batch') // ❌ 금지 (표준에 없음)
@Get('roles/:roleId/permissions/count')    // ❌ 금지 (추후 처리 예정)

// 올바른 방법 - 표준 패턴 사용
@Put('roles/:roleId/permissions')          // ✅ 빈 배열로 전체 삭제
```

이 표준을 준수하면 모든 도메인 모듈에서 일관되고 예측 가능한 API 구조를 유지할 수 있으며, 개발자 경험과 유지보수성이 크게 향상됩니다.

## NestJS 서버 공통 코딩 컨벤션

krgeobuk 생태계의 모든 NestJS 백엔드 서비스에서 공통으로 적용해야 하는 코딩 규칙과 베스트 프랙티스입니다.

### TypeScript 코딩 표준

#### 타입 안전성 규칙
```typescript
// ✅ 올바른 예시 - 명시적 타입 지정
async function getUserById(id: string): Promise<UserEntity | null> {
  try {
    return await this.userRepo.findOneById(id);
  } catch (error: unknown) {
    this.logger.error('User fetch failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: id 
    });
    throw error;
  }
}

// ❌ 잘못된 예시 - 타입 누락
async function getUserById(id) {  // 타입 누락
  try {
    return await this.userRepo.findOneById(id);
  } catch (error) {  // unknown 타입 누락
    console.log(error);  // console 사용 금지
    throw error;
  }
}
```

**핵심 규칙:**
- **any 타입 완전 금지**: 모든 변수와 매개변수에 명시적 타입 지정
- **함수 반환값 타입 필수**: 모든 함수에 명시적 반환 타입 지정
- **catch 블록 타입**: `catch (error: unknown)` 패턴 사용
- **console 사용 금지**: Logger 클래스만 사용

### 서비스 클래스 구조 표준

#### 메서드 순서 및 그룹화 규칙
```typescript
@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);

  constructor(
    private readonly repo: ExampleRepository,
    // 의존성 주입
  ) {}

  // ==================== PUBLIC METHODS ====================

  // 1. 조회 메서드들 (가장 기본적인 CRUD 순서)
  async findById(id: string): Promise<Entity | null> { }
  async findByIdOrFail(id: string): Promise<Entity> { }
  async findByServiceIds(serviceIds: string[]): Promise<Entity[]> { }
  async findByAnd(filter: Filter): Promise<Entity[]> { }
  async findByOr(filter: Filter): Promise<Entity[]> { }

  // 2. 검색 및 상세 조회 메서드들  
  async searchEntities(query: SearchQuery): Promise<PaginatedResult> { }
  async getEntityDetail(id: string): Promise<Detail> { }

  // 3. 변경 메서드들 (생성 → 수정 → 삭제 순서)
  async createEntity(attrs: CreateAttrs): Promise<void> { }
  async updateEntity(id: string, attrs: UpdateAttrs): Promise<void> { }
  async deleteEntity(id: string): Promise<UpdateResult> { }

  // ==================== PRIVATE HELPER METHODS ====================

  // TCP 통신 관련 헬퍼들
  private async getExternalData(): Promise<ExternalData> { }
  private async notifyOtherServices(): Promise<void> { }

  // 데이터 변환 관련 헬퍼들
  private buildSearchResults(): SearchResult[] { }
  private buildFallbackResults(): SearchResult[] { }
  
  // 유틸리티 헬퍼들
  private validateBusinessRules(): boolean { }
  private formatResponseData(): FormattedData { }
}
```

#### 메서드 네이밍 표준
**조회 메서드:**
- `findById(id: string)` - 단일 엔티티 조회 (null 반환 가능)
- `findByIdOrFail(id: string)` - 단일 엔티티 조회 (예외 발생)
- `findByServiceIds(serviceIds: string[])` - 서비스 ID 배열로 조회
- `findByAnd(filter: Filter)` - AND 조건 검색
- `findByOr(filter: Filter)` - OR 조건 검색

**검색 메서드:**
- `searchEntities(query: SearchQuery)` - 페이지네이션 검색
- `getEntityDetail(id: string)` - 상세 정보 조회 (외부 데이터 포함)

**변경 메서드:**
- `createEntity(attrs: CreateAttrs)` - 엔티티 생성
- `updateEntity(id: string, attrs: UpdateAttrs)` - 엔티티 수정  
- `deleteEntity(id: string)` - 엔티티 삭제

**Private 메서드:**
- `build-` 접두사: 데이터 변환 및 구축
- `get-` 접두사: 외부 데이터 조회
- `validate-` 접두사: 비즈니스 규칙 검증
- `format-` 접두사: 데이터 포맷팅

### 로깅 표준 가이드라인

#### 로그 레벨 사용 기준
```typescript
// ERROR: 시스템 오류, 예외 상황
this.logger.error('Entity creation failed', {
  error: error instanceof Error ? error.message : 'Unknown error',
  entityId: id,
  operation: 'create',
});

// WARN: 비정상적이지만 처리 가능한 상황
this.logger.warn('External service unavailable, using fallback', {
  service: 'auth-service',
  fallbackUsed: true,
  entityId: id,
});

// LOG/INFO: 중요한 비즈니스 이벤트
this.logger.log('Entity created successfully', {
  entityId: result.id,
  entityType: 'Role',
  serviceId: result.serviceId,
});

// DEBUG: 개발용, 고빈도 호출 API, 상세 디버깅
this.logger.debug('TCP request received', {
  operation: 'findById',
  entityId: id,
  timestamp: new Date().toISOString(),
});
```

#### 로그 메시지 구조 표준
**메시지 포맷**: `"Action + result + context"`

```typescript
// ✅ 올바른 로그 메시지
this.logger.log('Role created successfully', { roleId: '123', roleName: 'Admin' });
this.logger.warn('Role creation failed: duplicate name', { name: 'Admin', serviceId: '456' });
this.logger.error('Database connection failed', { error: error.message, retryCount: 3 });

// ❌ 잘못된 로그 메시지  
this.logger.log('Success');  // 컨텍스트 부족
this.logger.error('Error occurred');  // 구체적이지 않음
this.logger.log('Creating role for user admin with name Test');  // 구조화되지 않음
```

**메타데이터 표준:**
- **필수 필드**: entityId, operation, timestamp (자동)
- **선택 필드**: serviceId, userId, error, retryCount, duration
- **민감정보 제외**: 비밀번호, 토큰, 개인정보

### Repository 최적화 표준

#### 쿼리 최적화 규칙
```typescript
// ✅ 올바른 쿼리 - SELECT 컬럼 명시
async searchEntities(query: SearchQuery): Promise<PaginatedResult<Partial<Entity>>> {
  const qb = this.createQueryBuilder('entity')
    .select([
      'entity.id',
      'entity.name',
      'entity.description',
      'entity.serviceId',
      // 필요한 컬럼만 선택
    ]);
    
  // 인덱스 활용을 위한 조건 순서 최적화
  if (query.serviceId) {
    qb.andWhere('entity.serviceId = :serviceId', { serviceId: query.serviceId });
  }
  
  if (query.name) {
    qb.andWhere('entity.name LIKE :name', { name: `%${query.name}%` });
  }

  // COUNT 쿼리와 데이터 쿼리 분리
  const [rows, total] = await Promise.all([
    qb.getRawMany(),
    qb.getCount()
  ]);

  // 타입 안전한 결과 매핑
  const items: Partial<Entity>[] = rows.map((row) => ({
    id: row.entity_id,
    name: row.entity_name,
    description: row.entity_description,
    serviceId: row.entity_service_id,
  }));

  return { items, pageInfo: this.buildPageInfo(total, query) };
}

// ❌ 비효율적 쿼리
async searchEntities(query: SearchQuery) {  // 반환 타입 누락
  const qb = this.createQueryBuilder('entity'); // SELECT * (비효율적)
  // ... 조건 추가
  const items = await qb.getMany(); // any 타입
  const total = await qb.getCount(); // 별도 쿼리 (비효율적)
  return { items, total };
}
```

**Repository 최적화 체크리스트:**
- [ ] SELECT 절에 필요한 컬럼만 명시
- [ ] 인덱스 활용을 위한 WHERE 조건 순서 최적화
- [ ] `Promise.all()`을 통한 COUNT와 데이터 쿼리 병렬 처리
- [ ] 명시적 타입 매핑 (`Partial<Entity>[]`)
- [ ] JOIN 조건 정확성 검증

### 에러 처리 표준

#### 에러 검증 및 메시지 패턴
```typescript
async createEntity(attrs: CreateAttrs): Promise<void> {
  try {
    // 1. 사전 검증 (비즈니스 규칙)
    if (attrs.name && attrs.serviceId) {
      const existing = await this.repo.findOne({
        where: { name: attrs.name, serviceId: attrs.serviceId }
      });
      
      if (existing) {
        this.logger.warn('Entity creation failed: duplicate name', {
          name: attrs.name,
          serviceId: attrs.serviceId,
        });
        throw EntityException.entityAlreadyExists();
      }
    }

    // 2. 추가 비즈니스 규칙 검증
    await this.validateBusinessRules(attrs);

    // 3. 비즈니스 로직 실행
    const entity = new EntityClass();
    Object.assign(entity, attrs);
    await this.repo.save(entity);
    
    // 4. 성공 로깅
    this.logger.log('Entity created successfully', {
      entityId: entity.id,
      name: attrs.name,
      serviceId: attrs.serviceId,
    });
  } catch (error: unknown) {
    // 5. 에러 처리 및 로깅
    if (error instanceof HttpException) {
      throw error; // 이미 처리된 예외는 그대로 전파
    }

    this.logger.error('Entity creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      name: attrs.name,
      serviceId: attrs.serviceId,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    throw EntityException.entityCreateError();
  }
}
```

**에러 처리 체크리스트:**
- [ ] 사전 검증으로 데이터베이스 에러 방지
- [ ] HttpException 인스턴스 체크 후 재전파
- [ ] 구조화된 에러 로깅 (error, context, stack)
- [ ] 사용자 친화적 에러 메시지 (`EntityException` 사용)
- [ ] 민감정보 제외한 로깅

### TCP 컨트롤러 표준

#### 메시지 패턴 네이밍 규칙
```typescript
@Controller()
export class EntityTcpController {
  private readonly logger = new Logger(EntityTcpController.name);

  constructor(private readonly entityService: EntityService) {}

  // 조회 패턴
  @MessagePattern('entity.findById')
  async findById(@Payload() data: { entityId: string }) {
    this.logger.debug(`TCP entity detail request: ${data.entityId}`);
    // ...
  }

  @MessagePattern('entity.findByServiceIds')
  async findByServiceIds(@Payload() data: { serviceIds: string[] }) {
    this.logger.debug('TCP entities by services request', {
      serviceCount: data.serviceIds.length,
    });
    // ...
  }

  // 검색 패턴
  @MessagePattern('entity.search')
  async search(@Payload() query: EntitySearchQuery) {
    this.logger.debug('TCP entity search request', {
      hasNameFilter: !!query.name,
      serviceId: query.serviceId,
    });
    // ...
  }

  // 변경 패턴
  @MessagePattern('entity.create')
  async create(@Payload() data: CreateEntity) {
    this.logger.log('TCP entity creation requested', {
      name: data.name,
      serviceId: data.serviceId,
    });
    // ...
  }

  @MessagePattern('entity.update')
  async update(@Payload() data: { entityId: string; updateData: UpdateEntity }) {
    this.logger.log('TCP entity update requested', { entityId: data.entityId });
    // ...
  }

  @MessagePattern('entity.delete')
  async delete(@Payload() data: { entityId: string }) {
    this.logger.log('TCP entity deletion requested', { entityId: data.entityId });
    // ...
  }

  // 유틸리티 패턴
  @MessagePattern('entity.exists')
  async exists(@Payload() data: { entityId: string }) {
    this.logger.debug(`TCP entity existence check: ${data.entityId}`);
    // ...
  }
}
```

**TCP 컨트롤러 로깅 최적화:**
- **고빈도 API** (findById, exists): `DEBUG` 레벨
- **중요한 변경 작업** (create, update, delete): `LOG` 레벨
- **검색 작업**: `DEBUG` 레벨 (필요시 `LOG`)

### 성능 최적화 지침

#### Repository 성능 최적화
```typescript
// ✅ 최적화된 패턴
async searchWithOptimization(query: SearchQuery): Promise<PaginatedResult> {
  // 1. 필요한 컬럼만 SELECT
  const qb = this.createQueryBuilder('entity')
    .select(['entity.id', 'entity.name', 'entity.serviceId']);

  // 2. 인덱스 활용 순서로 WHERE 조건 구성
  if (query.serviceId) { // 인덱스가 있는 컬럼 우선
    qb.andWhere('entity.serviceId = :serviceId', { serviceId: query.serviceId });
  }
  
  if (query.name) { // LIKE 조건은 나중에
    qb.andWhere('entity.name LIKE :name', { name: `%${query.name}%` });
  }

  // 3. COUNT와 데이터를 병렬로 조회
  const [rows, total] = await Promise.all([
    qb.offset(skip).limit(limit).getRawMany(),
    qb.getCount()
  ]);

  return this.buildPaginatedResult(rows, total, query);
}
```

#### 로깅 성능 최적화
```typescript
// ✅ 로그 레벨별 최적화
class OptimizedService {
  async highFrequencyOperation(id: string): Promise<Entity> {
    // 고빈도 API는 DEBUG 레벨로 최소화
    this.logger.debug('High frequency operation', { entityId: id });
    return await this.repo.findById(id);
  }

  async criticalOperation(data: CreateData): Promise<void> {
    // 중요한 작업만 LOG 레벨
    this.logger.log('Critical operation started', {
      operation: 'create',
      entityType: data.type,
    });
    
    try {
      await this.performCriticalWork(data);
      this.logger.log('Critical operation completed', { entityId: result.id });
    } catch (error: unknown) {
      this.logger.error('Critical operation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'create',
      });
      throw error;
    }
  }
}
```

### 적용 체크리스트

새로운 NestJS 서비스 또는 기존 서비스 개선 시 다음 항목들을 확인:

#### TypeScript 코딩 표준
- [ ] 모든 함수에 명시적 반환 타입 지정
- [ ] any 타입 완전 제거
- [ ] catch 블록에 `error: unknown` 사용
- [ ] console 대신 Logger 사용

#### 서비스 클래스 구조
- [ ] PUBLIC METHODS와 PRIVATE HELPER METHODS 섹션 분리
- [ ] 메서드 순서: 조회 → 검색 → 변경 → Private 헬퍼
- [ ] 표준 메서드 네이밍 적용

#### 로깅 시스템
- [ ] 적절한 로그 레벨 사용 (ERROR/WARN/LOG/DEBUG)
- [ ] 구조화된 로그 메시지 형식
- [ ] 민감정보 제외
- [ ] 메타데이터 객체 포함

#### Repository 최적화
- [ ] SELECT 컬럼 명시
- [ ] 인덱스 활용 WHERE 순서
- [ ] Promise.all로 병렬 쿼리
- [ ] 명시적 타입 매핑

#### 에러 처리
- [ ] 사전 검증 구현
- [ ] HttpException 체크 및 전파
- [ ] 구조화된 에러 로깅
- [ ] 공통 Exception 클래스 사용

#### TCP 컨트롤러
- [ ] 표준 메시지 패턴 네이밍
- [ ] 적절한 로그 레벨 적용
- [ ] 구조화된 페이로드 타입

이러한 표준을 준수하면 krgeobuk 생태계의 모든 NestJS 서비스에서 일관된 코드 품질과 유지보수성을 보장할 수 있습니다.

---

# authz-server 전용 가이드

## 도메인 모듈 구조

authz-server는 다음과 같은 도메인 모듈들로 구성됩니다:

### 핵심 도메인
- **role** - 역할 관리 (기본 CRUD 패턴)
- **permission** - 권한 관리 (기본 CRUD 패턴)
- **role-permission** - 역할-권한 중간테이블 (중간테이블 패턴)
- **user-role** - 사용자-역할 중간테이블 (중간테이블 패턴)
- **service-visible-role** - 서비스 가시성 역할 중간테이블 (중간테이블 패턴)

## 중간테이블 도메인 구현 표준

중간테이블(Junction Table) 도메인은 두 개의 주 도메인 간의 다대다 관계를 관리하는 특수한 패턴입니다. krgeobuk 생태계에서는 다음과 같은 표준화된 구현 방식을 사용합니다.

### 중간테이블 도메인 특징

**기본 도메인과의 차이점:**
- 기본 도메인: 단일 엔티티의 CRUD 관리
- 중간테이블 도메인: 두 엔티티 간의 관계 관리 + 고성능 조회/배치 처리

**예시:** `user-role`, `role-permission`, `service-visible-role`

### Entity 설계 표준

#### 1. 복합 Primary Key 구조
```typescript
import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('user_role')
@Index('IDX_USER_ROLE_USER', ['userId'])
@Index('IDX_USER_ROLE_ROLE', ['roleId'])
@Index('IDX_USER_ROLE_UNIQUE', ['userId', 'roleId'], { unique: true })
export class UserRoleEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid' })
  roleId!: string;
}
```

**핵심 구성 요소:**
- **복합 Primary Key**: 두 관련 엔티티의 ID
- **개별 인덱스**: 각 FK에 대한 조회 최적화
- **유니크 제약조건**: 중복 관계 방지 및 성능 최적화

#### 2. 인덱스 최적화 패턴
```typescript
// 필수 인덱스 3종 세트
@Index('IDX_{TABLE}_USER', ['userId'])        // 사용자별 조회용
@Index('IDX_{TABLE}_ROLE', ['roleId'])        // 역할별 조회용  
@Index('IDX_{TABLE}_UNIQUE', ['userId', 'roleId'], { unique: true })  // 중복 방지
```

### Repository 설계 표준

#### 1. 최적화된 ID 조회 메서드
```typescript
@Injectable()
export class UserRoleRepository extends BaseRepository<UserRoleEntity> {
  
  /**
   * 사용자별 역할 ID 목록 조회 (최적화된 쿼리)
   */
  async findRoleIdsByUserId(userId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('ur')
      .select('ur.roleId')
      .where('ur.userId = :userId', { userId })
      .getRawMany();

    return result.map((row) => row.ur_roleId);
  }

  /**
   * 역할별 사용자 ID 목록 조회 (최적화된 쿼리)
   */
  async findUserIdsByRoleId(roleId: string): Promise<string[]> {
    const result = await this.createQueryBuilder('ur')
      .select('ur.userId')
      .where('ur.roleId = :roleId', { roleId })
      .getRawMany();

    return result.map((row) => row.ur_userId);
  }
}
```

#### 2. 배치 처리 메서드
```typescript
/**
 * 여러 사용자의 역할 ID 목록 조회 (배치 처리)
 */
async findRoleIdsByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
  const result = await this.createQueryBuilder('ur')
    .select(['ur.userId', 'ur.roleId'])
    .where('ur.userId IN (:...userIds)', { userIds })
    .getRawMany();

  const userRoleMap = new Map<string, string[]>();

  result.forEach((row) => {
    const userId = row.ur_userId;
    const roleId = row.ur_roleId;

    if (!userRoleMap.has(userId)) {
      userRoleMap.set(userId, []);
    }
    userRoleMap.get(userId)!.push(roleId);
  });

  return userRoleMap;
}

/**
 * 존재 확인 (count 기반 최적화)
 */
async existsUserRole(userId: string, roleId: string): Promise<boolean> {
  const count = await this.createQueryBuilder('ur')
    .where('ur.userId = :userId AND ur.roleId = :roleId', { userId, roleId })
    .getCount();

  return count > 0;
}
```

**Repository 최적화 원칙:**
- **ID만 조회**: `getRawMany()`로 필요한 컬럼만 SELECT
- **Map 반환**: 배치 처리에서 O(1) 접근을 위한 Map 구조
- **Count 기반**: 존재 확인은 `getCount()` 사용

### Service 설계 표준

#### 1. 메서드 계층 구조
```typescript
@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(private readonly userRoleRepo: UserRoleRepository) {}

  // ==================== 조회 메서드 (ID 목록 반환) ====================

  /**
   * 사용자의 역할 ID 목록 조회
   */
  async getRoleIds(userId: string): Promise<string[]> {
    try {
      return await this.userRoleRepo.findRoleIdsByUserId(userId);
    } catch (error: unknown) {
      this.logger.error('Role IDs fetch by user failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw UserRoleException.fetchError();
    }
  }

  /**
   * 역할의 사용자 ID 목록 조회
   */
  async getUserIds(roleId: string): Promise<string[]> {
    try {
      return await this.userRoleRepo.findUserIdsByRoleId(roleId);
    } catch (error: unknown) {
      this.logger.error('User IDs fetch by role failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        roleId,
      });
      throw UserRoleException.fetchError();
    }
  }

  /**
   * 사용자-역할 관계 존재 확인
   */
  async exists(userId: string, roleId: string): Promise<boolean> {
    try {
      return await this.userRoleRepo.existsUserRole(userId, roleId);
    } catch (error: unknown) {
      this.logger.error('User role existence check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleId,
      });
      throw UserRoleException.fetchError();
    }
  }

  /**
   * 여러 사용자의 역할 ID 목록 조회 (배치)
   */
  async getRoleIdsBatch(userIds: string[]): Promise<Map<string, string[]>> {
    try {
      return await this.userRoleRepo.findRoleIdsByUserIds(userIds);
    } catch (error: unknown) {
      this.logger.error('Role IDs fetch by users failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userCount: userIds.length,
      });
      throw UserRoleException.fetchError();
    }
  }

  // ==================== 변경 메서드 ====================

  /**
   * 단일 사용자-역할 할당
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    try {
      // 중복 확인
      const exists = await this.exists(userId, roleId);
      if (exists) {
        this.logger.warn('User role already assigned', { userId, roleId });
        throw UserRoleException.alreadyAssigned();
      }

      const entity = new UserRoleEntity();
      entity.userId = userId;
      entity.roleId = roleId;

      await this.userRoleRepo.save(entity);

      this.logger.log('User role assigned successfully', { userId, roleId });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('User role assignment failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleId,
      });

      throw UserRoleException.assignError();
    }
  }

  // ==================== 배치 처리 메서드 ====================

  /**
   * 여러 역할 할당 (배치)
   */
  async assignMultipleRoles(userId: string, roleIds: string[]): Promise<void> {
    try {
      const entities = roleIds.map((roleId) => {
        const entity = new UserRoleEntity();
        entity.userId = userId;
        entity.roleId = roleId;
        return entity;
      });

      // 배치 삽입 (중복 시 무시)
      await this.userRoleRepo
        .createQueryBuilder()
        .insert()
        .into(UserRoleEntity)
        .values(entities)
        .orIgnore() // MySQL: ON DUPLICATE KEY UPDATE (무시)
        .execute();

      this.logger.log('Multiple user roles assigned successfully', {
        userId,
        roleCount: roleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('Multiple user roles assignment failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        roleCount: roleIds.length,
      });

      throw UserRoleException.assignMultipleError();
    }
  }

  /**
   * 사용자 역할 완전 교체 (배치)
   */
  async replaceUserRoles(dto: { userId: string; roleIds: string[] }): Promise<void> {
    try {
      await this.userRoleRepo.manager.transaction(async (manager) => {
        // 1. 기존 역할 모두 삭제
        await manager.delete(UserRoleEntity, { userId: dto.userId });

        // 2. 새로운 역할 배치 삽입
        if (dto.roleIds.length > 0) {
          const entities = dto.roleIds.map((roleId) => {
            const entity = new UserRoleEntity();
            entity.userId = dto.userId;
            entity.roleId = roleId;
            return entity;
          });

          await manager.save(UserRoleEntity, entities);
        }
      });

      this.logger.log('User roles replaced successfully', {
        userId: dto.userId,
        newRoleCount: dto.roleIds.length,
      });
    } catch (error: unknown) {
      this.logger.error('User roles replacement failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: dto.userId,
        newRoleCount: dto.roleIds.length,
      });

      throw UserRoleException.replaceError();
    }
  }
}
```

#### 2. 성능 최적화 원칙
**Repository 메서드 직접 호출:**
```typescript
// ✅ 올바른 패턴 - Repository 최적화 메서드 직접 사용
async getRoleIds(userId: string): Promise<string[]> {
  return await this.userRoleRepo.findRoleIdsByUserId(userId);
}

// ❌ 비효율적 패턴 - 전체 엔티티 조회 후 매핑
async getRoleIds(userId: string): Promise<string[]> {
  const userRoles = await this.findByUserId(userId);
  return userRoles.map(ur => ur.roleId);
}
```

### Controller 설계 표준

#### 1. 중간테이블 RESTful API 패턴
```typescript
@SwaggerApiTags({ tags: ['user-roles'] })
@SwaggerApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller()
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  // ==================== 조회 API ====================

  @Get('users/:userId/roles')
  async getRoleIdsByUserId(
    @Param() params: UserIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<string[]> {
    return this.userRoleService.getRoleIds(params.userId);
  }

  @Get('roles/:roleId/users')
  async getUserIdsByRoleId(
    @Param() params: RoleIdParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<string[]> {
    return this.userRoleService.getUserIds(params.roleId);
  }

  @Get('users/:userId/roles/:roleId/exists')
  async checkUserRoleExists(
    @Param() params: UserRoleParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<boolean> {
    return this.userRoleService.exists(params.userId, params.roleId);
  }

  // ==================== 변경 API ====================

  @Post('users/:userId/roles/:roleId')
  async assignUserRole(
    @Param() params: UserRoleParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.userRoleService.assignRole(params.userId, params.roleId);
  }

  @Delete('users/:userId/roles/:roleId')
  async revokeUserRole(
    @Param() params: UserRoleParamsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.userRoleService.revokeRole(params.userId, params.roleId);
  }

  // ==================== 배치 처리 API ====================

  @Post('users/:userId/roles/batch')
  async assignMultipleRoles(
    @Param() params: UserIdParamsDto,
    @Body() dto: RoleIdsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.userRoleService.assignMultipleRoles(params.userId, dto.roleIds);
  }

  @Put('users/:userId/roles')
  async replaceUserRoles(
    @Param() params: UserIdParamsDto,
    @Body() dto: RoleIdsDto,
    @CurrentJwt() jwt: JwtPayload
  ): Promise<void> {
    await this.userRoleService.replaceUserRoles({
      userId: params.userId,
      roleIds: dto.roleIds,
    });
  }
}
```

#### 2. TCP Controller 패턴
```typescript
@Controller()
export class UserRoleTcpController {
  private readonly logger = new Logger(UserRoleTcpController.name);

  constructor(private readonly userRoleService: UserRoleService) {}

  @MessagePattern(UserRoleTcpPatterns.FIND_ROLES_BY_USER)
  async findRoleIdsByUserId(@Payload() data: TcpUserParams): Promise<string[]> {
    try {
      this.logger.debug('TCP user-role find roles by user requested', {
        userId: data.userId,
      });
      return await this.userRoleService.getRoleIds(data.userId);
    } catch (error: unknown) {
      this.logger.error('TCP user-role find roles by user failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
      });
      throw error;
    }
  }

  @MessagePattern(UserRoleTcpPatterns.REPLACE_ROLES)
  async replaceUserRoles(@Payload() data: TcpUserRoleBatch): Promise<TcpOperationResponse> {
    try {
      this.logger.log('TCP user-role replace requested', {
        userId: data.userId,
        newRoleCount: data.roleIds.length,
      });
      await this.userRoleService.replaceUserRoles(data);
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP user-role replace failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        newRoleCount: data.roleIds.length,
      });
      throw error;
    }
  }
}
```

### 중간테이블 구현 체크리스트

#### Entity 설계
- [ ] 복합 Primary Key 구조 (두 FK)
- [ ] 개별 FK 인덱스 구성
- [ ] 유니크 제약조건 (`{ unique: true }`)
- [ ] 적절한 테이블명 (snake_case)

#### Repository 최적화
- [ ] ID 전용 조회 메서드 (`getRawMany()` 사용)
- [ ] 배치 처리 메서드 (Map 반환)
- [ ] Count 기반 존재 확인
- [ ] 효율적 쿼리 패턴

#### Service 구조
- [ ] 조회 메서드 (단일 + 배치)
- [ ] 변경 메서드 (단일 + 배치)
- [ ] Replace 기능 (트랜잭션 기반)
- [ ] Repository 최적화 메서드 직접 사용

#### Controller 완전성
- [ ] RESTful API 패턴 (조회/변경/배치)
- [ ] TCP 메시지 패턴 지원
- [ ] Replace 엔드포인트 구현
- [ ] 적절한 Swagger 문서화

#### 성능 최적화
- [ ] 전체 엔티티 대신 ID만 조회
- [ ] 배치 처리로 N+1 쿼리 방지
- [ ] 트랜잭션 기반 안전한 Replace
- [ ] 인덱스 활용 쿼리 최적화

### 참고 구현체

**완전한 중간테이블 구현 예시:**
- `user-role` 모듈: 사용자-역할 관계 관리
- `role-permission` 모듈: 역할-권한 관계 관리

이 표준을 따르면 고성능, 일관성 있는 중간테이블 도메인을 구현할 수 있으며, 마이크로서비스 간 TCP 통신에서도 효율적인 관계 데이터 조회가 가능합니다.

### 경로 별칭
TypeScript 경로 별칭:
- `@modules/*` → `src/modules/*`
- `@common/*` → `src/common/*`
- `@config/*` → `src/config/*`
- `@database/*` → `src/database/*`

### 환경 설정
- **포트**: 8100
- **MySQL**: 포트 3308
- **Redis**: 포트 6381
- **환경 파일**: `envs/` 디렉토리

### 네트워크 구성
- **authz-network**: authz-server 내부 통신
- **msa-network**: 마이크로서비스 간 통신
- **shared-network**: 공유 리소스 접근

## 개발 참고사항

- **ES 모듈 활성화**: package.json에 `"type": "module"`
- **경로 별칭 해결**: 빌드 출력에서 `tsc-alias` 사용
- **코드 스타일**: 100자 줄 길이, 단일 따옴표, 세미콜론
- **ESLint 설정**: `@krgeobuk/eslint-config/nest` 확장
- **Docker 핫 리로드**: 컨테이너 개발용 특별 감시 옵션