import React from 'react';
import { Users } from 'lucide-react';
import { AssetCategoryMapPage } from '../components/AssetCategoryMapPage';
import { matchesMeeting } from '../constants';

export const RuangRapatPage: React.FC = () => (
  <AssetCategoryMapPage
    title="Ruang Rapat"
    subtitle="Peta Interaktif Ruang Rapat & Pertemuan Universitas Udayana"
    icon={Users}
    roomFilter={matchesMeeting}
  />
);
