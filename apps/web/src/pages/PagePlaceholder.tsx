import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PagePlaceholder({ title }: { title: string }) {
  return (
    <main className="container flex min-h-screen items-center justify-center py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Tính năng đang được phát triển.</p>
        </CardContent>
      </Card>
    </main>
  );
}
