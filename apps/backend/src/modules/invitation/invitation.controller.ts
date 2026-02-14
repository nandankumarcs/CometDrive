import { Body, Controller, Delete, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '@src/modules/auth/guards/jwt-auth.guard';
// import { RolesGuard } from ... // If we had roles guard

@ApiTags('Invitation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'invitations', version: '1' })
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invitation' })
  create(@Body() createInvitationDto: CreateInvitationDto, @Request() req: any) {
    return this.invitationService.create(createInvitationDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List all invitations' })
  findAll() {
    return this.invitationService.findAll();
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Revoke an invitation' })
  revoke(@Param('uuid') uuid: string) {
    return this.invitationService.revoke(uuid);
  }
}
