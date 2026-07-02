import React from 'react';
import { Building2 } from 'lucide-react';
import { AssetCategoryMapPage } from '../components/AssetCategoryMapPage';

export const GedungPage: React.FC = () => (
  <AssetCategoryMapPage
    title="Gedung"
    subtitle="Peta Interaktif Gedung Universitas Udayana"
    icon={Building2}
  />
);
