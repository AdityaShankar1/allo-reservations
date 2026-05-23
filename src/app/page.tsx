import { ProductCatalog } from "@/components/product-catalog";
import { Boxes } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-full bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Allo Warehouse
            </h1>
            <p className="text-sm text-muted-foreground">
              Reserve inventory during checkout — holds expire in 10 minutes
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ProductCatalog />
      </main>
    </div>
  );
}
