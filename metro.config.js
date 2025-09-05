const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Prevent Prisma from being bundled into native apps; it's server-only.
config.resolver = {
	...(config.resolver || {}),
	extraNodeModules: {
		...((config.resolver && config.resolver.extraNodeModules) || {}),
		'@prisma/client': path.resolve(__dirname, 'stubs/prisma-client-stub.js'),
		'.prisma/client': path.resolve(__dirname, 'stubs/prisma-client-stub.js'),
	},
};

module.exports = withNativeWind(config, { input: './global.css' });
