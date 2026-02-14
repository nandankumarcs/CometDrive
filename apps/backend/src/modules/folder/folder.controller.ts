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

@ApiTags('Folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'folders', version: '1' })
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new folder' })
  create(@Body() createFolderDto: CreateFolderDto, @Request() req: any) {
    return this.folderService.create(createFolderDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List folders' })
  @ApiQuery({ name: 'parentUuid', required: false })
  @ApiQuery({ name: 'isTrashed', required: false, type: Boolean })
  findAll(
    @Request() req: any,
    @Query('parentUuid') parentUuid?: string,
    @Query('isTrashed') isTrashed?: string,
  ) {
    return this.folderService.findAll(req.user, parentUuid, isTrashed === 'true');
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get folder details' })
  findOne(@Param('uuid') uuid: string, @Request() req: any) {
    return this.folderService.findOne(uuid, req.user);
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update folder (rename or move)' })
  update(
    @Param('uuid') uuid: string,
    @Body() updateFolderDto: UpdateFolderDto,
    @Request() req: any,
  ) {
    return this.folderService.update(uuid, updateFolderDto, req.user);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Move folder to trash (soft delete)' })
  trash(@Param('uuid') uuid: string, @Request() req: any) {
    return this.folderService.trash(uuid, req.user);
  }

  @Post(':uuid/restore')
  @ApiOperation({ summary: 'Restore folder from trash' })
  restore(@Param('uuid') uuid: string, @Request() req: any) {
    return this.folderService.restore(uuid, req.user);
  }

  @Delete(':uuid/permanent')
  @ApiOperation({ summary: 'Delete folder permanently' })
  deletePermanently(@Param('uuid') uuid: string, @Request() req: any) {
    return this.folderService.deletePermanently(uuid, req.user);
  }
}
