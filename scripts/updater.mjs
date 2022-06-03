/* eslint-disable import/no-extraneous-dependencies */
import fetch from 'node-fetch';
import { getOctokit, context } from '@actions/github';

const UPDATE_FILE_NAME = 'update.json';
const IS_DEV = !process.env.GITHUB_TOKEN;
const DUMMY_OCTOKIT = {
  rest: {
    repos: {
      async getLatestRelease() {
        const release = await fetch(
          'https://api.github.com/repos/Daniel-Knights/note-boi/releases/67116532'
        ).then((res) => res.json());

        return { data: release };
      },
      deleteReleaseAsset: console.log,
      uploadReleaseAsset: console.log,
    },
  },
};

const updateData = {
  name: '',
  pub_date: new Date().toISOString(),
  platforms: {
    windows: {},
    darwin: {},
    linux: {},
    'windows-x86_64': {},
    'darwin-x86_64': {},
    'linux-x86_64': {},
  },
};

const octokit = IS_DEV ? DUMMY_OCTOKIT : getOctokit(process.env.GITHUB_TOKEN);
const options = IS_DEV || {
  owner: context.repo.owner,
  repo: context.repo.repo,
};

const { data: release } = await octokit.rest.repos.getLatestRelease(options);
updateData.name = release.tag_name;

async function getSignature(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  return response.text();
}

async function setPlatformData(platform, name, url) {
  if (name.endsWith('.sig')) {
    const signature = await getSignature(url);

    updateData.platforms[platform].signature = signature;
    updateData.platforms[`${platform}-x86_64`].signature = signature;
  } else {
    updateData.platforms[platform].url = url;
    updateData.platforms[`${platform}-x86_64`].url = url;
  }
}

const platformPromises = [];
const platformRegex = [
  ['windows', /\.msi\.zip(?:\.sig)?/],
  ['darwin', /\.app\.tar\.gz(?:\.sig)?/],
  ['linux', /\.AppImage\.tar\.gz(?:\.sig)?/],
];

release.assets.forEach((asset) => {
  platformRegex.forEach(([platform, regex]) => {
    if (!regex.test(asset.name)) return;

    platformPromises.push(
      setPlatformData(platform, asset.name, asset.browser_download_url)
    );
  });
});

await Promise.all(platformPromises);

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
