import { ReservationDetail } from "@/components/reservation-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReservationPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="min-h-full bg-background px-4 py-8 sm:px-6">
      <ReservationDetail id={id} />
    </div>
  );
}
