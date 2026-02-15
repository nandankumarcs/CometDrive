import { Controller, Post, Delete, Get, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShareService } from './share.service';
import { CreateShareDto } from './dto/create-share.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SuccessResponse } from '../../commons/dtos/success-response.dto';

@ApiTags('shares')
@Controller('shares')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a share link for a file' })
  async create(@Request() req: any, @Body() createShareDto: CreateShareDto) {
    const share = await this.shareService.create(req.user, createShareDto);
    return new SuccessResponse('Share link created successfully', share);
  }

  @Delete('file/:fileUuid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a share link for a file' })
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

  @Get('public/:token')
  @Public() // Bypass Auth Guard
  @ApiOperation({ summary: 'Get shared file info by token (public)' })
  async findOneByToken(@Param('token') token: string) {
    const share = await this.shareService.findOneByToken(token);
    return new SuccessResponse('Shared file retrieved', share);
  }
}
