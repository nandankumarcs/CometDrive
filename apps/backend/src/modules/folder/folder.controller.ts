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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@src/modules/auth/guards/jwt-auth.guard';
import { FolderService } from './folder.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { SuccessResponse } from '@src/commons/dtos';

@ApiTags('Folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'folders', version: '1' })
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new folder' })
  async create(@Body() createFolderDto: CreateFolderDto, @Request() req: any) {
    const result = await this.folderService.create(createFolderDto, req.user);
    return new SuccessResponse('Folder created successfully', result);
  }

  @Get()
  @ApiOperation({ summary: 'List folders' })
  @ApiQuery({ name: 'parentUuid', required: false })
  @ApiQuery({ name: 'isTrashed', required: false, type: Boolean })
  async findAll(
    @Request() req: any,
    @Query('parentUuid') parentUuid?: string,
    @Query('isTrashed') isTrashed?: string,
  ) {
    const result = await this.folderService.findAll(req.user, parentUuid, isTrashed === 'true');
    return new SuccessResponse('Folders retrieved successfully', result);
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get folder details' })
  async findOne(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.folderService.findOne(uuid, req.user);
    return new SuccessResponse('Folder retrieved successfully', result);
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update folder (rename or move)' })
  async update(
    @Param('uuid') uuid: string,
    @Body() updateFolderDto: UpdateFolderDto,
    @Request() req: any,
  ) {
    const result = await this.folderService.update(uuid, updateFolderDto, req.user);
    return new SuccessResponse('Folder updated successfully', result);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Move folder to trash (soft delete)' })
  async trash(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.folderService.trash(uuid, req.user);
    return new SuccessResponse('Folder moved to trash', result);
  }

  @Post(':uuid/restore')
  @ApiOperation({ summary: 'Restore folder from trash' })
  async restore(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.folderService.restore(uuid, req.user);
    return new SuccessResponse('Folder restored successfully', result);
  }

  @Delete(':uuid/permanent')
  @ApiOperation({ summary: 'Delete folder permanently' })
  async deletePermanently(@Param('uuid') uuid: string, @Request() req: any) {
    const result = await this.folderService.deletePermanently(uuid, req.user);
    return new SuccessResponse('Folder deleted permanently', result);
  }

  @Delete('trash/empty')
  @ApiOperation({ summary: 'Empty trash (delete all trashed folders)' })
  async emptyTrash(@Request() req: any) {
    const result = await this.folderService.emptyTrash(req.user);
    return new SuccessResponse('Trash emptied successfully', result);
  }
}
