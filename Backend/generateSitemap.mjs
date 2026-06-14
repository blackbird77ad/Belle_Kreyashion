import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import connectDB from './config/db.mjs';
import Product from './Models/Product.mjs';
import Blog from './Models/Blog.mjs';
import Training from './Models/Training.mjs';
import Consultation from './Models/Consultation.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_SITEMAP_PATH = path.resolve(__dirname, '../Frontend/public/sitemap.xml');
const SITE_URL = (process.env.SITE_URL || 'https://bellekreyashon.com').replace(/\/+$/, '');

const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/shop', changefreq: 'daily', priority: '0.95' },
  { path: '/digital-products', changefreq: 'daily', priority: '0.95' },
  { path: '/services', changefreq: 'weekly', priority: '0.90' },
  { path: '/blog', changefreq: 'weekly', priority: '0.85' },
  { path: '/about', changefreq: 'monthly', priority: '0.70' },
  { path: '/contact', changefreq: 'monthly', priority: '0.70' },
];

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const toAbsoluteUrl = (value = '/') => `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;

const toLastmod = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

const buildUrlNode = ({ path: entryPath, lastmod, changefreq, priority }) => `  <url>
    <loc>${escapeXml(toAbsoluteUrl(entryPath))}</loc>
    <lastmod>${toLastmod(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

const createSitemap = async () => {
  await connectDB();

  const [products, posts, trainings, consultations] = await Promise.all([
    Product.find({ available: true }).select('slug isDigital updatedAt').lean(),
    Blog.find({ published: true }).select('slug updatedAt').lean(),
    Training.find({ active: true }).select('slug updatedAt').lean(),
    Consultation.find({ active: true }).select('slug updatedAt').lean(),
  ]);

  const dynamicProductPages = products.map((product) => ({
    path: `${product.isDigital ? '/digital-products' : '/shop'}/${product.slug || product._id}`,
    lastmod: product.updatedAt,
    changefreq: 'weekly',
    priority: '0.80',
  }));

  const dynamicBlogPages = posts.map((post) => ({
    path: `/blog/${post.slug || post._id}`,
    lastmod: post.updatedAt,
    changefreq: 'monthly',
    priority: '0.75',
  }));

  const dynamicTrainingPages = trainings.map((training) => ({
    path: `/services/training/${training.slug || training._id}`,
    lastmod: training.updatedAt,
    changefreq: 'weekly',
    priority: '0.80',
  }));

  const dynamicConsultationPages = consultations.map((consultation) => ({
    path: `/services/consultation/${consultation.slug || consultation._id}`,
    lastmod: consultation.updatedAt,
    changefreq: 'monthly',
    priority: '0.80',
  }));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...STATIC_PAGES.map((page) => buildUrlNode({ ...page, lastmod: new Date() })),
    ...dynamicProductPages.map(buildUrlNode),
    ...dynamicTrainingPages.map(buildUrlNode),
    ...dynamicConsultationPages.map(buildUrlNode),
    ...dynamicBlogPages.map(buildUrlNode),
    '</urlset>',
    '',
  ].join('\n');

  await fs.writeFile(FRONTEND_SITEMAP_PATH, xml, 'utf8');
  await mongoose.disconnect();

  console.log(`Sitemap updated at ${FRONTEND_SITEMAP_PATH}`);
  console.log(`Included ${STATIC_PAGES.length} static pages, ${dynamicProductPages.length} product pages, ${dynamicTrainingPages.length} training pages, ${dynamicConsultationPages.length} consultation pages, and ${dynamicBlogPages.length} blog pages.`);
};

createSitemap().catch(async (error) => {
  console.error('Failed to generate sitemap:', error.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
