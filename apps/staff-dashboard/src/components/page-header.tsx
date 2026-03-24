import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {action}
        <Link href={backHref}>
          <Button variant="outline">{backLabel}</Button>
        </Link>
      </div>
    </Card>
  );
}
