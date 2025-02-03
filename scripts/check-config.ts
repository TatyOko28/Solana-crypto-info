// scripts/check-config.ts
import fs from 'fs/promises';
import path from 'path';

interface ConfigFile {
  path: string;
  content: string;
  removeConflicts?: string[];
}

const CONFIG_FILES: ConfigFile[] = [
  {
    path: 'package.json',
    content: `{
  "name": "solana-token-info",
  "version": "1.0.0",
  "description": "Solana Token and Raydium Pool Information CLI Tool",
  "main": "dist/index.js",
  "scripts": {
    "clean": "rimraf dist",
    "prebuild": "npm run clean",
    "build": "tsc",
    "pretest": "npm run clean",
    "test": "jest --config jest.config.ts",
    "test:watch": "jest --config jest.config.ts --watch",
    "test:coverage": "jest --config jest.config.ts --coverage",
    "start": "ts-node src/index.ts",
    "dev": "ts-node src/index.ts",
    "lint": "eslint src/**/*.ts",
    "pretest:safe": "ts-node scripts/check-config.ts",
    "test:safe": "npm run pretest:safe && jest --config jest.config.ts"
  },
  "keywords": ["solana", "blockchain", "tokens", "raydium"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@project-serum/borsh": "^0.2.5",
    "@solana/spl-token": "^0.3.9",
    "@solana/web3.js": "^1.87.0",
    "commander": "^11.0.0",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^18.15.11",
    "@typescript-eslint/eslint-plugin": "^5.57.1",
    "@typescript-eslint/parser": "^5.57.1",
    "eslint": "^8.37.0",
    "jest": "^29.5.0",
    "prettier": "^2.8.7",
    "rimraf": "^5.0.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.1",
    "typescript": "^5.0.3"
  }
}`
  },
  {
    path: 'tsconfig.json',
    content: `{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "**/*.test.ts"],
  "ts-node": {
    "compilerOptions": {
      "module": "commonjs"
    }
  }
}`
  },
  {
    path: 'jest.config.ts',
    content: `export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 30000
};`,
    removeConflicts: ['jest.config.js']
  }
];

async function checkAndRestoreConfig(): Promise<void> {
  console.log('Checking configuration files...');
  
  const backupDir = path.join(__dirname, '../config-backup');
  
  try {
    await fs.mkdir(backupDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create backup directory:', error);
    process.exit(1);
  }

  // First, remove any conflicting files
  for (const config of CONFIG_FILES) {
    if (config.removeConflicts) {
      for (const conflictFile of config.removeConflicts) {
        const conflictPath = path.join(__dirname, '..', conflictFile);
        try {
          await fs.unlink(conflictPath);
          console.log(`Removed conflicting file: ${conflictFile}`);
        } catch (error) {
          // Ignore errors if file doesn't exist
        }
      }
    }
  }

  for (const config of CONFIG_FILES) {
    const filePath = path.join(__dirname, '..', config.path);
    const backupPath = path.join(backupDir, config.path);

    try {
      // Check if file exists
      try {
        await fs.access(filePath);
        
        // Create backup if it doesn't exist
        try {
          await fs.access(backupPath);
        } catch {
          await fs.writeFile(backupPath, config.content);
          console.log(`Created backup for ${config.path}`);
        }
      } catch {
        // File doesn't exist, restore from backup or create new
        console.log(`${config.path} not found, restoring...`);
        await fs.writeFile(filePath, config.content);
        console.log(`Restored ${config.path}`);
      }
    } catch (error) {
      console.error(`Error handling ${config.path}:`, error);
      process.exit(1);
    }
  }

  console.log('Configuration check completed successfully');
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkAndRestoreConfig().catch(error => {
    console.error('Configuration check failed:', error);
    process.exit(1);
  });
}

export { checkAndRestoreConfig };
