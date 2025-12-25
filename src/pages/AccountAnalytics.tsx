import { useState } from 'react';
import { BarChart3, Instagram, Youtube, Music2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MainLayout from '@/components/Layout/MainLayout';
import { InstagramTab } from '@/components/AccountAnalytics/InstagramTab';
import { YouTubeTab } from '@/components/AccountAnalytics/YouTubeTab';
import { TikTokTab } from '@/components/AccountAnalytics/TikTokTab';
import { BatchSyncButton } from '@/components/Admin/BatchSyncButton';

export type PlatformType = 'instagram' | 'youtube' | 'tiktok';

export default function AccountAnalytics() {
  const [activeTab, setActiveTab] = useState<PlatformType>('instagram');

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-7 w-7" />
              Account Analytics
            </h1>
            <p className="text-muted-foreground">
              Monitore métricas de todas as suas contas de redes sociais
            </p>
          </div>
          <BatchSyncButton />
        </div>

        {/* Platform Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PlatformType)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
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
        </Tabs>
      </div>
    </MainLayout>
  );
}
