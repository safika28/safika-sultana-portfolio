import { BadRequestException, Body, Controller, HttpException, HttpStatus, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Throttle } from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { DatabaseService } from '../database/database.service';

export class CreateContactDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(2, 100)
  name: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(3, 160)
  subject?: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(10, 5000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(0)
  website?: string;
}

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly database: DatabaseService) {}

  @Post('inquiry')
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ApiOperation({ summary: 'Submit a new inquiry' })
  async submitInquiry(@Body() body: CreateContactDto, @Req() request: Request) {
    if (body.website) throw new BadRequestException('Please try again.');
    const db = this.database.getClient();
    if (!db) throw new ServiceUnavailableException('Messaging is not configured. Please email safikasultana90@gmail.com.');
    try {
      const secret = process.env.CONTACT_RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
      const clientHash = createHash('sha256').update(secret).update((request.ip || 'unknown').slice(0, 100)).digest('hex');
      const limit = await db.rpc('consume_contact_limit', { client_hash: clientHash });
      if (limit.error) throw new ServiceUnavailableException('Messaging is temporarily unavailable.');
      if (limit.data !== true) throw new HttpException('Please wait 10 minutes before sending another message.', HttpStatus.TOO_MANY_REQUESTS);
      const { error } = await db.from('inquiries').insert({ name: body.name, email: body.email, subject: body.subject || 'Portfolio inquiry', message: body.message });
      if (error) throw new ServiceUnavailableException('Your message could not be saved. Please try email.');
      return { status: 'received', message: 'Your inquiry has been saved for review.' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Messaging is temporarily unavailable. Please try email.');
    }
  }
}
