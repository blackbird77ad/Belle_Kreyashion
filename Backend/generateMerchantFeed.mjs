import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import connectDB from './config/db.mjs';
import Product from './Models/Product.mjs';
import { buildGoogleMerchantFeedXml, isMerchantFeedEligible } from './Utils/googleMerchantFeed.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_FEED_PATH = path.resolve(__dirname, '../Frontend/public/google-merchant-feed.xml');

const generateMerchantFeed = async () => {
  await connectDB();

  const products = await Product.find({
    available: true,
    isDigital: { $ne: true },
    'images.0': { $exists: true },
  })
    .select('name slug desc category images retailPrice stock discount isPreOrder partnerBrand available isDigital isPartner featured')
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const eligibleProducts = products.filter(isMerchantFeedEligible);
  const xml = buildGoogleMerchantFeedXml(eligibleProducts);

  await fs.mkdir(path.dirname(FRONTEND_FEED_PATH), { recursive: true });
  await fs.writeFile(FRONTEND_FEED_PATH, xml, 'utf8');
  await mongoose.disconnect();

  console.log(`Merchant feed updated at ${FRONTEND_FEED_PATH}`);
  console.log(`Included ${eligibleProducts.length} physical product feed item${eligibleProducts.length === 1 ? '' : 's'}.`);
};

generateMerchantFeed().catch(async (error) => {
  console.error('Failed to generate merchant feed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors during shutdown
  }
  process.exitCode = 1;
});
