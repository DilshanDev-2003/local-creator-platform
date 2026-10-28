// Runs before every test file. Gives the app the settings it normally reads from .env
process.env.SESSION_SECRET = 'test-secret';