import mongoose from 'mongoose';

const youtubeConnectionSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'primary' },
  channelId: { type: String, default: '' },
  channelTitle: { type: String, default: '' },
  tokenCiphertext: { type: String, default: '' },
  tokenIv: { type: String, default: '' },
  tokenAuthTag: { type: String, default: '' },
  scopes: { type: [String], default: [] },
  connectedAt: { type: Date, default: null },
  oauthStateHash: { type: String, default: '' },
  oauthStateExpiresAt: { type: Date, default: null },
  oauthReturnPath: { type: String, default: '/admin' },
}, { timestamps: true });

export default mongoose.model('YouTubeConnection', youtubeConnectionSchema);
