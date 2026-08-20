// Utility: generates the bcrypt hash to put in ADMIN_PASSWORD_HASH.
// Usage: node hash-password.js "your-chosen-password"
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if(!password){
  console.error('Usage: node hash-password.js "your-chosen-password"');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('\nPut this in your .env as ADMIN_PASSWORD_HASH:\n');
  console.log(hash);
  console.log('\n(the plain password itself never needs to be stored anywhere)\n');
});
