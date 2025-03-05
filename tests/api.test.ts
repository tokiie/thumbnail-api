import request from 'supertest';
import app from '../src/app';

describe('API Endpoints', () => {
  it('GET / should return "Hello, world!"', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toEqual('Hello, world!');
  });
  it('GET / should return a 404', async () => {
    const res = await request(app).get('/random-endpoint');
    expect(res.statusCode).toEqual(404);
  });
});