import crypto from 'node:crypto';
import YouTubeConnection from '../Models/YouTubeConnection.mjs';

const CONNECTION_KEY = 'primary';
const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const YOUTUBE_READ_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';
const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

const trim = (value = '') => String(value || '').trim();
const withoutTrailingSlash = (value = '') => trim(value).replace(/\/+$/, '');
const hash = (value = '') => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const getConfig = () => {
  const clientId = trim(process.env.YOUTUBE_CLIENT_ID);
  const clientSecret = trim(process.env.YOUTUBE_CLIENT_SECRET);
  const backendBaseUrl = withoutTrailingSlash(
    process.env.BACKEND_PUBLIC_URL || process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL
  );
  const redirectUri = trim(process.env.YOUTUBE_OAUTH_REDIRECT_URI)
    || (backendBaseUrl ? `${backendBaseUrl}/api/youtube/oauth/callback` : '');
  const encryptionSecret = trim(process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET);

  return {
    clientId,
    clientSecret,
    redirectUri,
    encryptionSecret,
    configured: !!(clientId && clientSecret && redirectUri && encryptionSecret),
  };
};

const requireConfig = () => {
  const config = getConfig();
  if (!config.configured) {
    const error = new Error('YouTube is not configured. Add the YouTube OAuth environment values on the backend.');
    error.status = 503;
    throw error;
  }
  return config;
};

const getEncryptionKey = (secret) => crypto.createHash('sha256').update(secret).digest();

const encryptRefreshToken = (refreshToken, secret) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(refreshToken, 'utf8'), cipher.final()]);
  return {
    tokenCiphertext: ciphertext.toString('base64'),
    tokenIv: iv.toString('base64'),
    tokenAuthTag: cipher.getAuthTag().toString('base64'),
  };
};

