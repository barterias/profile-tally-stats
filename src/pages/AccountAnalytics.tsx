import { useState, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Instagram, Youtube, Music2, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/Layout/MainLayout';
import ClientLayout from '@/components/Layout/ClientLayout';
import { InstagramTab } from '@/components/AccountAnalytics/InstagramTab';
import { YouTubeTab } from '@/components/AccountAnalytics/YouTubeTab';
import { TikTokTab } from '@/components/AccountAnalytics/TikTokTab';
import { KwaiTab } from '@/components/AccountAnalytics/KwaiTab';
import { useRealtimeAccounts } from '@/hooks/useRealtimeAccounts';
import { useUserRole } from '@/hooks/useUserRole';
import { useClientCampaignUserIds } from '@/hooks/useClientCampaignUserIds';

export type PlatformType = 'instagram' | 'youtube' | 'tiktok' | 'kwai';

// Context to pass allowed user IDs to tab components
export const ClientFilterContext = createContext<string[] | null>(null);
export const useClientFilter = () => useContext(ClientFilterContext);

export default function AccountAnalytics() {
  const [activeTab, setActiveTab] = useState<PlatformType>('instagram');
  const { isClient } = useUserRole();
  const navigate = useNavigate();
  
  // For clients, fetch the user IDs who submitted videos to their campaigns
  const { data: clientUserIds } = useClientCampaignUserIds();

  useRealtimeAccounts();

  const Layout = isClient ? ClientLayout : MainLayout;

  return (
    <Layout>
      <ClientFilterContext.Provider value={isClient ? (clientUserIds || []) : null}>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {isClient && (
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/client")}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-7 w-7" />
                  Account Analytics
                </h1>
                <p className="text-muted-foreground">
                  Monitore métricas de todas as suas contas de redes sociais
                </p>
              </div>
            </div>
          </div>

          {/* Platform Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PlatformType)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-lg">
              <TabsTrigger value="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </TabsTrigger>
              <TabsTrigger value="youtube" className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="tiktok" className="flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                TikTok
              </TabsTrigger>
              <TabsTrigger value="kwai" className="flex items-center gap-2">
                <span className="text-xs font-bold">K</span>
                Kwai
              </TabsTrigger>
            </TabsList>

            <TabsContent value="instagram" className="mt-6">
              <InstagramTab />
            </TabsContent>

            <TabsContent value="youtube" className="mt-6">
              <YouTubeTab />
            </TabsContent>

            <TabsContent value="tiktok" className="mt-6">
              <TikTokTab />
            </TabsContent>

            <TabsContent value="kwai" className="mt-6">
              <KwaiTab />
            </TabsContent>
          </Tabs>
        </div>
      </ClientFilterContext.Provider>
    </Layout>
  );
}
