import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  profileUrl?: string;
  result?: {
    runId: string;
    datasetId: string;
    items: any[];
    itemsCount: number;
  };
}

export function TestApifyButton() {
  const [loading, setLoading] = useState(false);
  const [profileUrl, setProfileUrl] = useState('https://www.instagram.com/instagram/');
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-apify-instagram`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ profileUrl }),
        }
      );

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast.success('Teste do Apify concluído com sucesso!');
      } else {
        toast.error(data.error || 'Erro no teste do Apify');
      }
    } catch (error) {
      console.error('Test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setResult({ success: false, error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-muted-foreground/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Teste Apify Instagram Scraper
        </CardTitle>
        <CardDescription>
          Teste a integração com a API do Apify para scraping de perfis do Instagram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="profileUrl">URL do Perfil Instagram</Label>
          <Input
            id="profileUrl"
            placeholder="https://www.instagram.com/username/"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button 
          onClick={handleTest} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executando teste... (pode levar até 2min)
            </>
          ) : (
            <>
              <TestTube className="mr-2 h-4 w-4" />
              Executar Teste
            </>
          )}
        </Button>

        {result && (
          <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {result.success ? 'Sucesso!' : 'Erro'}
              </span>
            </div>

            {result.error && (
              <p className="text-sm text-red-400">{result.error}</p>
            )}

            {result.result && (
              <div className="mt-2 space-y-2 text-sm">
                <p><strong>Run ID:</strong> {result.result.runId}</p>
                <p><strong>Dataset ID:</strong> {result.result.datasetId}</p>
                <p><strong>Items encontrados:</strong> {result.result.itemsCount}</p>
                
                {result.result.items.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Ver dados brutos (JSON)
                    </summary>
                    <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(result.result.items, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
