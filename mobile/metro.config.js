const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");
const config = getDefaultConfig(__dirname);
// This repository uses independent packages, with shared source outside mobile/.
config.watchFolders = [
  path.resolve(__dirname, "../shared"),
  path.resolve(__dirname, "../node_modules"),
];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../node_modules"),
];
config.resolver.disableHierarchicalLookup = false;
module.exports = config;
