import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Request,
  Patch,
  Headers,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShareService } from './share.service';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SuccessResponse } from '../../commons/dtos/success-response.dto';
import { Response } from 'express';

@ApiTags('shares')
@Controller({ path: 'shares', version: '1' })
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a share for a file or folder' })
  async create(@Request() req: any, @Body() createShareDto: CreateShareDto) {
    const share = await this.shareService.create(req.user, createShareDto);
    return new SuccessResponse('Share link created successfully', share);
  }

  @Delete(':shareUuid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific share' })
  async revokeByShareUuid(@Request() req: any, @Param('shareUuid') shareUuid: string) {
    await this.shareService.revokeByShareUuid(req.user, shareUuid);
    return new SuccessResponse('Share revoked successfully');
  }

  @Patch(':shareUuid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a share (permission or expiry)' })
  async updateShare(
    @Request() req: any,
    @Param('shareUuid') shareUuid: string,
    @Body() dto: UpdateShareDto,
  ) {
    const updated = await this.shareService.updateShare(req.user, shareUuid, dto);
    return new SuccessResponse('Share updated successfully', updated);
  }

  @Delete('file/:fileUuid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all shares for a file (legacy)' })
  async revoke(@Request() req: any, @Param('fileUuid') fileUuid: string) {
    await this.shareService.revoke(req.user, fileUuid);
    return new SuccessResponse('Share link revoked successfully');
  }

  @Get('file/:fileUuid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active share info for a file (internal)' })
  async getShareByFile(@Request() req: any, @Param('fileUuid') fileUuid: string) {
    const share = await this.shareService.getShareByFile(req.user, fileUuid);
    return new SuccessResponse('Share info retrieved', share);
  }

  @Get('folder/:folderUuid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active share info for a folder (internal)' })
  async getShareByFolder(@Request() req: any, @Param('folderUuid') folderUuid: string) {
    const share = await this.shareService.getShareByFolder(req.user, folderUuid);
    return new SuccessResponse('Share info retrieved', share);
  }

  @Get('resource/:resourceType/:resourceUuid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active shares for a resource (file or folder)' })
  async getSharesByResource(
    @Request() req: any,
    @Param('resourceType') resourceType: 'file' | 'folder',
    @Param('resourceUuid') resourceUuid: string,
  ) {
    const shares = await this.shareService.getSharesByResource(
      req.user,
      resourceType,
      resourceUuid,
    );
    return new SuccessResponse('Shares retrieved successfully', shares);
  }

  @Get('shared-with-me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List files/folders shared with the current user' })
  async getSharedWithMe(@Request() req: any) {
    const result = await this.shareService.findSharedWith(req.user);
    return new SuccessResponse('Shared files retrieved successfully', result);
  }

  @Get('public/:token')
  @Public() // Bypass Auth Guard
  @ApiOperation({ summary: 'Get shared file info by token (public)' })
  async findOneByToken(
    @Param('token') token: string,
    @Headers('x-share-password') password?: string,
  ) {
    const share = await this.shareService.findOneByToken(token, password);
    return new SuccessResponse('Shared file retrieved', share);
  }

  @Get('public/:token/download')
  @Public() // Bypass Auth Guard
  @ApiOperation({ summary: 'Download shared file by token (public)' })
  async downloadPublic(
    @Param('token') token: string,
    @Headers('x-share-password') passwordHeader: string | undefined,
    @Query('password') passwordQuery: string | undefined,
    @Res() res: Response,
  ) {
    const password = passwordHeader ?? passwordQuery;
    const { file, stream } = await this.shareService.getPublicDownload(token, password);

    res.set({
      'Content-Type': file.mime_type,
      'Content-Disposition': `attachment; filename="${file.name}"`,
    });

    stream.pipe(res);
  }
}
