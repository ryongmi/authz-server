# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 필요한 가이드를 제공합니다.

## 프로젝트 개요

이 프로젝트는 krgeobuk 서비스를 위한 NestJS 기반의 인가 서버(`authz-server`)입니다. TypeScript와 ES 모듈로 작성되었으며 역할 기반 접근 제어(RBAC) 시스템을 구현합니다.

## 개발 명령어

```bash
# 빌드 및 개발
npm run build              # TypeScript를 dist/로 빌드
npm run build:watch        # 감시 모드 TypeScript 컴파일
npm run start:dev          # 개발 서버 시작
npm run start:debug        # nodemon 디버깅으로 시작

# 코드 품질
npm run lint               # 소스 파일에 ESLint 실행
npm run lint-fix           # ESLint 문제 자동 수정
npm run format             # Prettier로 코드 포맷팅

# 테스트
npm test                   # Jest 테스트 실행
npm run test:watch         # 감시 모드로 테스트 실행
npm run test:cov           # 커버리지와 함께 테스트 실행
npm run test:e2e           # End-to-End 테스트 실행

# Docker 운영
npm run docker:local:up    # 로컬 Docker 환경 시작
npm run docker:dev:up      # 개발 Docker 환경 시작
npm run docker:prod:up     # 프로덕션 Docker 환경 시작
```

## 아키텍처

### 모듈 구조
애플리케이션은 도메인 주도 설계와 함께 NestJS 모듈러 아키텍처를 따릅니다:

- **Authorization Module**: 메인 인가 로직 및 엔드포인트
- **Permission Module**: 개별 권한의 CRUD 작업 관리
- **Role Module**: 역할 정의 및 관리 처리
- **Role-Permission Module**: 역할과 권한 간의 다대다 관계를 관리하는 중간 테이블
- **Service-Visible-Role Module**: 특정 서비스에 표시되는 역할 제어
- **User-Role Module**: 사용자-역할 할당 관리

각 모듈은 다음 패턴을 따릅니다: `controller` → `service` → `repository` → `entity`

### 주요 설정
- **경로 별칭**: 깔끔한 import를 위해 `tsconfig.json`에 설정됨:
  - `@modules/*` → `src/modules/*`
  - `@common/*` → `src/common/*`
  - `@config/*` → `src/config/*`
  - `@database/*` → `src/database/*`

- **데이터베이스**: MySQL과 캐싱을 위한 Redis와 함께 TypeORM 사용
- **인증**: 커스텀 `@krgeobuk/jwt` 패키지를 사용한 JWT 기반
- **로깅**: 일일 로테이션 파일 로깅을 포함한 Winston
- **API 문서**: `@krgeobuk/swagger`를 통한 Swagger 통합

### 의존성
이 프로젝트는 공유 기능을 위해 여러 내부 `@krgeobuk/*` 패키지를 사용합니다:
- `@krgeobuk/core`: 공통 인터페이스, 가드, 필터, 인터셉터
- `@krgeobuk/auth`: 인증 유틸리티
- `@krgeobuk/database-config`: 데이터베이스 설정
- `@krgeobuk/user`: 사용자 관리
- `@krgeobuk/oauth`: OAuth 통합

### 환경 및 설정
- 설정은 유효성 검사 스키마와 함께 `src/config/`에 중앙화됨
- Joi 유효성 검사와 함께 `@nestjs/config` 사용
- CORS 출처는 환경 변수를 통해 설정 가능
- 전역 API 접두사: `/api`

## 파일 조직

Repository 파일들이 최근에 재구성되었습니다:
- 기존 repository 파일들(`.repositoty.ts`로 끝나는)이 삭제됨
- 새로운 repository 파일들(`.repository.ts`로 끝나는)이 git에서 추적되지 않음
- 이는 repository 파일 이름의 오타를 수정하는 진행 중인 리팩터링을 의미함

## 개발 참고사항

- ES 모듈 활성화 (package.json에 `"type": "module"`)
- 빌드 출력에서 경로 별칭 해결을 위해 `tsc-alias` 사용
- 100자 줄 길이, 단일 따옴표, 세미콜론으로 Prettier 설정
- ESLint는 `@krgeobuk/eslint-config/nest` 설정을 확장
- 컨테이너 개발을 위한 특별한 감시 옵션으로 Docker 핫 리로드 설정

## 코딩 컨벤션 및 베스트 프랙티스

### TypeScript 코딩 규칙

#### 타입 안전성
- **any 타입 금지**: 모든 변수와 매개변수에 명시적 타입 지정
- **함수 반환값 타입 명시**: 모든 함수에 반환 타입 지정 필수
- **catch 블록 타입**: `catch (error: unknown)` 사용

```typescript
// ✅ 올바른 예시
async function getUserById(id: string): Promise<UserEntity | null> {
  try {
    return await this.userRepo.findOneById(id);
  } catch (error: unknown) {
    this.logger.error('User fetch failed', { error });
    throw error;
  }
}

// ❌ 잘못된 예시
async function getUserById(id) {  // 타입 누락
  try {
    return await this.userRepo.findOneById(id);
  } catch (error) {  // unknown 타입 누락
    console.log(error);  // console 사용 금지
    throw error;
  }
}
```

### 서비스 클래스 구조 규칙

