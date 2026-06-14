const { existsSync } = require('node:fs');
const path = require('node:path');

const rootEnvProdPath = path.resolve(__dirname, '../../../.env.prod');

if (existsSync(rootEnvProdPath)) {
  require('dotenv').config({ path: rootEnvProdPath });
}
