import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('comments')
@ApiBearerAuth()
@Controller({ path: 'comments', version: '1' })
export class CommentController {}
