// One-time script: loads ../products.json into the Neon products table.
// Run after schema.sql has been applied: npm run seed
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function seed(){
  const products = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'products.json'), 'utf8'));

  for(const p of products){
    await pool.query(
      `INSERT INTO products (name_fr, name_en, category, price, images, description_fr, description_en, date_added, in_stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        p.nameFr,
        p.nameEn,
        p.category,
        p.price,
        p.images || [p.image, p.hoverImage].filter(Boolean),
        p.descriptionFr || '',
        p.descriptionEn || '',
        p.dateAdded || new Date().toISOString().split('T')[0],
        p.inStock !== false,
      ]
    );
    console.log(`Inserted: ${p.nameFr}`);
  }

  console.log('Seed complete.');
  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
