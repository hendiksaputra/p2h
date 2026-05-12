import { LoginForm } from "./LoginForm";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage(props: Props) {
  const sp = await props.searchParams;
  const nextRaw = sp.next?.trim() ?? "";
  const nextPath =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <h1 className="flex flex-col items-center gap-2 text-center text-xl font-semibold tracking-tight text-slate-900">
          <span>P2H</span>
          <span className="rounded-lg bg-orange-500 px-4 py-1 text-white">ARKA</span>
        </h1>
        <div className="mt-6">
          <LoginForm nextPath={nextPath} />
        </div>
      </div>
    </div>
  );
}
