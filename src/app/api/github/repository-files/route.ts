import {
  filterSourceFiles,
  isLikelyText,
  isSecurityRelevantPath,
} from "@/lib/file-filter";
import type { SourceFile } from "@/lib/types";

type TreeItem = {
  path: string;
  type: "blob" | "tree";
  url: string;
  size?: number;
};

type BlobResponse = {
  content: string;
  encoding: string;
};

function decodeBase64(content: string) {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
}

const MAX_DOWNLOAD_BYTES = 1_500_000;
const MAX_GITHUB_FILES = 100;

export async function POST(request: Request) {
  try {
    const { token, fullName, branch } = (await request.json()) as {
      token?: string;
      fullName?: string;
      branch?: string;
    };

    if (!token || !fullName || !branch) {
      return Response.json(
        { error: "token, fullName, and branch are required." },
        { status: 400 },
      );
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const treeResponse = await fetch(
      `https://api.github.com/repos/${fullName}/git/trees/${encodeURIComponent(
        branch,
      )}?recursive=1`,
      { headers, cache: "no-store" },
    );

    if (!treeResponse.ok) {
      return Response.json(
        { error: `GitHub tree request returned ${treeResponse.status}.` },
        { status: treeResponse.status },
      );
    }

    const treePayload = (await treeResponse.json()) as {
      tree?: TreeItem[];
      truncated?: boolean;
    };
    const candidates = (treePayload.tree ?? [])
      .filter(
        (item) =>
          item.type === "blob" &&
          isSecurityRelevantPath(item.path) &&
          (item.size ?? 0) <= MAX_DOWNLOAD_BYTES,
      )
      .slice(0, MAX_GITHUB_FILES);

    const files = await Promise.all(
      candidates.map(async (item): Promise<SourceFile | null> => {
        const blobResponse = await fetch(item.url, { headers, cache: "no-store" });
        if (!blobResponse.ok) return null;
        const blob = (await blobResponse.json()) as BlobResponse;
        if (blob.encoding !== "base64") return null;
        const content = decodeBase64(blob.content);
        if (!isLikelyText(content)) return null;
        return {
          path: item.path,
          content,
        };
      }),
    );

    return Response.json({
      repoName: fullName,
      files: filterSourceFiles(files.filter(Boolean) as SourceFile[]),
      truncated: Boolean(treePayload.truncated),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to collect repository files.";
    return Response.json({ error: message }, { status: 500 });
  }
}
