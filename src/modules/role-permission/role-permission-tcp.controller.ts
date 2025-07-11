import { Body, Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { Serialize } from '@krgeobuk/core/decorators';
import { 
  SwaggerApiTags, 
  SwaggerApiOperation, 
  SwaggerApiBody, 
  SwaggerApiOkResponse, 
  SwaggerApiErrorResponse 
} from '@krgeobuk/swagger/decorators';
import { 
  AssignMultiplePermissionsDto, 
  RevokeMultiplePermissionsDto, 
  ReplaceRolePermissionsDto, 
  RolePermissionDetailDto 
} from '@krgeobuk/authz-relations/role-permission/dtos';
import { 
  RolePermissionResponse, 
  RolePermissionError 
} from '@krgeobuk/authz-relations/role-permission';

import { RolePermissionService } from './role-permission.service.js';

@SwaggerApiTags({ tags: ['role-permissions-tcp'] })
@Controller()
export class RolePermissionTcpController {
  constructor(private readonly rolePermissionService: RolePermissionService) {}

  @MessagePattern('role-permission.assign-multiple')
  @SwaggerApiOperation({ 
    summary: '역할에 여러 권한 할당 (TCP)', 
    description: '역할에 여러 권한을 한번에 할당합니다.' 
  })
  @SwaggerApiBody({ 
    dto: AssignMultiplePermissionsDto, 
    description: '여러 권한 할당 데이터' 
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS.statusCode,
    description: RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS.message,
    dto: RolePermissionDetailDto,
    isArray: true,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.ASSIGN_MULTIPLE_ERROR.statusCode,
    description: RolePermissionError.ASSIGN_MULTIPLE_ERROR.message,
  })
  @Serialize({
    dto: RolePermissionDetailDto,
    ...RolePermissionResponse.ASSIGN_MULTIPLE_SUCCESS,
  })
  async assignMultiplePermissions(
    @Payload() dto: AssignMultiplePermissionsDto
  ): Promise<RolePermissionDetailDto[]> {
    return this.rolePermissionService.assignMultiplePermissions(dto);
  }

  @MessagePattern('role-permission.revoke-multiple')
  @SwaggerApiOperation({ 
    summary: '역할에서 여러 권한 해제 (TCP)', 
    description: '역할에서 여러 권한을 한번에 해제합니다.' 
  })
  @SwaggerApiBody({ 
    dto: RevokeMultiplePermissionsDto, 
    description: '여러 권한 해제 데이터' 
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS.statusCode,
    description: RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.REVOKE_MULTIPLE_ERROR.statusCode,
    description: RolePermissionError.REVOKE_MULTIPLE_ERROR.message,
  })
  @Serialize({
    ...RolePermissionResponse.REVOKE_MULTIPLE_SUCCESS,
  })
  async revokeMultiplePermissions(
    @Payload() dto: RevokeMultiplePermissionsDto
  ): Promise<void> {
    await this.rolePermissionService.revokeMultiplePermissions(dto);
  }

  @MessagePattern('role-permission.replace-permissions')
  @SwaggerApiOperation({ 
    summary: '역할 권한 교체 (TCP)', 
    description: '역할의 모든 권한을 새로운 권한들로 교체합니다.' 
  })
  @SwaggerApiBody({ 
    dto: ReplaceRolePermissionsDto, 
    description: '권한 교체 데이터' 
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.REPLACE_SUCCESS.statusCode,
    description: RolePermissionResponse.REPLACE_SUCCESS.message,
    dto: RolePermissionDetailDto,
    isArray: true,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.REPLACE_ERROR.statusCode,
    description: RolePermissionError.REPLACE_ERROR.message,
  })
  @Serialize({
    dto: RolePermissionDetailDto,
    ...RolePermissionResponse.REPLACE_SUCCESS,
  })
  async replaceRolePermissions(
    @Payload() dto: ReplaceRolePermissionsDto
  ): Promise<RolePermissionDetailDto[]> {
    return this.rolePermissionService.replaceRolePermissions(dto);
  }

  @MessagePattern('role-permission.find-permissions-by-role')
  @SwaggerApiOperation({ 
    summary: '역할의 권한 ID 목록 조회 (TCP)', 
    description: '특정 역할이 가진 모든 권한 ID를 조회합니다.' 
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.FETCH_SUCCESS.statusCode,
    description: RolePermissionResponse.FETCH_SUCCESS.message,
    type: [String],
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.FETCH_ERROR.statusCode,
    description: RolePermissionError.FETCH_ERROR.message,
  })
  @Serialize({
    ...RolePermissionResponse.FETCH_SUCCESS,
  })
  async findPermissionIdsByRoleId(
    @Payload('roleId') roleId: string
  ): Promise<string[]> {
    return this.rolePermissionService.findPermissionIdsByRoleId(roleId);
  }

  @MessagePattern('role-permission.find-roles-by-permission')
  @SwaggerApiOperation({ 
    summary: '권한의 역할 ID 목록 조회 (TCP)', 
    description: '특정 권한을 가진 모든 역할 ID를 조회합니다.' 
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.FETCH_SUCCESS.statusCode,
    description: RolePermissionResponse.FETCH_SUCCESS.message,
    type: [String],
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.FETCH_ERROR.statusCode,
    description: RolePermissionError.FETCH_ERROR.message,
  })
  @Serialize({
    ...RolePermissionResponse.FETCH_SUCCESS,
  })
  async findRoleIdsByPermissionId(
    @Payload('permissionId') permissionId: string
  ): Promise<string[]> {
    return this.rolePermissionService.findRoleIdsByPermissionId(permissionId);
  }

  @MessagePattern('role-permission.exists')
  @SwaggerApiOperation({ 
    summary: '역할-권한 관계 존재 확인 (TCP)', 
    description: '특정 역할이 특정 권한을 가지고 있는지 확인합니다.' 
  })
  @SwaggerApiOkResponse({
    status: RolePermissionResponse.FETCH_SUCCESS.statusCode,
    description: RolePermissionResponse.FETCH_SUCCESS.message,
    type: Boolean,
  })
  @SwaggerApiErrorResponse({
    status: RolePermissionError.FETCH_ERROR.statusCode,
    description: RolePermissionError.FETCH_ERROR.message,
  })
  @Serialize({
    ...RolePermissionResponse.FETCH_SUCCESS,
  })
  async existsRolePermission(
    @Payload() data: { roleId: string; permissionId: string }
  ): Promise<boolean> {
    return this.rolePermissionService.existsRolePermission(data.roleId, data.permissionId);
  }
}