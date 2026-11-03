// Lists the images in a Google Drive folder. The API key stays on the server.
const API = 'https://www.googleapis.com/drive/v3/files';

module.exports = async (req, res) => {
  const { folder } = req.query;
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return res.status(500).json({ error: 'GOOGLE_API_KEY is not set' });
  if (!folder || !/^[\w-]+$/.test(folder)) return res.status(400).json({ error: 'Invalid folder' });

  const meta = await fetch(`${API}/${folder}?fields=name&key=${key}`);
  if (!meta.ok) return res.status(404).json({ error: 'Folder not found or not shared' });
  const { name } = await meta.json();

  const q = encodeURIComponent(`'${folder}' in parents and mimeType contains 'image/' and trashed=false`);
  const photos = [];
  let pageToken = '';
  do {
    const r = await fetch(
      `${API}?q=${q}&orderBy=name&pageSize=1000&fields=nextPageToken,files(id,name,thumbnailLink)&key=${key}` +
        (pageToken ? `&pageToken=${pageToken}` : '')
    );
    if (!r.ok) return res.status(502).json({ error: 'Google Drive request failed' });
    const data = await r.json();
    for (const f of data.files) {
      photos.push({ id: f.id, name: f.name, thumb: f.thumbnailLink ? f.thumbnailLink.replace(/=s\d+$/, '') : null });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.json({ name, photos });
};
