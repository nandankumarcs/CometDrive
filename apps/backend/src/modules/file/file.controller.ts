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
import { SuccessResponse } from '@src/commons/dtos';
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
  async upload(
    @UploadedFile() file: any,
    @Body() createFileDto: CreateFileDto,
    @Request() req: any,
  ) {
    const result = await this.fileService.upload(file, req.user, createFileDto);
    return new SuccessResponse('File uploaded successfully', result);
  }

  @Get()
  @ApiOperation({ summary: 'List files' })
  @ApiQuery({ name: 'folderUuid', required: false })
  @ApiQuery({ name: 'isTrashed', required: false, type: Boolean })
  async findAll(
    @Request() req: any,
    @Query('folderUuid') folderUuid?: string,
    @Query('isTrashed') isTrashed?: string,
  ) {
    const result = await this.fileService.findAll(req.user, folderUuid, isTrashed === 'true');
    return new SuccessResponse('Files retrieved successfully', result);
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get file details' })
  async findOne(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.fileService.findOne(uuid, req.user);
    return new SuccessResponse('File retrieved successfully', result);
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update file (rename or move)' })
  async update(
    @Param('uuid') uuid: string,
    @Body() updateFileDto: UpdateFileDto,
    @Request() req: any,
  ) {
    const result = await this.fileService.update(uuid, updateFileDto, req.user);
    return new SuccessResponse('File updated successfully', result);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Move file to trash' })
  async trash(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.fileService.trash(uuid, req.user);
    return new SuccessResponse('File moved to trash', result);
  }

  @Post(':uuid/restore')
  @ApiOperation({ summary: 'Restore file from trash' })
  async restore(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.fileService.restore(uuid, req.user);
    return new SuccessResponse('File restored successfully', result);
  }

  @Delete(':uuid/permanent')
  @ApiOperation({ summary: 'Delete file permanently' })
  async deletePermanently(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.fileService.deletePermanently(uuid, req.user);
    return new SuccessResponse('File deleted permanently', result);
  }

  @Delete('trash/empty')
  @ApiOperation({ summary: 'Empty trash (delete all trashed files)' })
  async emptyTrash(@Request() req: any) {
    const result = await this.fileService.emptyTrash(req.user);
    return new SuccessResponse('Trash emptied successfully', result);
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
    return new SuccessResponse('Signed URL generated successfully', { url });
  }
}
