import type { RepoSummary } from "@/lib/types";

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  language: string | null;
  updated_at: string;
  default_branch: string;
  html_url: string;
};

export async function POST(request: Request) {
  try {
    const { token } = (await request.json()) as { token?: string };

    if (!token) {
      return Response.json({ error: "GitHub token is required." }, { status: 400 });
    }

    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return Response.json(
        { error: `GitHub returned ${response.status}. Check token scopes.` },
        { status: response.status },
      );
    }

    const repos = (await response.json()) as GitHubRepo[];
    const payload: RepoSummary[] = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      language: repo.language,
      updatedAt: repo.updated_at,
      defaultBranch: repo.default_branch,
      htmlUrl: repo.html_url,
    }));

    return Response.json({ repos: payload });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load GitHub repositories.";
    return Response.json({ error: message }, { status: 500 });
  }
}
