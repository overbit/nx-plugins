import { Config } from '@jest/types';
import { ExecutorContext, logger } from '@nrwl/devkit';
import { jestConfigParser } from '@nrwl/jest/src/executors/jest/jest.impl';
import { runCLI } from 'jest';
import { startDevServer } from './lib/start-dev-server';
import { JestPlaywrightExecutorSchema } from './schema';

try {
  require('dotenv').config();
  // eslint-disable-next-line no-empty
} catch (e) {}

export default async function jestPlaywrightExecutor(
  options: JestPlaywrightExecutorSchema,
  context: ExecutorContext,
) {
  const jestParsedConfig = jestConfigParser(options, context);
  const jestFileConfig = require(options.jestConfig);
  const watch = options.watch || options.watchAll;

  let success;
  for await (const baseUrl of startDevServer(options, context)) {
    try {
      success = runJest(baseUrl, options, jestParsedConfig, jestFileConfig);
      if (!watch) break;
    } catch (e) {
      logger.error(e.message);
      success = false;
      if (!watch) break;
    }
  }

  return { success };
}

async function runJest(
  baseUrl: string,
  options: JestPlaywrightExecutorSchema,
  parsedConfig: Config.Argv,
  fileConfig: Config.Argv,
) {
  const { slowMo, devtools, headless, browsers, timeout } = options;
  const { testEnvironmentOptions = {} } = fileConfig;
  const jestPlaywrightOptions = testEnvironmentOptions['jest-playwright'] || {};
  const jestPlaywrightLaunchOptions = jestPlaywrightOptions.launchOptions || {};

  const config = {
    ...parsedConfig,
    testEnvironmentOptions: {
      ...(testEnvironmentOptions as Record<string, unknown>),
      'jest-playwright': {
        browsers: browsers ?? jestPlaywrightOptions.browsers,
        launchOptions: {
          ...jestPlaywrightLaunchOptions,
          headless: devtools ? false : headless ?? jestPlaywrightLaunchOptions.headless,
          devtools: devtools ?? jestPlaywrightLaunchOptions.devtools,
          slowMo: slowMo ?? jestPlaywrightLaunchOptions.slowMo,
          timeout: timeout ?? jestPlaywrightLaunchOptions.timeout,
          baseUrl,
        },
      },
    },
  };

  const { results } = await runCLI(config, [options.jestConfig]);

  return results.success;
}