#### 메서드 순서 및 그룹화
```typescript
@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);

  constructor(
    private readonly repo: ExampleRepository,
    // 의존성 주입
  ) {}

  // ==================== PUBLIC METHODS ====================

  // 1. 조회 메서드들
  async findById(id: string): Promise<Entity | null> { }
  async findByIdOrFail(id: string): Promise<Entity> { }
  async findByAnd(filter: Filter): Promise<Entity[]> { }
  async findByOr(filter: Filter): Promise<Entity[]> { }

  // 2. 검색 메서드들  
  async searchEntities(query: SearchQuery): Promise<PaginatedResult> { }
  async getEntityDetail(id: string): Promise<Detail> { }

  // 3. 변경 메서드들
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
}
```

#### 메서드 네이밍 규칙
- **조회**: `findById`, `findByServiceIds`, `findByAnd`, `findByOr`
- **검색**: `searchEntities`, `getEntityDetail`  
- **변경**: `createEntity`, `updateEntity`, `deleteEntity`
- **Private**: 목적에 맞는 동사 사용 (`build-`, `get-`, `validate-`, `process-`)

### 로깅 가이드라인

#### 로그 레벨 사용 기준
```typescript
// ERROR: 시스템 오류, 예외 상황
this.logger.error('Entity creation failed', {
  error: error instanceof Error ? error.message : 'Unknown error',
  entityId: id,
});

// WARN: 비정상적이지만 처리 가능한 상황
this.logger.warn('External service unavailable, using fallback', {
  service: 'auth-service',
  fallbackUsed: true,
});

// LOG/INFO: 중요한 비즈니스 이벤트
this.logger.log('Entity created successfully', {
  entityId: result.id,
  entityType: 'Role',
});

// DEBUG: 개발용, 고빈도 호출 API
this.logger.debug('TCP request received', {
  operation: 'findById',
  entityId: id,
});
```

#### 로그 메시지 구조
- **일관된 메시지 형식**: "Action + result + context"
- **구조화된 메타데이터**: 객체 형태로 컨텍스트 정보 포함
- **민감정보 제외**: 비밀번호, 토큰 등 로깅 금지

### Repository 최적화 규칙

#### 쿼리 최적화
```typescript
// ✅ SELECT 컬럼 명시
const qb = this.createQueryBuilder('entity')
  .select([
    'entity.id',
    'entity.name',
    'entity.description',
    // 필요한 컬럼만 선택
  ]);

// ✅ 타입 안전한 결과 매핑
const items: Partial<Entity>[] = rows.map((row) => ({
  id: row.entity_id,
  name: row.entity_name,
  // 명시적 타입 매핑
}));

// ❌ 모든 컬럼 조회 (비효율적)
const qb = this.createQueryBuilder('entity'); // SELECT *
```

### 에러 처리 표준

#### 에러 검증 및 메시지
```typescript
async createEntity(attrs: CreateAttrs): Promise<void> {
  try {
    // 1. 사전 검증
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

    // 2. 비즈니스 로직 실행
    await this.repo.save(entity);
    
    // 3. 성공 로깅
    this.logger.log('Entity created successfully', {
      name: attrs.name,
      serviceId: attrs.serviceId,
    });
  } catch (error: unknown) {
    // 4. 에러 처리
    if (error instanceof HttpException) {
      throw error; // 이미 처리된 예외는 그대로 전파
    }

    this.logger.error('Entity creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      name: attrs.name,
    });
    
    throw EntityException.entityCreateError();
  }
}
```

### TCP 컨트롤러 가이드라인

#### 메시지 패턴 네이밍
- **조회**: `entity.findById`, `entity.findByServiceIds`
- **검색**: `entity.search`  
- **변경**: `entity.create`, `entity.update`, `entity.delete`
- **유틸리티**: `entity.exists`, `entity.getStats`

#### 로그 최적화
```typescript
// 고빈도 API는 DEBUG 레벨
@MessagePattern('entity.findById')
async findById(@Payload() data: { entityId: string }) {
  this.logger.debug(`TCP entity detail request: ${data.entityId}`);
  // ...
}

// 중요한 변경 작업은 LOG 레벨  
@MessagePattern('entity.create')
async create(@Payload() data: CreateData) {
  this.logger.log('TCP entity creation requested', {
    name: data.name,
    serviceId: data.serviceId,
  });
  // ...
}
```

### 성능 최적화 지침

#### Repository 쿼리
- **필요한 컬럼만 SELECT**: `qb.select([...])` 사용
- **인덱스 활용**: 조건절 순서 최적화
- **COUNT 쿼리 분리**: `Promise.all([getData(), getCount()])`

#### 로깅 최적화
- **고빈도 API**: DEBUG 레벨 사용
- **구조화된 로그**: 검색 가능한 메타데이터 포함
- **민감정보 제외**: 개인정보, 인증 토큰 등

#### 에러 처리
- **사전 검증**: 데이터베이스 에러 전 비즈니스 규칙 검증
- **명확한 메시지**: 사용자 친화적 에러 메시지
- **적절한 로그 레벨**: ERROR vs WARN 구분

이 규칙들을 준수하여 일관되고 유지보수 가능한 코드를 작성하세요.

## API 응답 포맷
프로젝트 전체 API 응답 포맷 표준은 메인 CLAUDE.md의 "API 응답 포맷 표준" 섹션을 참조하세요.