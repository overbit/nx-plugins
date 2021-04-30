import {
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { detectPackageManager } from '@nrwl/tao/src/shared/package-manager';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import * as path from 'path';
import { dependencies, devDependencies } from '../../utils/dependencies';
import { getPackageManagerInstall } from '../../utils/get-package-manager-install';
import { getPackageManagerLockFile } from '../../utils/get-package-manager-lock-file';
import { RepositoryGeneratorSchema } from './schema';

export default async function (host: Tree, options: RepositoryGeneratorSchema) {
  addFiles(host, options);
  updateGitignore(host);
  updatePackageJson(host);

  const installTask = updateDependencies(host);

  if (!options.skipFormat) {
    await formatFiles(host);
  }

  return runTasksInSerial(installTask);
}

function addFiles(host: Tree, options: RepositoryGeneratorSchema) {
  const packageManager = detectPackageManager();
  const installCommand = getPackageManagerInstall(packageManager);
  const lockFileName = getPackageManagerLockFile(packageManager);

  const templateOptions = {
    ...options,
    installCommand,
    lockFileName,
    tmpl: '',
    'ext.ext': '',
  };

  generateFiles(host, path.join(__dirname, 'files'), './', templateOptions);
}

function updateGitignore(host: Tree) {
  let ignore = '';

  if (host.exists('.gitignore')) {
    ignore = host.read('.gitignore').toString();
  }

  if (!ignore.includes('# Tools compiled output')) {
    ignore = ignore.concat('\n# Tools compiled output\n/tools/**/*.js\n');
    host.write('.gitignore', ignore);
  }
}

function updatePackageJson(host: Tree) {
  updateJson(host, 'package.json', (json) => {
    json.version = '0.0.0-development';
    json.scripts = {
      script: 'node tools/src/scripts',
      ...(json.scripts || {}),
      commit: 'git-cz',
      tools: 'tsc --project tools/src/tsconfig.json',
      postinstall: 'npm run tools',
      prepare: 'husky install',
      'semantic-release': 'semantic-release',
    };
    json.config = {
      commitizen: {
        path: 'cz-conventional-changelog',
      },
    };
    json.commitlint = {
      extends: ['@commitlint/config-conventional'],
    };

    return json;
  });
}

function updateDependencies(host: Tree) {
  return addDependenciesToPackageJson(
    host,
    {
      lodash: dependencies.lodash,
      yargs: dependencies.yargs,
    },
    {
      '@actions/core': devDependencies['@actions/core'],
      '@actions/github': devDependencies['@actions/github'],
      '@types/lodash': devDependencies['@types/lodash'],
      '@types/yargs': devDependencies['@types/yargs'],
      '@commitlint/cli': devDependencies['@commitlint/cli'],
      '@commitlint/config-conventional': devDependencies['@commitlint/config-conventional'],
      commitizen: devDependencies['commitizen'],
      'cz-conventional-changelog': devDependencies['cz-conventional-changelog'],
      husky: devDependencies['husky'],
      'lint-staged': devDependencies['lint-staged'],
      'semantic-release': devDependencies['semantic-release'],
    },
  );
}
