import net from 'net';
import os from 'os';

/**
 * Check if a port is free
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export async function isPortFree(port) {
	try {
		await new Promise((resolve, reject) => {
			const server = net.createServer();
			server.unref();
			server.on('error', reject);
			server.listen({ port }, () => {
				server.close(resolve);
			});
		});
		return true;
	} catch (err) {
		if (err.code !== 'EADDRINUSE') throw err;
		return false;
	}
}

/**
 * Check if the requested port is free and increase port number
 * sequentially until we find a free port.
 * @param {number|string} port The suggested port to listen on
 * @returns {Promise<number>} The next free port
 */
export async function getFreePort(port) {
	let found = false;
	let attempts = 0;

	if (typeof port === 'string') port = parseInt(port, 10);

	// Limit to 20 attempts for now
	while (!found && attempts <= 20) {
		if (isPortFree(port)) break;

		port++;
		attempts++;
	}

	return port;
}

/**
 * Check if the user specified port is available and
 * throw if it is taken. If the user didn't specify
 * a port we'll try to find a free one
 * @param {{port?: number | string}} options
 */
export async function getPort(options) {
	// Account for `port = 0`
	const userPort = typeof options.port === 'number' ? options.port : process.env.PORT;
	if (userPort !== undefined) {
		if (await isPortFree(+userPort)) {
			return +userPort;
		}

		throw new Error(`Another process is already running on port ${userPort}. Please choose a different port.`);
	}

	return await getFreePort(8080);
}

/**
 * Display local and network origins for a server's address.
 * @param {net.AddressInfo|string} addr
 * @param {{ https?: boolean, host: string }} options
 * @returns {string[]}
 */
export function getServerAddresses(addr, { host, https }) {
	if (typeof addr === 'string') {
		return [addr];
	}

	const protocol = https ? 'https:' : 'http:';
	const port = addr.port;

	if (host !== '0.0.0.0') {
		// Use the explicit value the user gave us
		return [`${protocol}//${host}:${port}`];
	}

	// If the user binds to all interfaces via `0.0.0.0`, we'll
	// query network interfaces to get addresses from.

	// Get network address
	const ifaces = os.networkInterfaces();

	// Print `0.0.0.0` as `localhost` as the former isn't
	// accessible.
	const addresses = [`${protocol}//localhost:${port}`];
	for (const name in ifaces) {
		for (const iface of ifaces[name]) {
			const { family, address, internal } = iface;
			if (family === 'IPv4' && address !== host && !internal) {
				addresses.push(`${protocol}//${address}:${port}`);
			}
		}
	}

	return addresses;
}

/**
 * Check if the current running node version supports adding search
 * parameters to dynamic import specifiers. The minimum required
 * version for this is 12.19.0
 */
const nodeSemver = process.versions.node.split('.');
export const supportsSearchParams = +nodeSemver[0] > 12 || (+nodeSemver[0] === 12 && +nodeSemver[1] >= 19);

/**
 * Add a timestamp search parameter to an URL. This is usually done
 * for cache busting.
 * @param {string} url
 * @param {number} time
 * @returns {string}
 */
export const addTimestamp = (url, time) => url + (/\?/.test(url) ? '&' : '?') + 't=' + time;
