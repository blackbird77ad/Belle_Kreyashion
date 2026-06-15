import {
  completeYouTubeAuthorization,
  createYouTubeAuthorizationUrl,
  createYouTubeResumableUpload,
  disconnectYouTubeChannel,
  getYouTubeConnectionStatus,
} from '../Services/youtubeService.mjs';

const frontendBaseUrl = () => String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');

const errorStatus = (error, fallback = 500) => {
  const status = Number(error?.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : fallback;
};

export const getYouTubeStatus = async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await getYouTubeConnectionStatus());
  } catch (error) {
    res.status(errorStatus(error)).json({ message: error.message || 'Could not load YouTube status' });
  }
};

export const startYouTubeConnection = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const url = await createYouTubeAuthorizationUrl(req.body?.returnPath || '/admin');
    res.json({ url });
  } catch (error) {
    res.status(errorStatus(error)).json({ message: error.message || 'Could not start YouTube connection' });
  }
};

export const finishYouTubeConnection = async (req, res) => {
  let returnPath = '/admin';
  try {
    if (req.query.error) throw new Error(req.query.error_description || req.query.error);
    const result = await completeYouTubeAuthorization({ code: req.query.code, state: req.query.state });
    returnPath = result.returnPath || returnPath;
    const redirect = new URL(returnPath, `${frontendBaseUrl()}/`);
    redirect.searchParams.set('youtube', 'connected');
    redirect.searchParams.set('channel', result.channelTitle);
    res.redirect(redirect.toString());
  } catch (error) {
    const redirect = new URL(returnPath, `${frontendBaseUrl()}/`);
    redirect.searchParams.set('youtube', 'error');
    redirect.searchParams.set('message', error.message || 'YouTube connection failed');
    res.redirect(redirect.toString());
  }
};

export const disconnectYouTube = async (_req, res) => {
  try {
    await disconnectYouTubeChannel();
    res.json({ disconnected: true });
  } catch (error) {
    res.status(errorStatus(error)).json({ message: error.message || 'Could not disconnect YouTube' });
  }
};

export const startYouTubeUpload = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await createYouTubeResumableUpload(req.body || {}));
  } catch (error) {
    res.status(errorStatus(error)).json({ message: error.message || 'Could not start YouTube upload' });
  }
};
