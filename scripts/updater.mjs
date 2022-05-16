/* eslint-disable no-restricted-syntax, no-await-in-loop, import/no-extraneous-dependencies */

import fetch from 'node-fetch';
import { getOctokit, context } from '@actions/github';

const UPDATE_FILE_NAME = 'update.json';

const updateData = {
  name: '',
  pub_date: new Date().toISOString(),
  platforms: {
    win64: { signature: '', url: '' },
    linux: { signature: '', url: '' },
    darwin: { signature: '', url: '' },
    'linux-x86_64': { signature: '', url: '' },
    'windows-x86_64': { signature: '', url: '' },
  },
};

const octokit = getOctokit(process.env.GITHUB_TOKEN);
const options = { owner: context.repo.owner, repo: context.repo.repo };

const { data: release } = await octokit.rest.repos.getLatestRelease(options);
updateData.name = release.tag_name;

async function getSignature(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  return response.text();
}

for (const { name, browser_download_url } of release.assets) {
  if (name.endsWith('.msi.zip')) {
    updateData.platforms.win64.url = browser_download_url;
    updateData.platforms['windows-x86_64'].url = browser_download_url;
  } else if (name.endsWith('.msi.zip.sig')) {
    const signature = await getSignature(browser_download_url);

    updateData.platforms.win64.signature = signature;
    updateData.platforms['windows-x86_64'].signature = signature;
  } else if (name.endsWith('.app.tar.gz')) {
    updateData.platforms.darwin.url = browser_download_url;
  } else if (name.endsWith('.app.tar.gz.sig')) {
    const signature = await getSignature(browser_download_url);

    updateData.platforms.darwin.signature = signature;
  } else if (name.endsWith('.AppImage.tar.gz')) {
    updateData.platforms.linux.url = browser_download_url;
    updateData.platforms['linux-x86_64'].url = browser_download_url;
  } else if (name.endsWith('.AppImage.tar.gz.sig')) {
    const signature = await getSignature(browser_download_url);

    updateData.platforms.linux.signature = signature;
    updateData.platforms['linux-x86_64'].signature = signature;
  }
}

const updateFile = release.assets.find((asset) => asset.name === UPDATE_FILE_NAME);
if (updateFile) {
  await octokit.rest.repos.deleteReleaseAsset({ ...options, asset_id: updateFile.id });
}

await octokit.rest.repos.uploadReleaseAsset({
  ...options,
  release_id: release.id,
  name: UPDATE_FILE_NAME,
  data: JSON.stringify(updateData),
});
