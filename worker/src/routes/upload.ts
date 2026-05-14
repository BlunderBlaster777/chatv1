import { Hono } from 'hono';
import { newId } from '../lib/id';

type Env = { BUCKET: R2Bucket };
type Variables = { userId: string };

const upload = new Hono<{ Bindings: Env; Variables: Variables }>();

upload.post('/', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'No file' }, 400);
  if (file.size > 8 * 1024 * 1024) return c.json({ error: 'Max 8 MB' }, 413);

  const ext = file.name.split('.').pop() ?? 'bin';
  const key = `uploads/${c.var.userId}/${newId()}.${ext}`;
  await c.env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return c.json({ url: `/files/${key}` });
});

upload.get('/files/*', async (c) => {
  const key = c.req.path.replace('/files/', '');
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.json({ error: 'Not found' }, 404);
  return new Response(obj.body, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream' },
  });
});

export default upload;
