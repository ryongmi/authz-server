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