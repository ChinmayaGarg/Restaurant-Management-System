import Link from "next/link";

type PageHeaderProps = {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
  action,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        {action}
        <Link href={backHref} className="rounded-xl border px-4 py-2">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
