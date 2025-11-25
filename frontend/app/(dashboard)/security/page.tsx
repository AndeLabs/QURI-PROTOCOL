'use client';

import { DeadManSwitchPanel } from '@/components/deadman/DeadManSwitchPanel';
import { EncryptedMetadataPanel } from '@/components/encryption/EncryptedMetadataPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-museum-black mb-2">
            Security Center
          </h1>
          <p className="text-museum-dark-gray text-lg max-w-2xl">
            Manage your asset security and privacy settings. QURI Protocol provides
            advanced cryptographic tools to protect your Runes and ensure their legacy.
          </p>
        </div>
      </div>

      {/* Security Overview / Health Status (Placeholder for future expansion) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <Card className="bg-gradient-to-br from-museum-white to-museum-cream border-gold-200">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-museum-gray uppercase tracking-wider">
                  Security Status
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-2xl font-bold text-museum-black">Active</span>
               </div>
               <p className="text-xs text-museum-gray mt-1">All systems operational</p>
            </CardContent>
         </Card>
         <Card className="bg-gradient-to-br from-museum-white to-museum-cream border-gold-200">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-museum-gray uppercase tracking-wider">
                  Encryption Standard
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-600" />
                  <span className="text-2xl font-bold text-museum-black">IBE / vetKeys</span>
               </div>
               <p className="text-xs text-museum-gray mt-1">Identity-Based Encryption enabled</p>
            </CardContent>
         </Card>
          <Card className="bg-gradient-to-br from-museum-white to-museum-cream border-gold-200">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium text-museum-gray uppercase tracking-wider">
                  Inheritance Protocol
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-gold-600" />
                  <span className="text-2xl font-bold text-museum-black">Manual Check-in</span>
               </div>
               <p className="text-xs text-museum-gray mt-1">Requires periodic activity</p>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column: Inheritance (Dead Man's Switch) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-gold-100 rounded-lg">
              <Shield className="w-6 h-6 text-gold-600" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-museum-black">Inheritance Protocol</h2>
              <p className="text-sm text-museum-dark-gray">Dead Man's Switch automated transfer</p>
            </div>
          </div>
          
          <Card className="border-t-4 border-t-gold-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
             <CardContent className="pt-6">
               <DeadManSwitchPanel />
             </CardContent>
          </Card>
        </div>

        {/* Right Column: Privacy (vetKeys) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-museum-black">Private Metadata</h2>
              <p className="text-sm text-museum-dark-gray">Encrypted storage & time-locked reveals</p>
            </div>
          </div>

          <Card className="border-t-4 border-t-purple-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardContent className="pt-6">
              <EncryptedMetadataPanel />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-12 text-center text-sm text-museum-gray border-t border-museum-light-gray pt-8">
         <p>Security protocols are executed directly on the Internet Computer Protocol (ICP) using Chain-Key Cryptography.</p>
         <p>Private keys never leave the secure multi-party computation environment.</p>
      </div>
    </div>
  );
}
