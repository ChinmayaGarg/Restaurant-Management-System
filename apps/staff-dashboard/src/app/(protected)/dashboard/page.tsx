import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Restaurant operations overview and quick navigation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Link href="/tables" className="rounded-2xl bg-white p-5 shadow block">
          <h2 className="font-semibold">Tables</h2>
          <p className="mt-2 text-sm text-gray-600">
            View tables and manage sessions.
          </p>
        </Link>

        <Link href="/orders" className="rounded-2xl bg-white p-5 shadow block">
          <h2 className="font-semibold">Orders</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create and manage orders.
          </p>
        </Link>

        <Link
          href="/service-requests"
          className="rounded-2xl bg-white p-5 shadow block"
        >
          <h2 className="font-semibold">Service Requests</h2>
          <p className="mt-2 text-sm text-gray-600">
            Manage table-side requests.
          </p>
        </Link>

        <Link href="/billing" className="rounded-2xl bg-white p-5 shadow block">
          <h2 className="font-semibold">Billing</h2>
          <p className="mt-2 text-sm text-gray-600">
            Generate bills and record payments.
          </p>
        </Link>

        <Link
          href="/notifications"
          className="rounded-2xl bg-white p-5 shadow block"
        >
          <h2 className="font-semibold">Notifications</h2>
          <p className="mt-2 text-sm text-gray-600">
            View alerts and live workflow events.
          </p>
        </Link>

        <Link href="/kitchen" className="rounded-2xl bg-white p-5 shadow block">
          <h2 className="font-semibold">Kitchen</h2>
          <p className="mt-2 text-sm text-gray-600">
            Manage the kitchen queue.
          </p>
        </Link>
      </div>
    </div>
  );
}
