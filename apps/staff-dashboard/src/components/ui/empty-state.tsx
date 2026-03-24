type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
