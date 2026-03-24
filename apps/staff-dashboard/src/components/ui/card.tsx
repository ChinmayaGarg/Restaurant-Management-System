import { cn } from "@/lib/cn";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-2xl bg-white p-6 shadow", className)}>
      {children}
    </div>
  );
}

type CardHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function CardHeader({
  title,
  description,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        ) : null}
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}

type CardContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("mt-4", className)}>{children}</div>;
}
