const request = require('supertest');

jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../repositories/fileRepository');

const fileRepository = require('../repositories/fileRepository');
const app = require('../app');

const NAME = 'a'.repeat(32) + '.png';
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);

beforeEach(() => jest.resetAllMocks());

describe('serving stored images', () => {
  test('serves a stored image with safe headers', async () => {
    fileRepository.find.mockResolvedValue({ mime_type: 'image/png', data: PNG });
    const res = await request(app).get('/uploads/' + NAME);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(res.body, PNG)).toBe(0);
  });

  test('an unknown image gives 404', async () => {
    fileRepository.find.mockResolvedValue(null);
    const res = await request(app).get('/uploads/' + NAME);
    expect(res.status).toBe(404);
  });

  test.each(['abc.png', 'script.php', 'a'.repeat(32) + '.exe'])(
    'a name that is not one of ours (%s) is refused before the database', async (name) => {
      const res = await request(app).get('/uploads/' + name);
      expect(res.status).toBe(404);
      expect(fileRepository.find).not.toHaveBeenCalled();
    });
});