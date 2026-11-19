import { Button } from '@/components/ui/button';
export default function QueryError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <p>{message}</p>
      <Button className="mt-3" variant="outline" onClick={retry}>
        Thử lại
      </Button>
    </div>
  );
}
