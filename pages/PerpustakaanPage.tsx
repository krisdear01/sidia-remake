import React from 'react';
import { BookOpen } from 'lucide-react';
import { AssetCategoryMapPage } from '../components/AssetCategoryMapPage';
import { matchesPerpus } from '../constants';

export const PerpustakaanPage: React.FC = () => (
  <AssetCategoryMapPage
    title="Perpustakaan"
    subtitle="Peta Interaktif Perpustakaan Universitas Udayana"
    icon={BookOpen}
    roomFilter={matchesPerpus}
  />
);
