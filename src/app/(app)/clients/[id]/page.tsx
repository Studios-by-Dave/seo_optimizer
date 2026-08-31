import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id } = await params;
  if (!user?.organizationId) notFound();
  const client = await prisma.client.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { projects: { orderBy: { createdAt: "desc" } } },
  });
  if (!client) notFound();
  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">{client.name}</h1><p className="mt-1 text-sm text-slate-500">{client.projects.length} project{client.projects.length !== 1 ? "s" : ""}</p></div>
        <Link href="/clients" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← Back to Clients</Link>
      </div>
      {client.projects.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No projects for this client yet.</p><Link href="/projects/new" className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Create Project</Link></div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {client.projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md">
              <h3 className="font-semibold text-slate-900">{p.name}</h3>
              <p className="mt-1 truncate text-sm text-slate-500">{p.websiteUrl}</p>
              <p className="mt-2 text-xs text-slate-400">{p.domain} · {p.industry || "—"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
