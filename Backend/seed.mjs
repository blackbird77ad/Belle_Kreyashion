import 'dotenv/config';
import connectDB from './config/db.mjs';
import Product from './Models/Product.mjs';
import DeliveryZone from './Models/DeliveryZone.mjs';
import Consultation from './Models/Consultation.mjs';
import Training from './Models/Training.mjs';

await connectDB();

const toSlug = (name) => name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') + '-' + Date.now() + Math.random().toString(36).slice(2,6);

// ─── DELIVERY ZONES ───────────────────────────────────────────────────
const zoneCount = await DeliveryZone.countDocuments();
if (zoneCount === 0) {
  await DeliveryZone.insertMany([
    { name: 'Pickup — Osu, Accra (Free)',                        fee: 0   },
    { name: 'Greater Accra — Osu, Labone, Cantonments, Ridge',  fee: 30  },
    { name: 'Greater Accra — Tema, Teshie, Nungua',             fee: 40  },
    { name: 'Greater Accra — Kasoa, Weija, Pokuase',            fee: 50  },
    { name: 'Other Regions — Kumasi, Cape Coast, Takoradi',     fee: 80  },
    { name: 'Remote — Volta, Northern, Upper Regions',          fee: 120 },
  ]);
  console.log('✅ Delivery zones seeded');
} else { console.log(`⏭️  Delivery zones skipped (${zoneCount} exist)`); }

// ─── CONSULTATIONS ────────────────────────────────────────────────────
const consultCount = await Consultation.countDocuments();
if (consultCount === 0) {
  await Consultation.insertMany([
    { title: 'Hair Care Consultation',              desc: 'Get personalised advice on the best products and routines for your hair type. Ideal for anyone struggling with hair growth, breakage or product selection.',             price: 50,  duration: '30 minutes', validity: 'Valid for 7 days after booking',  isFree: false, active: true },
    { title: 'Hair Business Consultation',          desc: 'Start or grow your hair business with expert guidance on sourcing, pricing, marketing and managing clients.',                                                            price: 150, duration: '1 hour',      validity: 'Valid for 14 days after booking', isFree: false, active: true },
    { title: 'Styling & Installation Consultation', desc: 'Learn the right techniques for installing wigs, braids or extensions. Great for beginners or those upgrading their skills.',                                           price: 80,  duration: '45 minutes', validity: 'Valid for 7 days after booking',  isFree: false, active: true },
  ]);
  console.log('✅ Consultations seeded');
} else { console.log(`⏭️  Consultations skipped (${consultCount} exist)`); }

// ─── TRAINING ─────────────────────────────────────────────────────────
const trainCount = await Training.countDocuments();
if (trainCount === 0) {
  await Training.insertMany([
    { title: 'Wig Making & Installation Masterclass', desc: 'Learn everything from measuring and constructing a wig cap to installing and styling. Perfect for beginners.',                                                    date: 'To be announced — WhatsApp to enquire', venue: 'Accra, Ghana (venue shared upon registration)', price: 500, active: true },
    { title: 'Hair Business Bootcamp',                desc: 'A practical full-day session covering sourcing, pricing, social media marketing and customer management for your hair business.',                                 date: 'To be announced — WhatsApp to enquire', venue: 'Accra, Ghana',                                  price: 800, active: true },
  ]);
  console.log('✅ Training seeded');
} else { console.log(`⏭️  Training skipped (${trainCount} exist)`); }

