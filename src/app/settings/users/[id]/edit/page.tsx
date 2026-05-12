import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DbUnavailable } from "@/components/DbUnavailable";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { canAccessSetting } from "@/lib/settings-access";
import { getDbErrorMessage } from "@/lib/db-error";
import { EditUserForm } from "./EditUserForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditUserPage(props: Props) {
  if (!(await canAccessSetting("manage.users"))) {
    redirect("/settings");
  }

  const { id } = await props.params;

  let user: {
    id: string;
    username: string;
    nik: string;
    fullname: string;
    position: string;
  } | null = null;
  let dbError: string | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nik: true,
        fullname: true,
        position: true,
      },
    });
  } catch (e) {
    dbError = getDbErrorMessage(e) ?? "Gagal memuat data user.";
  }

  if (!dbError && !user) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Edit User"
        description="Perbarui data dasar user. Role & izin diatur lewat tombol Role di daftar user."
        action={
          <Link
            href="/settings/users"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Kembali ke daftar user
          </Link>
        }
      />

      {dbError ? <DbUnavailable message={dbError} /> : null}

      {!dbError && user ? (
        <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <EditUserForm user={user} />
        </section>
      ) : null}
    </>
  );
}
