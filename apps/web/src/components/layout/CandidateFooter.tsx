import { useCompany } from '@/hooks/useCompany';

export default function CandidateFooter() {
  const { data: company } = useCompany();
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 text-center text-xs text-muted-foreground md:px-8">
        © {new Date().getFullYear()} {company?.name ?? 'HireFlow'} · Vận hành bởi HireFlow
      </div>
    </footer>
  );
}
