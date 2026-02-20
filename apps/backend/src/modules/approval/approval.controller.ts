import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller({ path: 'approvals', version: '1' })
export class ApprovalController {}
