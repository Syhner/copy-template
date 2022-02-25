#!/usr/bin/env node

const util = require('util');
const { exec } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { createSpinner } = require('nanospinner');

const makeInquiries = async () => {
  const { repoName } = await inquirer.prompt({
    name: 'repoName',
    type: 'input',
    message:
      'Choose a directory name to hold the template (defaults to current working directory)',
    default() {
      return '.';
    },
  });

  const templates = await fs.readdir(path.resolve(__dirname, '../templates'));
  const { template } = await inquirer.prompt({
    name: 'template',
    type: 'list',
    message: 'Choose a template:',
    choices: templates,
  });

  const { installDeps } = await inquirer.prompt({
    name: 'installDeps',
    type: 'confirm',
    message: 'Do you want to install dependencies for the app?',
    default() {
      return false;
    },
  });

  return { repoName, template, installDeps };
};

const copyDir = async (src, dest) => {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    entry.isDirectory()
      ? await copyDir(srcPath, destPath)
      : await fs.copyFile(srcPath, destPath);
  }
};

process.on('uncaughtException', e => {
  console.error(chalk.red('ERROR!'));
  console.error(chalk.red(e));
  console.error(chalk.red('Exiting with error'));
  process.exit(1);
});

const main = async () => {
  // Ask setup questions
  const { repoName, template, installDeps } = await makeInquiries();
  console.log(template);

  // Define template and copy paths
  const templatePath = path.resolve(__dirname, `../templates/${template}`);
  const copyPath = path.resolve(process.cwd(), repoName);

  // Copy template
  const copySpinner = createSpinner('Copying template...').start();
  try {
    await copyDir(templatePath, copyPath);

    // Update package.json name key
    const package = require(`../templates/${template}/package.json`);
    package.name = repoName === '.' ? template : repoName;
    await fs.writeFile(
      `${copyPath}/package.json`,
      JSON.stringify(package, null, 2)
    );

    copySpinner.success({ text: 'Template copied' });
  } catch (e) {
    copySpinner.error({ text: 'Failed to copy templates' });
    throw e;
  }

  // Optionally install dependencies
  if (installDeps) {
    const execPromise = util.promisify(exec);
    const installSpinner = createSpinner(
      'Installing dependencies (this might take a few minutes)...'
    ).start();
    try {
      await execPromise(`cd ${repoName} && npm install`, { stdio: 'inherit' });
      installSpinner.success({ text: 'Dependencies installed' });
    } catch (e) {
      installSpinner.error({ text: 'Failed to install dependencies' });
      throw e;
    }
  }

  console.log(chalk.green(`Success! Copied template to ${copyPath}`), '\n');
  console.log('You can begin by typing:');
  console.log(chalk.blue('cd'), repoName, chalk.blue('&& npm start'));
  return 0;
};

main();
