import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  @Post('inquiry')
  @ApiOperation({ summary: 'Submit a new inquiry' })
  submitInquiry(@Body() body: CreateContactDto) {
    return {
      status: 'received',
      message: 'Inquiry accepted for review.',
      payload: body
    };
  }
}
