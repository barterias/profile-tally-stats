import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Construction } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function AdminPayoutsContent() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/15">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestão de Saques</h1>
            <p className="text-sm text-muted-foreground">
              Gerenciamento de solicitações de saque
            </p>
          </div>
        </div>

        {/* Coming Soon */}
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Construction className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Em Desenvolvimento</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              O sistema financeiro de saques está sendo desenvolvido. 
              Esta funcionalidade estará disponível em breve.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Tabelas necessárias: payout_requests, user_wallets
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function AdminPayouts() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminPayoutsContent />
    </ProtectedRoute>
  );
}
