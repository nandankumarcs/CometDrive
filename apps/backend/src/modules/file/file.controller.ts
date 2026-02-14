import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@src/modules/auth/guards/jwt-auth.guard';
import { FileService } from './file.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { Response } from 'express';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'files', version: '1' })
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folderUuid: { type: 'string' },
      },
    },
  })
  upload(@UploadedFile() file: any, @Body() createFileDto: CreateFileDto, @Request() req: any) {
    return this.fileService.upload(file, req.user, createFileDto);
  }

  @Get()
  @ApiOperation({ summary: 'List files' })
  @ApiQuery({ name: 'folderUuid', required: false })
  @ApiQuery({ name: 'isTrashed', required: false, type: Boolean })
  findAll(
    @Request() req: any,
    @Query('folderUuid') folderUuid?: string,
    @Query('isTrashed') isTrashed?: string,
  ) {
    return this.fileService.findAll(req.user, folderUuid, isTrashed === 'true');
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get file details' })
  findOne(@Param('uuid') uuid: string, @Request() req: any) {
    return this.fileService.findOne(uuid, req.user);
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update file (rename or move)' })
  update(@Param('uuid') uuid: string, @Body() updateFileDto: UpdateFileDto, @Request() req: any) {
    return this.fileService.update(uuid, updateFileDto, req.user);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Move file to trash' })
  trash(@Param('uuid') uuid: string, @Request() req: any) {
    return this.fileService.trash(uuid, req.user);
  }

  @Post(':uuid/restore')
  @ApiOperation({ summary: 'Restore file from trash' })
  restore(@Param('uuid') uuid: string, @Request() req: any) {
    return this.fileService.restore(uuid, req.user);
  }

  @Delete(':uuid/permanent')
  @ApiOperation({ summary: 'Delete file permanently' })
  deletePermanently(@Param('uuid') uuid: string, @Request() req: any) {
    return this.fileService.deletePermanently(uuid, req.user);
  }

  @Get(':uuid/download')
  @ApiOperation({ summary: 'Download file' })
  async download(@Param('uuid') uuid: string, @Request() req: any, @Res() res: Response) {
    const file = await this.fileService.findOne(uuid, req.user);
    const stream = await this.fileService.getDownloadStream(uuid, req.user);

    res.set({
      'Content-Type': file.mime_type,
      'Content-Disposition': `attachment; filename="${file.name}"`,
    });

    stream.pipe(res);
  }

  @Get(':uuid/signed-url')
  @ApiOperation({ summary: 'Get signed URL for file' })
  async getSignedUrl(@Param('uuid') uuid: string, @Request() req: any) {
    const url = await this.fileService.getSignedUrl(uuid, req.user);
    return { url };
  }
}
