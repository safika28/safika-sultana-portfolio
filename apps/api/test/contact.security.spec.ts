import { HttpException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request } from 'express';
import { ContactController, CreateContactDto } from '../src/contact/contact.controller';
import { DatabaseService } from '../src/database/database.service';

const valid = { name: 'A visitor', email: 'visitor@example.com', subject: 'A collaboration', message: 'I would like to discuss a project.' };
describe('Contact security and storage', () => {
  const previousSecret = process.env.CONTACT_RATE_LIMIT_SECRET;
  beforeAll(() => { process.env.CONTACT_RATE_LIMIT_SECRET = 'test-limiter-secret'; });
  afterAll(() => { if (previousSecret === undefined) delete process.env.CONTACT_RATE_LIMIT_SECRET; else process.env.CONTACT_RATE_LIMIT_SECRET = previousSecret; });
  it.each([
    { ...valid, email: 'invalid' },
    { ...valid, name: 'a' },
    { ...valid, message: 'short' },
    { ...valid, subject: 'x'.repeat(161) },
    { ...valid, website: 'spam.example' }
  ])('rejects invalid message input', async (input) => {
    expect((await validate(plainToInstance(CreateContactDto, input))).length).toBeGreaterThan(0);
  });
  it('does not claim receipt when the database is unconfigured', async () => {
    const controller = new ContactController({ getClient: () => null } as DatabaseService);
    await expect(controller.submitInquiry(valid, { ip: '127.0.0.1' } as Request)).rejects.toMatchObject({ status: 503 });
  });
  it('rejects requests after the durable limit without inserting', async () => {
    const insert = jest.fn();
    const controller = new ContactController({ getClient: () => ({ rpc: async () => ({ data: false, error: null }), from: () => ({ insert }) }) } as unknown as DatabaseService);
    await expect(controller.submitInquiry(valid, { ip: '127.0.0.1' } as Request)).rejects.toMatchObject({ status: 429 });
    expect(insert).not.toHaveBeenCalled();
  });
  it('fails closed when the durable limiter is unavailable', async () => {
    const controller = new ContactController({ getClient: () => ({ rpc: async () => ({ data: null, error: new Error('offline') }) }) } as unknown as DatabaseService);
    await expect(controller.submitInquiry(valid, { ip: '127.0.0.1' } as Request)).rejects.toBeInstanceOf(HttpException);
  });
  it('does not claim receipt after an insert failure', async () => {
    const controller = new ContactController({ getClient: () => ({ rpc: async () => ({ data: true, error: null }), from: () => ({ insert: async () => ({ error: new Error('offline') }) }) }) } as unknown as DatabaseService);
    await expect(controller.submitInquiry(valid, { ip: '127.0.0.1' } as Request)).rejects.toMatchObject({ status: 503 });
  });
  it('confirms actual storage without echoing private message data', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const controller = new ContactController({ getClient: () => ({ rpc: async () => ({ data: true, error: null }), from: () => ({ insert }) }) } as unknown as DatabaseService);
    const result = await controller.submitInquiry(valid, { ip: '127.0.0.1' } as Request);
    expect(insert).toHaveBeenCalledWith(valid);
    expect(result.status).toBe('received');
    expect(result).not.toHaveProperty('payload');
  });
});
