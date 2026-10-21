const releaseConfig = {
  plugins: [
    // The default angular preset cannot parse the Conventional Commits "!" marker,
    // so a "feat!:" squash subject silently produces no release instead of a major.
    ["@semantic-release/commit-analyzer", { preset: "conventionalcommits" }],
    ["@semantic-release/release-notes-generator", { preset: "conventionalcommits" }],
    // The release job publishes the tarball this plugin packs before the tag is pushed,
    // so the integrity it records is of bytes it built, not of what the registry serves.
    ["@semantic-release/npm", { npmPublish: false, tarballDir: "release-tarball" }],
    "@j4k/semantic-release-forgejo",
  ],
};

export default releaseConfig;
