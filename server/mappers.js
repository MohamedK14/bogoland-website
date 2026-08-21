// Converts a Postgres row (snake_case) into the same camelCase shape the
// frontend already expects from products.json — so js/main.js needs no
// changes once it points at this API instead of the static file.
function rowToProduct(row){
  const images = row.images || [];
  return {
    id: row.id,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    category: row.category,
    price: row.price,
    image: images[0] || '',
    hoverImage: images[1] || images[0] || '',
    images,
    descriptionFr: row.description_fr,
    descriptionEn: row.description_en,
    dateAdded: row.date_added instanceof Date
      ? row.date_added.toISOString().split('T')[0]
      : row.date_added,
    inStock: row.in_stock,
    clickCount: row.click_count,
  };
}

function rowToCategory(row){
  return {
    id: row.id,
    slug: row.slug,
    nameFr: row.name_fr,
    nameEn: row.name_en,
    image: row.image,
    available: row.available,
  };
}

// Never include password_hash here — this is what gets sent to the browser.
function rowToCustomer(row){
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
  };
}

module.exports = { rowToProduct, rowToCategory, rowToCustomer };
