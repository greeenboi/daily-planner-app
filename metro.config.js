const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Prevent server-only / native binary db libs from entering client bundle.
config.resolver = {
	...(config.resolver || {}),
	extraNodeModules: {
		...((config.resolver && config.resolver.extraNodeModules) || {}),
		'@prisma/client': path.resolve(__dirname, 'stubs/prisma-client-stub.js'),
		'.prisma/client': path.resolve(__dirname, 'stubs/prisma-client-stub.js'),
		// Stubs for libsql + adapter (server-only)
		'@prisma/adapter-libsql': path.resolve(__dirname, 'stubs/server-only-stub.js'),
		'@libsql/client': path.resolve(__dirname, 'stubs/server-only-stub.js'),
		'@libsql/linux-x64-gnu': path.resolve(__dirname, 'stubs/server-only-stub.js'),
		'@libsql/win32-x64-msvc': path.resolve(__dirname, 'stubs/server-only-stub.js'),
		'@libsql/darwin-arm64': path.resolve(__dirname, 'stubs/server-only-stub.js'),
		'@libsql/darwin-x64': path.resolve(__dirname, 'stubs/server-only-stub.js'),
	},
};

module.exports = withNativeWind(config, { input: './global.css' });
