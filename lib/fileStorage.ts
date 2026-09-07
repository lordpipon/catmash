import { randomUUID } from "crypto";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const STORAGE_PATH = process.env.MEDIA_STORAGE_PATH
	? path.resolve(process.env.MEDIA_STORAGE_PATH)
	: path.resolve(process.cwd(), "data");

function getPublicBaseUrl(): string {
	const url = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
	return url.replace(/\/+$/, "");
}

function encodePath(fileName: string): string {
	return fileName
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

function resolveStoragePath(fileName: string): string {
	const cleaned = fileName.replace(/\\/g, "/").replace(/^\/+/, "");
	const resolved = path.resolve(STORAGE_PATH, cleaned);
	if (resolved !== STORAGE_PATH && !resolved.startsWith(STORAGE_PATH + path.sep)) {
		throw new Error("Invalid file name");
	}
	return resolved;
}

export interface StoredFile {
	fileId: string;
	fileName: string;
	url: string;
	contentType: string;
	contentLength: number;
}

export interface DeleteResult {
	fileName: string;
	fileId: string;
	success: boolean;
	error?: string;
}

export async function ensureStorageReady(): Promise<void> {
	await fs.mkdir(STORAGE_PATH, { recursive: true });
}

export async function uploadFile(
	buffer: Buffer,
	fileName: string,
	contentType: string,
	onProgress?: (progress: number) => void
): Promise<StoredFile> {
	await ensureStorageReady();

	const filePath = resolveStoragePath(fileName);
	fsSync.mkdirSync(path.dirname(filePath), { recursive: true });

	const tmpPath = `${filePath}.${randomUUID()}.tmp`;
	await fs.writeFile(tmpPath, buffer);
	await fs.rename(tmpPath, filePath);

	if (onProgress) {
		onProgress(100);
	}

	const fileId = randomUUID();
	const url = `${getPublicBaseUrl()}/api/media/${encodePath(fileName)}`;

	return {
		fileId,
		fileName,
		url,
		contentType,
		contentLength: buffer.length,
	};
}

export async function downloadFile(fileName: string): Promise<Buffer> {
	const filePath = resolveStoragePath(fileName);
	return fs.readFile(filePath);
}

export async function fileExists(fileName: string): Promise<boolean> {
	try {
		const filePath = resolveStoragePath(fileName);
		fsSync.accessSync(filePath, fsSync.constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

export async function deleteFile(fileName: string, _fileId?: string): Promise<void> {
	const filePath = resolveStoragePath(fileName);
	try {
		await fs.unlink(filePath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
			throw error;
		}
	}
}

export async function deleteFiles(files: Array<{ fileName: string; fileId: string }>): Promise<DeleteResult[]> {
	const results: DeleteResult[] = [];

	for (const file of files) {
		try {
			await deleteFile(file.fileName, file.fileId);
			results.push({
				fileName: file.fileName,
				fileId: file.fileId,
				success: true,
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`Error deleting file ${file.fileName}:`, errorMessage);
			results.push({
				fileName: file.fileName,
				fileId: file.fileId,
				success: false,
				error: errorMessage,
			});
		}
	}

	return results;
}

export function getDownloadUrl(fileName: string): string {
	return `${getPublicBaseUrl()}/api/media/${encodePath(fileName)}`;
}

async function walk(dir: string, base: string, matches: string[]): Promise<void> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const absolute = path.join(dir, entry.name);
		const relative = path.relative(base, absolute).split(path.sep).join("/");
		if (entry.isDirectory()) {
			await walk(absolute, base, matches);
		} else if (entry.isFile()) {
			matches.push(relative);
		}
	}
}

export async function listFiles(fileNamePrefix: string): Promise<Array<{ fileId: string; fileName: string }>> {
	await ensureStorageReady();

	try {
		const matches: string[] = [];
		await walk(STORAGE_PATH, STORAGE_PATH, matches);

		return matches
			.filter((file) => file.startsWith(fileNamePrefix))
			.map((file) => ({ fileId: file, fileName: file }));
	} catch (error) {
		console.error("Error listing files:", error);
		return [];
	}
}

export async function deleteFileByName(fileName: string): Promise<{ deletedCount: number; results: DeleteResult[] }> {
	const files = await listFiles(fileName);
	const filesToDelete = files.filter((file) => file.fileName === fileName);
	const results = await deleteFiles(filesToDelete);
	const deletedCount = results.filter((r) => r.success).length;
	return { deletedCount, results };
}