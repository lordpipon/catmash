import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";

const NEXT_PORT = 3001;
const NEXT_TARGET = `http://127.0.0.1:${NEXT_PORT}`;

const wsUrl = new URL(process.env.WS_SERVER_URL || "http://127.0.0.1:8080");
const wsHost = wsUrl.hostname === "localhost" ? "127.0.0.1" : wsUrl.hostname;
const wsPort = Number(wsUrl.port || "80");

const innerAgent = new http.Agent({ keepAlive: true });

const server = http.createServer((req, res) => {
	const upstream = http.request(
		{
			host: "127.0.0.1",
			port: NEXT_PORT,
			path: req.url,
			method: req.method,
			headers: {
				...req.headers,
				"x-forwarded-proto": "https",
				connection: req.headers.upgrade ? "upgrade" : req.headers.connection,
			},
			agent: innerAgent,
		},
		(upstreamRes) => {
			res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
			upstreamRes.pipe(res);
		}
	);
	upstream.on("error", () => {
		if (!res.headersSent) res.writeHead(502);
		res.end();
	});
	req.on("error", () => upstream.destroy());
	req.pipe(upstream);
});

server.on("upgrade", (req, socket, head) => {
	const target = net.connect({ host: wsHost, port: wsPort }, () => {
		const headerLines = [];
		for (let i = 0; i < req.rawHeaders.length; i += 2) {
			headerLines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
		}
		const rawRequest =
			`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
			headerLines.join("\r\n") +
			"\r\n\r\n";
		target.write(rawRequest + head);
		socket.pipe(target);
		target.pipe(socket);
	});
	target.on("error", () => socket.destroy());
	socket.on("error", () => target.destroy());
});

server.on("clientError", (err, socket) => {
	if (socket.writable) {
		socket.end(
			"HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n"
		);
	}
});

const child = spawn("node", ["server.js"], {
	env: { ...process.env, PORT: String(NEXT_PORT), HOSTNAME: "127.0.0.1" },
	stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 1));

function waitForNext() {
	const probe = http.get(NEXT_TARGET, (res) => {
		res.resume();
		server.listen(3000, "0.0.0.0");
	});
	probe.on("error", () => setTimeout(waitForNext, 300));
}

waitForNext();