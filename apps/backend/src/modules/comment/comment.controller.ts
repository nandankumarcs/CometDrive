import { Controller, Get, Post, Body, Param, Delete, Patch, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment' })
  create(@Request() req: any, @Body() createCommentDto: CreateCommentDto) {
    return this.commentService.create(req.user, createCommentDto);
  }

  @Get('file/:uuid')
  @ApiOperation({ summary: 'Get all comments for a file' })
  findByFile(@Param('uuid') uuid: string) {
    return this.commentService.findByResource('file', uuid);
  }

  @Get('folder/:uuid')
  @ApiOperation({ summary: 'Get all comments for a folder' })
  findByFolder(@Param('uuid') uuid: string) {
    return this.commentService.findByResource('folder', uuid);
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update a comment' })
  update(
    @Request() req: any,
    @Param('uuid') uuid: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentService.update(req.user, uuid, updateCommentDto);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Request() req: any, @Param('uuid') uuid: string) {
    return this.commentService.remove(req.user, uuid);
  }
}
