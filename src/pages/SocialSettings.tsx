import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save,
  Clock,
  Bell,
  Mail,
  Globe,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardSettings, useUpdateSettings } from '@/hooks/useSocialMedia';
import { toast } from 'sonner';

const SYNC_FREQUENCIES = [
  { value: '1', label: 'A cada 1 hora' },
  { value: '3', label: 'A cada 3 horas' },
  { value: '6', label: 'A cada 6 horas (Recomendado)' },
  { value: '12', label: 'A cada 12 horas' },
  { value: '24', label: 'Uma vez por dia' },
];

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'Nova York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tóquio (GMT+9)' },
];

export default function SocialSettings() {
  const { data: settings, isLoading } = useDashboardSettings();
  const updateMutation = useUpdateSettings();

  const [localSettings, setLocalSettings] = useState({
    sync_frequency_hours: 6,
    notifications_enabled: true,
    email_alerts: false,
    timezone: 'America/Sao_Paulo',
  });

  // Update local state when settings load
  useState(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  });

  const handleSave = () => {
    toast.success('Configurações salvas! (Configure seu backend Python para aplicar)');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background gradient-bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background gradient-bg-dark">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/social">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Configurações
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Personalize seu dashboard
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-2 premium-gradient text-primary-foreground"
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>

        <div className="space-y-6">
          {/* Sync Settings */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Sincronização
              </CardTitle>
              <CardDescription>
                Configure a frequência de atualização dos dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sync-frequency">Frequência de Sincronização</Label>
                <Select
                  value={localSettings.sync_frequency_hours.toString()}
                  onValueChange={(value) => 
                    setLocalSettings(prev => ({ 
                      ...prev, 
                      sync_frequency_hours: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger id="sync-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYNC_FREQUENCIES.map(freq => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Defina com que frequência o sistema buscará novos dados das APIs
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Fuso Horário</Label>
                <Select
                  value={localSettings.timezone}
                  onValueChange={(value) => 
                    setLocalSettings(prev => ({ ...prev, timezone: value }))
                  }
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificações
              </CardTitle>
              <CardDescription>
                Gerencie como você recebe atualizações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="notifications" className="font-medium">
                    Notificações no App
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receba alertas sobre milestones e atualizações importantes
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={localSettings.notifications_enabled}
                  onCheckedChange={(checked) => 
                    setLocalSettings(prev => ({ ...prev, notifications_enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="email-alerts" className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Alertas por Email
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receba resumos e alertas importantes por email
                  </p>
                </div>
                <Switch
                  id="email-alerts"
                  checked={localSettings.email_alerts}
                  onCheckedChange={(checked) => 
                    setLocalSettings(prev => ({ ...prev, email_alerts: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Info */}
          <Card className="glass-card border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Segurança e Privacidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                • Todos os tokens de acesso são criptografados com AES-256
              </p>
              <p>
                • Nunca armazenamos suas senhas das redes sociais
              </p>
              <p>
                • Você pode desconectar qualquer conta a qualquer momento
              </p>
              <p>
                • Os dados são transmitidos via HTTPS
              </p>
            </CardContent>
          </Card>

          {/* API Configuration Info */}
          <Card className="glass-card border-warning/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-warning">
                <Globe className="h-5 w-5" />
                Configuração do Backend
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Para que o dashboard funcione completamente, configure a variável de ambiente:
              </p>
              <code className="block bg-muted/50 p-2 rounded text-primary text-xs">
                VITE_SOCIAL_API_URL=https://sua-api.com/api/v1
              </code>
              <p className="mt-2">
                O backend Python (FastAPI) deve implementar os endpoints para OAuth,
                coleta de métricas e sincronização automática.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
