import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { UpdatePlaybackProgressDto } from './dto/update-playback-progress.dto';
import { CreateVideoCommentDto } from './dto/create-video-comment.dto';
import { SuccessResponse } from '@src/commons/dtos';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

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
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['name', 'size', 'date'] })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] })
  async findAll(
    @Request() req: any,
    @Query('folderUuid') folderUuid?: string,
    @Query('isTrashed') isTrashed?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('sort') sort?: 'name' | 'size' | 'date',
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('isStarred') isStarred?: string,
  ) {
    const result = await this.fileService.findAll(
      req.user,
      folderUuid,
      isTrashed === 'true',
      search,
      type,
      sort,
      order,
      isStarred === 'true',
    );
    return new SuccessResponse('Files retrieved successfully', result);
  }

  @Get('continue-watching')
  @ApiOperation({ summary: 'Get latest continue-watching video item' })
  async getContinueWatching(@Request() req: any) {
    const result = await this.fileService.getContinueWatching(req.user);
    return new SuccessResponse('Continue watching item retrieved successfully', result);
  }

  @Get(':uuid/playback-progress')
  @ApiOperation({ summary: 'Get playback progress for a video file' })
  async getPlaybackProgress(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.fileService.getPlaybackProgress(uuid, req.user);
    return new SuccessResponse('Playback progress retrieved successfully', result);
  }

  @Put(':uuid/playback-progress')
  @ApiOperation({ summary: 'Upsert playback progress for a video file' })
  async updatePlaybackProgress(
    @Param('uuid') uuid: string,
    @Request() req: any,
    @Body() dto: UpdatePlaybackProgressDto,
  ) {
    const result = await this.fileService.upsertPlaybackProgress(uuid, req.user, dto);
    return new SuccessResponse('Playback progress updated successfully', result);
  }

  @Delete(':uuid/playback-progress')
  @ApiOperation({ summary: 'Dismiss playback progress for a video file' })
  async dismissPlaybackProgress(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.fileService.dismissPlaybackProgress(uuid, req.user);
    return new SuccessResponse('Playback progress dismissed successfully', result);
  }

  @Get(':uuid/comments')
  @ApiOperation({ summary: 'List comments for a video file' })
  async listVideoComments(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.fileService.listVideoComments(uuid, req.user);
    return new SuccessResponse('Comments retrieved successfully', result);
  }

  @Post(':uuid/comments')
  @ApiOperation({ summary: 'Create a comment for a video file' })
  async createVideoComment(
    @Param('uuid') uuid: string,
    @Request() req: any,
    @Body() dto: CreateVideoCommentDto,
  ) {
    const result = await this.fileService.createVideoComment(uuid, req.user, dto);
    return new SuccessResponse('Comment created successfully', result);
  }

  @Delete(':uuid/comments/:commentUuid')
  @ApiOperation({ summary: 'Delete own comment from a video file' })
  async deleteVideoComment(
    @Param('uuid') uuid: string,
    @Param('commentUuid') commentUuid: string,
    @Request() req: any,
  ) {
    const result = await this.fileService.deleteVideoComment(uuid, commentUuid, req.user);
    return new SuccessResponse('Comment deleted successfully', result);
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
    const file = await this.fileService.findAccessible(uuid, req.user);
    const stream = await this.fileService.getDownloadStream(uuid, req.user);

    res.set({
      'Content-Type': file.mime_type,
      'Content-Disposition': `attachment; filename="${file.name}"`,
    });

    stream.pipe(res);
  }

  @Get(':uuid/content')
  @ApiOperation({ summary: 'View file content (inline)' })
  async content(@Param('uuid') uuid: string, @Request() req: any, @Res() res: Response) {
    const file = await this.fileService.findAccessible(uuid, req.user);

    if (file.storage_provider === 'local') {
      const filePath = path.resolve('uploads', file.storage_path);
      const { size: fileSize } = await fs.promises.stat(filePath);
      const rangeHeader = req.headers.range as string | undefined;

      if (rangeHeader) {
        const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
        if (!rangeMatch) {
          res.status(416).set({
            'Content-Range': `bytes */${fileSize}`,
          });
          return res.end();
        }

        const start = rangeMatch[1] ? Number.parseInt(rangeMatch[1], 10) : 0;
        const requestedEnd = rangeMatch[2] ? Number.parseInt(rangeMatch[2], 10) : fileSize - 1;
        const end = Math.min(requestedEnd, fileSize - 1);

        if (
          Number.isNaN(start) ||
          Number.isNaN(end) ||
          start < 0 ||
          start > end ||
          start >= fileSize
        ) {
          res.status(416).set({
            'Content-Range': `bytes */${fileSize}`,
          });
          return res.end();
        }

        const chunkSize = end - start + 1;
        res.status(206).set({
          'Content-Type': file.mime_type,
          'Content-Disposition': `inline; filename="${file.name}"`,
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': String(chunkSize),
        });

        return fs.createReadStream(filePath, { start, end }).pipe(res);
      }

      res.set({
        'Content-Type': file.mime_type,
        'Content-Disposition': `inline; filename="${file.name}"`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(fileSize),
      });

      return fs.createReadStream(filePath).pipe(res);
    }

    const stream = await this.fileService.getDownloadStream(uuid, req.user);
    res.set({
      'Content-Type': file.mime_type,
      'Content-Disposition': `inline; filename="${file.name}"`,
      'Accept-Ranges': 'bytes',
    });
    return stream.pipe(res);
  }

  @Post(':uuid/toggle-star')
  @ApiOperation({ summary: 'Toggle star status of a file' })
  async toggleStar(@Request() req: any, @Param('uuid') uuid: string) {
    const result = await this.fileService.toggleStar(uuid, req.user);
    return new SuccessResponse('File star status toggled successfully', result);
  }

  @Get(':uuid/signed-url')
  @ApiOperation({ summary: 'Get signed URL for file' })
  async getSignedUrl(@Param('uuid') uuid: string, @Request() req: any) {
    const url = await this.fileService.getSignedUrl(uuid, req.user);
    return new SuccessResponse('Signed URL generated successfully', { url });
  }

  @Post('download-zip')
  @ApiOperation({ summary: 'Download multiple files as ZIP' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        uuids: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  })
  async downloadZip(@Body() body: { uuids: string[] }, @Request() req: any, @Res() res: Response) {
    const archive = await this.fileService.downloadZip(body.uuids, req.user);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="download-${Date.now()}.zip"`,
    });

    archive.pipe(res);
  }
}