const decryptRefreshToken = (connection, secret) => {
  if (!connection?.tokenCiphertext || !connection?.tokenIv || !connection?.tokenAuthTag) {
    throw new Error('YouTube connection is missing its refresh token. Reconnect the channel.');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(secret),
    Buffer.from(connection.tokenIv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(connection.tokenAuthTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(connection.tokenCiphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

const requestGoogleToken = async (params) => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error_description || data.error || 'Google OAuth token request failed');
    error.status = response.status;
    throw error;
  }
  return data;
};

const getAccessToken = async (connection) => {
  const config = requireConfig();
  const refreshToken = decryptRefreshToken(connection, config.encryptionSecret);
  const data = await requestGoogleToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  return data.access_token;
};

const fetchConnectedChannel = async (accessToken) => {
  const response = await fetch(`${YOUTUBE_API_URL}/channels?part=id%2Csnippet&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || 'Could not read the connected YouTube channel');
  }
  const channel = data.items?.[0];
  if (!channel?.id) throw new Error('The selected Google account does not have an available YouTube channel');
  return {
    channelId: channel.id,
    channelTitle: channel.snippet?.title || 'YouTube Channel',
  };
};

const sanitizeReturnPath = (value = '/admin') => {
  const path = trim(value);
  return path.startsWith('/') && !path.startsWith('//') ? path : '/admin';
};

export const getYouTubeConnectionStatus = async () => {
  const config = getConfig();
  const connection = await YouTubeConnection.findOne({ key: CONNECTION_KEY }).lean();
  return {
    configured: config.configured,
    connected: !!(connection?.channelId && connection?.tokenCiphertext),
    channelId: connection?.channelId || '',
    channelTitle: connection?.channelTitle || '',
    connectedAt: connection?.connectedAt || null,
    requestedPrivacy: 'unlisted',
    auditWarning: 'Google forces uploads from unaudited YouTube API projects to Private. Complete the YouTube API compliance audit before relying on automatic Unlisted uploads.',
  };
};

export const createYouTubeAuthorizationUrl = async (returnPath = '/admin') => {
  const config = requireConfig();
  const state = crypto.randomBytes(32).toString('base64url');
  await YouTubeConnection.findOneAndUpdate(
    { key: CONNECTION_KEY },
    {
      $set: {
        oauthStateHash: hash(state),
        oauthStateExpiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
        oauthReturnPath: sanitizeReturnPath(returnPath),
      },
      $setOnInsert: { key: CONNECTION_KEY },
    },
    { upsert: true, new: true }
  );

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', `${YOUTUBE_UPLOAD_SCOPE} ${YOUTUBE_READ_SCOPE}`);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
};

export const completeYouTubeAuthorization = async ({ code, state }) => {
  const config = requireConfig();
  const connection = await YouTubeConnection.findOneAndUpdate(
    {
      key: CONNECTION_KEY,
      oauthStateHash: hash(state),
      oauthStateExpiresAt: { $gt: new Date() },
    },
    {
      $set: { oauthStateHash: '', oauthStateExpiresAt: null },
    },
    { new: true }
  );
  if (!connection) {
    const error = new Error('YouTube authorization expired or could not be verified. Start the connection again.');
    error.status = 400;
    throw error;
  }

  const tokenData = await requestGoogleToken({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });
  const refreshToken = tokenData.refresh_token || decryptRefreshToken(connection, config.encryptionSecret);
  const channel = await fetchConnectedChannel(tokenData.access_token);
  const encrypted = encryptRefreshToken(refreshToken, config.encryptionSecret);

  connection.channelId = channel.channelId;
  connection.channelTitle = channel.channelTitle;
  connection.scopes = trim(tokenData.scope).split(/\s+/).filter(Boolean);
  connection.connectedAt = new Date();
  Object.assign(connection, encrypted);
  await connection.save();

  return {
    returnPath: sanitizeReturnPath(connection.oauthReturnPath),
    ...channel,
  };
};

export const disconnectYouTubeChannel = async () => {
  const connection = await YouTubeConnection.findOne({ key: CONNECTION_KEY });
  const config = getConfig();
  if (connection?.tokenCiphertext && config.encryptionSecret) {
    try {
      const refreshToken = decryptRefreshToken(connection, config.encryptionSecret);
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: refreshToken }),
      });
    } catch {
      // Local removal still prevents this site from using the channel.
    }
  }
  await YouTubeConnection.deleteOne({ key: CONNECTION_KEY });
};

export const createYouTubeResumableUpload = async ({ title, description, mimeType, fileSize }) => {
  requireConfig();
  const connection = await YouTubeConnection.findOne({ key: CONNECTION_KEY });
  if (!connection?.channelId) {
    const error = new Error('Connect a YouTube channel before uploading lesson videos.');
    error.status = 409;
    throw error;
  }

  const normalizedTitle = trim(title).slice(0, 100);
  const normalizedDescription = trim(description).slice(0, 5000);
  const normalizedMimeType = trim(mimeType) || 'application/octet-stream';
  const normalizedFileSize = Number(fileSize);
  if (!normalizedTitle) {
    const error = new Error('Enter a YouTube video title.');
    error.status = 400;
    throw error;
  }
  if (!Number.isFinite(normalizedFileSize) || normalizedFileSize <= 0) {
    const error = new Error('A valid video file size is required.');
    error.status = 400;
    throw error;
  }
  if (!normalizedMimeType.startsWith('video/')) {
    const error = new Error('Only video files can be uploaded to YouTube.');
    error.status = 400;
    throw error;
  }

  const accessToken = await getAccessToken(connection);
  const endpoint = new URL(YOUTUBE_UPLOAD_URL);
  endpoint.searchParams.set('uploadType', 'resumable');
  endpoint.searchParams.set('part', 'snippet,status');
  endpoint.searchParams.set('notifySubscribers', 'false');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(Math.floor(normalizedFileSize)),
      'X-Upload-Content-Type': normalizedMimeType,
    },
    body: JSON.stringify({
      snippet: {
        title: normalizedTitle,
        description: normalizedDescription,
        categoryId: '27',
      },
      status: {
        privacyStatus: 'unlisted',
        embeddable: true,
        selfDeclaredMadeForKids: false,
      },
    }),
  });
  const responseBody = await response.text();
  if (!response.ok) {
    let message = responseBody;
    try { message = JSON.parse(responseBody)?.error?.message || responseBody; } catch { /* keep text */ }
    const error = new Error(message || 'YouTube could not create the upload session');
    error.status = response.status;
    throw error;
  }

  const uploadUrl = response.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube did not return a resumable upload URL');

  return {
    uploadUrl,
    accessToken,
    channelId: connection.channelId,
    channelTitle: connection.channelTitle,
    requestedPrivacy: 'unlisted',
  };
};
