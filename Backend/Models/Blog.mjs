import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  slug:      { type: String, unique: true, sparse: true },
  content:   { type: String, default: '' },
  excerpt:   { type: String, default: '' },
  coverImage:{ type: String, default: '' },
  videoUrl:  { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video', 'both'], default: 'image' },
  tags:      [{ type: String }],
  published: { type: Boolean, default: false },
}, { timestamps: true });

blogSchema.pre('save', function () {
  if (!this.slug) {
    this.slug = this.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
  }
});

export default mongoose.model('Blog', blogSchema);