// ─── PRODUCTS ─────────────────────────────────────────────────────────
const prodCount = await Product.countDocuments();
if (prodCount === 0) {
  const productDocs = [
    { name: 'Wavy curls',                          category: 'Hair Extensions',      desc: 'Easy to wear wet wavy curls',                                                                                                      images: [],                                                                                           retailPrice: 1500, isPreOrder: true,  preOrderType: 'full', available: true, featured: true,  fastSelling: false, stock: null },
    { name: 'Bouncy wig',                          category: 'Wigs',                 desc: '',                                                                                                                                  images: [],                                                                                           retailPrice: 800,  wholesaleMinQty: 3, isPreOrder: true, preOrderType: 'full', available: true, featured: true, fastSelling: false, stock: null },
    { name: "bone straight 30''",                  category: 'Wigs',                 desc: 'Beauty....',                                                                                                                        images: [],                                                                                           retailPrice: 2,    wholesaleMinQty: 8, isPreOrder: false, available: true, featured: false, fastSelling: true, stock: 0 },
    { name: 'Brazilian Body Wave Bundle',          category: 'Hair Extensions',      desc: 'Premium Brazilian body wave hair bundle. Natural look and feel, minimal shedding, can be coloured.',                              images: ['/shop-category/straight-remy-hair-bundle-hair.avif'],                                       retailPrice: 280,  wholesalePrice: 220, wholesaleMinQty: 5,  stock: 20, available: true, featured: true,  fastSelling: true  },
    { name: 'Kinky Jerry Curl Bundle',             category: 'Hair Extensions',      desc: 'Textured kinky Jerry curl hair bundle. Perfect for natural hair lovers.',                                                          images: ['/shop-category/natural-jerry-curls-hair.avif'],                                             retailPrice: 260,  wholesalePrice: 200, wholesaleMinQty: 5,  stock: 15, available: true                                         },
    { name: 'Ponytail Extension',                  category: 'Hair Extensions',      desc: 'Sleek and silky ponytail extension. Easy clip-in for instant length and volume.',                                                  images: ['/shop-category/ponytail-extension.avif'],                                                   retailPrice: 180,  stock: 30, available: true, fastSelling: true  },
    { name: 'Kinky Straight Extension',           category: 'Hair Extensions',      desc: 'Natural kinky straight texture. Blends perfectly with relaxed or texlaxed hair.',                                                 images: ['/shop-category/kinkhy-extension.jpg'],                                                      retailPrice: 220,  stock: 25, available: true  },
    { name: 'Edge Control Extension',             category: 'Hair Extensions',      desc: 'Fine edge hair extension for hairline filling and edge laying.',                                                                   images: ['/shop-category/edges-extension.jpg'],                                                       retailPrice: 120,  stock: 40, available: true  },
    { name: 'Body Wave Blonde Wig',                category: 'Wigs',                 desc: 'Gorgeous blonde body wave lace wig. HD lace, pre-plucked, baby hair included.',                                                   images: ['/shop-category/blonde-body-wave-wig.avif'],                                                 retailPrice: 650,  wholesalePrice: 520, wholesaleMinQty: 2,  stock: 10, available: true, featured: true  },
    { name: 'Dark Auburn Body Wave Wig',           category: 'Wigs',                 desc: 'Rich dark auburn body wave wig. Lace front, natural hairline, glueless option available.',                                        images: ['/shop-category/dark-auburn-body-wave-wig.avif'],                                            retailPrice: 580,  stock: 8,  available: true  },
    { name: 'Bob Wig',                             category: 'Wigs',                 desc: 'Chic and versatile bob wig. Perfect for a quick, polished look.',                                                                 images: ['/shop-category/bob-wig.jpg'],                                                               retailPrice: 420,  stock: 12, available: true, fastSelling: true  },
    { name: 'Pixie Cut Wig',                       category: 'Wigs',                 desc: 'Bold and edgy pixie cut wig. Great for confident, statement-making looks.',                                                       images: ['/shop-category/pixie-wig.avif'],                                                            retailPrice: 350,  stock: 6,  available: true  },
    { name: 'Sleek Straight Wig',                  category: 'Wigs',                 desc: 'Ultra-sleek straight wig. Silky smooth finish with natural shine.',                                                               images: ['/shop-category/sllek-wig.jpg'],                                                             retailPrice: 480,  stock: 14, available: true  },
    { name: 'Blunt Fling Wig',                     category: 'Wigs',                 desc: 'Trendy blunt cut wig with a fun fling finish. Bold and playful.',                                                                 images: ['/shop-category/blunt-fling-wig.jpg'],                                                       retailPrice: 390,  stock: 9,  available: true  },
    { name: 'Lace Closure Wig',                    category: 'Wigs',                 desc: 'Premium lace closure wig. Natural part, seamless blend, comfortable wear.',                                                      images: ['/shop-category/lace closure wig.avif'],                                                     retailPrice: 520,  stock: 11, available: true  },
    { name: 'ANUA Heartleaf Pore Cleansing Foam',  category: 'Beauty & Skincare',    desc: 'Gentle pore-cleansing foam with heartleaf extract. Soothes sensitive skin, reduces redness.',                                   images: ['/shop-category/ANUA Heartleaf Quercetinol Pore Deep Cleansing Foam- beauty.webp'],          retailPrice: 95,   stock: 50, available: true, featured: true, fastSelling: true },
    { name: 'ANUA Beauty Skincare Set',            category: 'Beauty & Skincare',    desc: 'Curated ANUA skincare set. Cleanser, toner and serum for a complete routine.',                                                   images: ['/shop-category/anua-beauty.jpg'],                                                           retailPrice: 280,  stock: 20, available: true  },
    { name: 'CeraVe Hydrating Cleanser',           category: 'Beauty & Skincare',    desc: 'Gentle non-foaming cleanser by CeraVe. Maintains skin barrier, suitable for all skin types.',                                  images: ['/shop-category/cerave-cleanser-beauty.webp'],                                               retailPrice: 110,  stock: 35, available: true  },
    { name: 'Face Scrub',                          category: 'Beauty & Skincare',    desc: 'Exfoliating face scrub. Removes dead skin cells for a smooth, glowing complexion.',                                             images: ['/shop-category/face-scrub-beauty.jpg'],                                                     retailPrice: 75,   stock: 40, available: true  },
    { name: 'The Ordinary Skincare',               category: 'Beauty & Skincare',    desc: 'The Ordinary targeted skincare solutions. Science-backed formulations at affordable prices.',                                   images: ['/shop-category/the-ordinary-beauty.webp'],                                                  retailPrice: 85,   stock: 45, available: true  },
    { name: 'Lashes',                              category: 'Beauty & Skincare',    desc: 'Premium false lashes. Natural to dramatic styles available.',                                                                    images: ['/shop-category/lashes-beauty.jpg'],                                                         retailPrice: 35,   wholesalePrice: 25, wholesaleMinQty: 10, stock: 100, available: true, fastSelling: true },
    { name: 'Lip Scrub',                           category: 'Health & Wellness',    desc: 'Nourishing lip scrub. Removes dry skin for soft, smooth lips.',                                                                  images: ['/shop-category/lip-scrub.jpg'],                                                             retailPrice: 45,   stock: 60, available: true  },
    { name: 'Professional Styling Brush',          category: 'Braiding & Tools',     desc: 'Professional-grade styling brush. Detangles without breakage, suitable for all hair types.',                                    images: ['/shop-category/proffessional-brush.jpg'],                                                   retailPrice: 55,   wholesalePrice: 40, wholesaleMinQty: 5,  stock: 80, available: true  },
    { name: 'Wide Tooth Comb',                     category: 'Braiding & Tools',     desc: 'Wide tooth comb for detangling thick, curly or natural hair without breakage.',                                                  images: ['/shop-category/comb-tool.png'],                                                             retailPrice: 25,   wholesalePrice: 18, wholesaleMinQty: 10, stock: 120, available: true, fastSelling: true },
    { name: 'Hair Straightener',                   category: 'Braiding & Tools',     desc: 'Professional ceramic flat iron. Even heat distribution, adjustable temperature.',                                               images: ['/shop-category/hair-straigthener-tool.jpg'],                                                retailPrice: 180,  stock: 25, available: true  },
    { name: 'Kinky Hair Straightener Tool',        category: 'Braiding & Tools',     desc: 'Specialised straightener for kinky and coily hair types. Gentle on natural hair.',                                              images: ['/shop-category/kinky-straightener-tool.jpg'],                                               retailPrice: 200,  stock: 15, available: true  },
    { name: 'Mannequin Head',                      category: 'Mannequins & Stands',  desc: 'Professional mannequin head for practising braiding, styling and installation.',                                                images: ['/shop-category/mannequin.avif'],                                                            retailPrice: 120,  wholesalePrice: 95,  wholesaleMinQty: 3, stock: 30, available: true, featured: true  },
    { name: 'Mannequin Clamps & Holder',           category: 'Mannequins & Stands',  desc: 'Heavy-duty table clamp and holder for mannequin heads. Sturdy and adjustable.',                                                 images: ['/shop-category/mannequin-clamps.avif'],                                                     retailPrice: 80,   wholesalePrice: 60,  wholesaleMinQty: 5, stock: 40, available: true  },
    { name: 'Bridal Robe',                         category: 'Fashion',              desc: 'Elegant satin bridal robe. Perfect for wedding prep photos and bridal parties.',                                                 images: ['/shop-category/bridal-robe-fashion.avif'],                                                  retailPrice: 150,  wholesalePrice: 110, wholesaleMinQty: 3, stock: 20, available: true  },
    { name: 'Makeup Bag',                          category: 'Fashion',              desc: 'Stylish and spacious makeup bag. Multiple compartments for all your beauty essentials.',                                          images: ['/shop-category/makeup-bad-fashion.avif'],                                                   retailPrice: 65,   stock: 50, available: true, fastSelling: true },
  ];
  await Product.insertMany(productDocs.map(p => ({ ...p, slug: toSlug(p.name) })));
  console.log('✅ Products seeded');
} else { console.log(`⏭️  Products skipped (${prodCount} exist)`); }

console.log('\n✅ Seed complete');
process.exit(0);
