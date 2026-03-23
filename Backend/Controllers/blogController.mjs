import Blog from '../Models/Blog.mjs';

const convertDrive = (url) => {
  if (!url) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return url;
};

export const getPublicPosts = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { published: true };
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
    res.json(await Blog.find(query).sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getPublicPost = async (req, res) => {
  try {
    const post = await Blog.findOne({ _id: req.params.id, published: true });
    if (!post) return res.status(404).json({ message: 'Not found' });
    res.json(post);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const getAllPosts = async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? { title: { $regex: search, $options: 'i' } } : {};
    res.json(await Blog.find(query).sort({ createdAt: -1 }));
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const createPost = async (req, res) => {
  try {
    const body = { ...req.body, coverImage: convertDrive(req.body.coverImage) };
    res.status(201).json(await Blog.create(body));
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const updatePost = async (req, res) => {
  try {
    const body = { ...req.body, coverImage: convertDrive(req.body.coverImage) };
    const post = await Blog.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!post) return res.status(404).json({ message: 'Not found' });
    res.json(post);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

export const deletePost = async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

export const togglePublish = async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });
    post.published = !post.published;
    await post.save();
    res.json(post);
  } catch { res.status(500).json({ message: 'Server error' }); }
};
