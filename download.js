// Streams one original photo from Drive as a file download (no zip, no re-compression).
const { Readable } = require('stream');
const API = 'https://www.googleapis.com/drive/v3/files';

module.exports = async (req, res) => {
  const { id, folder } = req.query;
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return res.status(500).send('GOOGLE_API_KEY is not set');
  if (!id || !folder || !/^[\w-]+$/.test(id) || !/^[\w-]+$/.test(folder)) return res.status(400).send('Invalid request');

  // Only serve images that really are inside the requested gallery folder.
  const meta = await fetch(`${API}/${id}?fields=name,mimeType,parents&key=${key}`);
  if (!meta.ok) return res.status(404).send('Photo not found');
  const file = await meta.json();
  if (!file.mimeType.startsWith('image/') || !(file.parents || []).includes(folder)) {
    return res.status(403).send('Not allowed');
  }

  const media = await fetch(`${API}/${id}?alt=media&key=${key}`);
  if (!media.ok) return res.status(502).send('Download failed');

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  const len = media.headers.get('content-length');
  if (len) res.setHeader('Content-Length', len);
  Readable.fromWeb(media.body).pipe(res);
};
